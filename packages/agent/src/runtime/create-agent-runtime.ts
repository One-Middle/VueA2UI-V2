/**
 * Agent Runtime 工厂函数。
 *
 * 职责：
 * - 封装 ModelClient、PromptComposer、AgentContextBuilder 的创建和组装
 * - 对外只暴露 IAgentRuntime 接口，隐藏内部实现细节
 *
 * 不负责：模型配置校验、Agent 运行调度
 */

import type { IAgentRuntime, AgentRuntimeFactoryConfig } from "@a2ui-platform/shared";
import { AgentRuntime } from "./agent-runtime.js";
import { ModelClient } from "../model/model-client.js";
import { PromptComposer } from "../prompts/prompt-composer.js";
import { AgentContextBuilder } from "../context/context-builder.js";

/**
 * 创建 AgentRuntime 实例。
 *
 * @param config - 模型 API 连接配置
 * @returns 符合 IAgentRuntime 接口的运行时实例
 */
export function createAgentRuntime(config: AgentRuntimeFactoryConfig): IAgentRuntime {
  return new AgentRuntime(
    new ModelClient(config),
    new PromptComposer(),
    new AgentContextBuilder(),
  );
}
