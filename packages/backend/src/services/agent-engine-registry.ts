import type { AgentEngine, AgentEnginePlugin, JsonObject } from "@a2ui-platform/agent-engine-spi";

/** 已安装 adapter 的静态注册表；不从数据库或网络加载代码。 */
export class AgentEngineRegistry {
  private readonly plugins = new Map<string, AgentEnginePlugin>();

  register(plugin: AgentEnginePlugin): void {
    const id = plugin.manifest.engineId;
    if (this.plugins.has(id)) throw new Error(`Agent engine 已注册：${id}`);
    this.plugins.set(id, plugin);
  }

  get(engineId: string): AgentEnginePlugin {
    const plugin = this.plugins.get(engineId);
    if (!plugin) throw new Error(`未安装 Agent engine：${engineId}`);
    return plugin;
  }

  create(engineId: string, config: JsonObject): Promise<AgentEngine> | AgentEngine {
    return this.get(engineId).create(config);
  }

  list(): AgentEnginePlugin["manifest"][] {
    return [...this.plugins.values()].map((plugin) => plugin.manifest);
  }
}
