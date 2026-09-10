import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentEngineEvent, AgentEngineHost, AgentRunRequest } from "@a2ui-platform/agent-engine-spi";
import { CodexSdkAgentEngine, type CodexSdkBridge } from "./index.js";

const request: AgentRunRequest = {
  runId: "run-a",
  task: "plan",
  input: { userMessage: "create a dashboard" },
  outputSchema: { type: "object" },
  contextCatalog: [],
  capabilityCatalog: [],
};

function hostFixture(): AgentEngineHost & { events: AgentEngineEvent[] } {
  const events: AgentEngineEvent[] = [];
  return {
    events,
    listContext: vi.fn().mockResolvedValue([]),
    readContext: vi.fn(),
    invokeCapability: vi.fn(),
    emit: vi.fn(async (event: AgentEngineEvent) => { events.push(event); }),
    isCancelled: vi.fn().mockReturnValue(false),
  };
}

function bridge(events: Array<Record<string, unknown>>): CodexSdkBridge {
  return { async *run() { for (const event of events) yield event; } };
}

describe("CodexSdkAgentEngine workflow-v1 contract", () => {
  afterEach(() => { delete process.env.TEST_CODEX_KEY; });

  it("maps streamed structured output and preserves same-engine continuation", async () => {
    process.env.TEST_CODEX_KEY = "test-key";
    const host = hostFixture();
    const engine = new CodexSdkAgentEngine(
      { apiKeyEnv: "TEST_CODEX_KEY", workingDirectory: process.cwd() },
      bridge([
        { type: "agent_message", text: JSON.stringify({ kind: "plan_markdown", markdown: "# Plan", decisionForm: {} }) },
        { type: "thread_state", threadId: "thread-a" },
      ]),
    );
    const outcome = await engine.run(request, host, { signal: new AbortController().signal, deadline: new Date(Date.now() + 10_000), maxEvents: 10, maxContextBytes: 1024 });

    expect(outcome).toMatchObject({ status: "completed", output: { kind: "plan_markdown" }, continuation: { engineId: "codex-sdk", state: { threadId: "thread-a" } } });
    expect(host.events.map((event) => event.type)).toEqual(["run_started", "text_delta", "run_finished"]);
  });

  it("rejects a continuation from another engine before calling the bridge", async () => {
    process.env.TEST_CODEX_KEY = "test-key";
    const host = hostFixture();
    const run = vi.fn();
    const engine = new CodexSdkAgentEngine(
      { apiKeyEnv: "TEST_CODEX_KEY", workingDirectory: process.cwd() },
      { run },
    );
    const outcome = await engine.run({ ...request, continuation: { engineId: "react", pluginVersion: "1.0.0", state: {} } }, host, { signal: new AbortController().signal, deadline: new Date(Date.now() + 10_000), maxEvents: 10, maxContextBytes: 1024 });

    expect(outcome).toMatchObject({ status: "failed", failure: { code: "configuration_error" } });
    expect(run).not.toHaveBeenCalled();
  });

  it("returns invalid_output when the stream has no structured final message", async () => {
    process.env.TEST_CODEX_KEY = "test-key";
    const host = hostFixture();
    const engine = new CodexSdkAgentEngine(
      { apiKeyEnv: "TEST_CODEX_KEY", workingDirectory: process.cwd() },
      bridge([{ type: "agent_message", text: "not json" }]),
    );
    const outcome = await engine.run(request, host, { signal: new AbortController().signal, deadline: new Date(Date.now() + 10_000), maxEvents: 10, maxContextBytes: 1024 });

    expect(outcome).toMatchObject({
      status: "failed",
      failure: {
        code: "invalid_output",
        // 完整原生 item 仅作为受限 failure payload 返回给 Host，不能混入正常 diagnostics。
        nativePayload: [{ type: "agent_message", text: "not json" }],
      },
    });
    expect(host.events.map((event) => event.type)).toEqual(["run_started", "text_delta", "error", "run_finished"]);
  });

  it("maps Codex command item lifecycle to native tool semantic events", async () => {
    process.env.TEST_CODEX_KEY = "test-key";
    const host = hostFixture();
    const engine = new CodexSdkAgentEngine(
      { apiKeyEnv: "TEST_CODEX_KEY", workingDirectory: process.cwd() },
      bridge([
        { type: "native_tool", nativeType: "item.started" },
        { type: "native_tool", nativeType: "item.completed" },
        { type: "agent_message", text: JSON.stringify({ kind: "clarification_request", form: { fields: [] } }) },
      ]),
    );
    await engine.run(request, host, { signal: new AbortController().signal, deadline: new Date(Date.now() + 10_000), maxEvents: 10, maxContextBytes: 1024 });
    expect(host.events.map((event) => event.type)).toEqual(["run_started", "native_tool_started", "native_tool_completed", "text_delta", "run_finished"]);
  });
});
