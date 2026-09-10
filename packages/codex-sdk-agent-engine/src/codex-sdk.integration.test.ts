import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentEngineEvent, AgentEngineHost } from "@a2ui-platform/agent-engine-spi";
import { CodexSdkAgentEngine, NativeCodexSdkBridge } from "./index.js";

const runIfConfigured = process.env.CODEX_API_KEY ? it : it.skip;

describe("Codex SDK real integration (opt-in)", () => {
  let workDirectory: string | undefined;

  afterEach(async () => {
    if (workDirectory) await rm(workDirectory, { recursive: true, force: true });
    workDirectory = undefined;
  });

  runIfConfigured("uses outputSchema and streams a resumable Codex turn", async () => {
    workDirectory = await mkdtemp(join(tmpdir(), "a2ui-codex-sdk-"));
    const events: AgentEngineEvent[] = [];
    const host: AgentEngineHost = {
      listContext: async () => [],
      readContext: vi.fn(),
      invokeCapability: vi.fn(),
      emit: async (event) => { events.push(event); },
      isCancelled: () => false,
    };
    const engine = new CodexSdkAgentEngine(
      { apiKeyEnv: "CODEX_API_KEY", workingDirectory: workDirectory },
      new NativeCodexSdkBridge(),
    );
    const outcome = await engine.run({
      runId: "real-sdk-smoke",
      task: "sdk_smoke",
      input: { instruction: "Return the requested schema." },
      outputSchema: {
        type: "object",
        required: ["kind"],
        properties: { kind: { type: "string" } },
      },
      contextCatalog: [],
      capabilityCatalog: [],
    }, host, {
      signal: new AbortController().signal,
      deadline: new Date(Date.now() + 120_000),
      maxEvents: 1_000,
      maxContextBytes: 1_024 * 1_024,
    });

    expect(outcome.status).toBe("completed");
    expect(outcome.status === "completed" && outcome.continuation?.state).toHaveProperty("threadId");
    expect(events.at(0)?.type).toBe("run_started");
    expect(events.at(-1)?.type).toBe("run_finished");
  }, 130_000);
});
