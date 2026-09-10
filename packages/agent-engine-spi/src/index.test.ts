import { describe, expect, it } from "vitest";
import { assertRunnable, type AgentEngineManifest, type AgentRunRequest } from "./index.js";

const manifest: AgentEngineManifest = { engineId: "fake", version: "1.0.0", profiles: ["core-v1"], configSchema: {} };
const request: AgentRunRequest = { runId: "r1", task: "test", input: {}, outputSchema: {}, contextCatalog: [], capabilityCatalog: [] };

describe("Agent Engine SPI", () => {
  it("拒绝跨引擎 continuation", () => {
    const result = assertRunnable({ ...request, continuation: { engineId: "other", pluginVersion: "1.0.0", state: {} } }, manifest, { signal: new AbortController().signal, deadline: new Date(Date.now() + 1000), maxEvents: 1, maxContextBytes: 1 });
    expect(result?.code).toBe("configuration_error");
  });

  it("在取消时拒绝启动", () => {
    const controller = new AbortController(); controller.abort();
    const result = assertRunnable(request, manifest, { signal: controller.signal, deadline: new Date(Date.now() + 1000), maxEvents: 1, maxContextBytes: 1 });
    expect(result?.code).toBe("cancelled");
  });
});
