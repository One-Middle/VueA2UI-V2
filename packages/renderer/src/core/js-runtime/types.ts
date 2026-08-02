/**
 * JSRuntime 公共契约。
 *
 * 职责：
 * - 定义属性脚本、动作脚本和 JSRuntime 实现接口
 * - 约束不同执行路径必须提供一致的能力边界
 *
 * 不负责：
 * - 执行脚本或选择具体执行路径
 *
 * 引用：
 * - @a2ui-platform/shared
 * - renderer DataModel
 * 被引用：
 * - JSRuntime 工厂、实现、Renderer 对外出口
 * 注意：
 * - 调用方应依赖本文件中的接口，而不是依赖 SES 或 new Function 的实现细节。
 */

import type { JsonObject, JsonValue } from "@a2ui-platform/shared";
import type { DataModel } from "../data-model";

/** 属性脚本声明。 */
export interface PropertyScriptDeclaration {
  /** 同步 JS 函数体，必须显式 return。 */
  code: string;
  /** dataModel 依赖路径，用于订阅刷新。 */
  deps: string[];
  /** 执行失败或返回值非法时的兜底值。 */
  fallback?: JsonValue;
}

/** 动作脚本声明。 */
export interface ActionScriptDeclaration {
  /** 同步 JS 函数体。 */
  code: string;
  /** 可选 dataModel 依赖声明；动作脚本不使用该字段做响应式订阅。 */
  deps?: string[];
  /** 脚本上下文。 */
  context?: Record<string, unknown>;
}

/** Renderer 可注入给动作脚本的动作能力分组。 */
export interface ActionScriptActions {
  /** 派发一个受控业务事件。 */
  emit(name: string, context?: JsonObject): void;
}

/** 属性脚本执行输入。 */
export interface RunPropertyScriptInput {
  script: PropertyScriptDeclaration;
  dataModel: DataModel;
}

/** 动作脚本执行输入。 */
export interface RunActionScriptInput {
  script: ActionScriptDeclaration;
  dataModel: DataModel;
  actions: ActionScriptActions;
  context: JsonObject;
}

/** JSRuntime 可选执行路径。 */
export type JsRuntimeKind = "ses" | "function";

/** JSRuntime 实现必须满足的统一接口。 */
export interface JSRuntime {
  /** 初始化底层执行环境。 */
  initialize(): void;
  /** 执行只读属性脚本。 */
  runPropertyScript(input: RunPropertyScriptInput): JsonValue | undefined;
  /** 执行动作脚本。 */
  runActionScript(input: RunActionScriptInput): void;
}
