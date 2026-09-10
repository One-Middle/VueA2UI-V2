import { createReactAgentEnginePlugin } from "@a2ui-platform/react-agent-engine";
import { createCodexSdkAgentEnginePlugin } from "@a2ui-platform/codex-sdk-agent-engine";
import { config } from "../config.js";
import { AgentEngineRegistry } from "./agent-engine-registry.js";

export const agentEngineRegistry = new AgentEngineRegistry();

agentEngineRegistry.register(createReactAgentEnginePlugin());
agentEngineRegistry.register(createCodexSdkAgentEnginePlugin());

/** 新 workflow 的默认引擎。Codex adapter 启用后由后台配置切换。 */
export function defaultAgentEngineId(): string {
  return config.agentEngine.defaultId;
}
