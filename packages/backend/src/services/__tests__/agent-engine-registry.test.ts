import { describe, expect, it, vi } from "vitest";
import type { AgentEnginePlugin } from "@a2ui-platform/agent-engine-spi";
import { AgentEngineRegistry } from "../agent-engine-registry.js";

function plugin(id = "test-engine"): AgentEnginePlugin {
  return {
    manifest: {
      engineId: id,
      version: "1.0.0",
      profiles: ["core-v1"],
      configSchema: { type: "object" },
    },
    create: vi.fn(() => ({ run: vi.fn() })),
  };
}

describe("AgentEngineRegistry", () => {
  it("uses static plugins and passes opaque config through unchanged", async () => {
    const registry = new AgentEngineRegistry();
    const registered = plugin();
    const config = { credentialReference: "ENGINE_API_KEY", adapterOnly: { enabled: true } };
    registry.register(registered);

    await registry.create("test-engine", config);

    expect(registered.create).toHaveBeenCalledWith(config);
    expect(registry.list()).toEqual([registered.manifest]);
  });

  it("rejects unknown and duplicate engine IDs", () => {
    const registry = new AgentEngineRegistry();
    registry.register(plugin());

    expect(() => registry.get("missing")).toThrow("未安装");
    expect(() => registry.register(plugin())).toThrow("已注册");
  });
});
