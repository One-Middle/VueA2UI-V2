import { describe, expect, it, vi } from "vitest";
import type { AgentEngineEvent, AgentEngineHost, AgentRunRequest } from "@a2ui-platform/agent-engine-spi";
import type { IAgentRuntime } from "@a2ui-platform/shared";
import { ReactAgentEngine } from "./index.js";

const request: AgentRunRequest = {
  runId: "run-a", task: "plan", input: { task: "plan" }, outputSchema: { type: "object" }, contextCatalog: [], capabilityCatalog: [],
};

function hostFixture(): AgentEngineHost & { events: AgentEngineEvent[] } {
  const events: AgentEngineEvent[] = [];
  return {
    events,
    listContext: vi.fn().mockResolvedValue([]), readContext: vi.fn(), invokeCapability: vi.fn(),
    emit: vi.fn(async (event: AgentEngineEvent) => { events.push(event); }),
    isCancelled: vi.fn().mockReturnValue(false),
  };
}

describe("ReactAgentEngine compatibility bridge", () => {
  it("wraps the legacy task result in the workflow-v1 output envelope and emits semantic events", async () => {
    const runtime: Pick<IAgentRuntime, "runWorkflowTask"> = {
      runWorkflowTask: vi.fn(async (_input, onToolCall, onTrace) => {
        onToolCall?.({ toolName: "getSkillContent", status: "succeeded", attemptIndex: 1, inputSummary: {} });
        onTrace?.({ sessionId: "session-a", agentRunId: "run-a", workflowId: "workflow-a", workflowStepId: "step-a", iterationIndex: 1, type: "tool_call", toolName: "getSkillContent", createdAt: new Date().toISOString() });
        return { parsedResult: { kind: "clarification_request" as const, form: { fields: [] } }, debugMetadata: {}, toolCalls: [], rawOutputPreview: "", attemptCount: 1, tokenUsage: {} };
      }),
    };
    const host = hostFixture();
    const engine = new ReactAgentEngine(runtime as IAgentRuntime);
    const outcome = await engine.run(request, host, { signal: new AbortController().signal, deadline: new Date(Date.now() + 10_000), maxEvents: 10, maxContextBytes: 1024 });

    expect(outcome).toMatchObject({ status: "completed", output: { kind: "clarification_request" }, diagnostics: { legacyToolCalls: [] } });
    expect(host.events.map((event) => event.type)).toEqual(["run_started", "native_tool_completed", "text_delta", "run_finished"]);
  });

  it("hydrates the legacy runtime input from Host context and reports every material it used", async () => {
    const materials = [
      { materialId: "workflow.task", version: "1", content: { sessionId: "session-a", workflowId: "workflow-a", workflowStepId: "step-a", agentRunId: "run-a", task: "plan", gate: "plan", userMessage: "create dashboard", model: { provider: "test", name: "test", config: {} } } },
      { materialId: "conversation.recent", version: "1", content: [] },
      { materialId: "documents.uploaded", version: "1", content: [] },
      { materialId: "skills.enabled", version: "1", content: [] },
      { materialId: "ui.snapshot.current", version: "1", content: null },
      { materialId: "catalog.descriptor", version: "1", content: { catalogId: "catalog", catalogVersion: "1", rendererVersion: "1" } },
      { materialId: "workflow.available_tools", version: "1", content: [] },
    ];
    const host = hostFixture();
    host.readContext = vi.fn(async ({ materialId }) => {
      const material = materials.find((item) => item.materialId === materialId)!;
      return { ...material, byteLength: 1 } as never;
    });
    const runtime: Pick<IAgentRuntime, "runWorkflowTask"> = {
      runWorkflowTask: vi.fn(async (input) => {
        expect(input).toMatchObject({ sessionId: "session-a", userMessage: "create dashboard", workflowId: "workflow-a" });
        return { parsedResult: { kind: "failure" as const, reason: "stop", recoverable: true }, debugMetadata: {}, toolCalls: [], rawOutputPreview: "", attemptCount: 1, tokenUsage: {} };
      }),
    };
    const outcome = await new ReactAgentEngine(runtime as IAgentRuntime).run(
      { ...request, input: { task: "plan" }, contextCatalog: materials.map(({ materialId, version }) => ({ materialId, version, kind: "test", title: materialId, summary: "", byteLength: 1, readable: true })) },
      host,
      { signal: new AbortController().signal, deadline: new Date(Date.now() + 10_000), maxEvents: 20, maxContextBytes: 1024 },
    );

    expect(host.readContext).toHaveBeenCalledTimes(materials.length);
    expect(outcome.contextUsed).toEqual(materials.map(({ materialId, version }) => ({ materialId, version })));
  });
});
