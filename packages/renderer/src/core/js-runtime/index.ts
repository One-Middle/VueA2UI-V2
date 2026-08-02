/**
 * Renderer JSRuntime 门面。
 *
 * 职责：
 * - 对外保持 initializeJsRuntime、runPropertyScript、runActionScript 等稳定 API
 * - 通过 JsRuntimeFactory 根据配置选择具体执行路径
 *
 * 不负责：
 * - 直接实现 SES 或 new Function 执行细节
 *
 * 引用：
 * - JSRuntime 工厂、配置、类型、校验和错误定义
 * 被引用：
 * - Renderer 组件、动态值解析和包入口
 * 注意：
 * - 调用方不应感知当前使用 SES 还是 new Function，切换只发生在配置和工厂层。
 */

import { JsRuntimeFactory } from "./create-js-runtime";
import { JS_RUNTIME_KIND } from "./js-runtime.config";
import type { RunActionScriptInput, RunPropertyScriptInput } from "./types";

const runtime = new JsRuntimeFactory().create(JS_RUNTIME_KIND);

/** 确保 JSRuntime 已初始化。 */
export function initializeJsRuntime(): void {
  runtime.initialize();
}

/** 执行只读属性脚本，失败时抛出 JsRuntimeError。 */
export function runPropertyScript(input: RunPropertyScriptInput) {
  return runtime.runPropertyScript(input);
}

/** 执行动作脚本，失败时抛出 JsRuntimeError。 */
export function runActionScript(input: RunActionScriptInput): void {
  runtime.runActionScript(input);
}

export { JsRuntimeError } from "./errors";
export { JsRuntimeFactory } from "./create-js-runtime";
export {
  getPropertyScriptFallback,
  isActionScriptDeclaration,
  isPropertyScriptValue,
  validateJsonPointer,
} from "./validation";
export type {
  ActionScriptActions,
  ActionScriptDeclaration,
  JSRuntime,
  JsRuntimeKind,
  PropertyScriptDeclaration,
  RunActionScriptInput,
  RunPropertyScriptInput,
} from "./types";
