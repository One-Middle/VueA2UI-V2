/**
 * Renderer action 工具：解析组件 action 声明并组装 A2UI 回传消息。
 *
 * 职责：
 * - 解析当前正式的 action.event 声明
 * - 预留 functionCall 识别接口但不执行
 * - 生成标准 A2UI client-to-server action 消息
 *
 * 不负责：调用后端 API、执行 functionCall 或决定业务处理策略。
 */

import type { A2UIClientMessage, JsonObject, JsonValue } from "@a2ui-platform/shared";

/** Renderer 当前可派发的 event action。 */
export interface RendererEventAction {
  /** action 类型。当前正式派发只支持 event。 */
  kind: "event";
  /** 事件名称。 */
  name: string;
  /** 事件上下文，派发前会解析动态绑定。 */
  context: Record<string, unknown>;
}

/** 预留的 functionCall action 声明，当前不执行。 */
export interface RendererFunctionCallAction {
  /** action 类型。 */
  kind: "functionCall";
  /** 受控函数名称。 */
  call: string;
  /** 函数参数。 */
  args: Record<string, unknown>;
}

/** Renderer 支持识别的 action 声明。 */
export type RendererComponentAction =
  | RendererEventAction
  | RendererFunctionCallAction;

/** 动态值解析函数。 */
export type ActionValueResolver = (value: unknown) => unknown;

/** 构造 action 回传消息所需的元信息。 */
export interface CreateActionMessageInput {
  /** 事件名称。 */
  name: string;
  /** Surface ID。 */
  surfaceId: string;
  /** 触发事件的组件 ID。 */
  sourceComponentId: string;
  /** 已解析上下文。 */
  context: JsonObject;
  /** 可选时间戳，默认使用当前时间。 */
  timestamp?: string;
}

/** 解析组件 action 声明。 */
export function resolveComponentAction(
  rawAction: unknown,
  resolveValue: ActionValueResolver
): RendererComponentAction | null {
  const action = resolveValue(rawAction);
  if (!isPlainObject(action)) {
    return null;
  }

  const event = isPlainObject(action.event) ? action.event : null;
  if (event) {
    const name = typeof event.name === "string" ? event.name.trim() : "";
    return name ? { kind: "event", name, context: toRecord(event.context) } : null;
  }

  const functionCall = isPlainObject(action.functionCall) ? action.functionCall : null;
  if (functionCall) {
    const call = typeof functionCall.call === "string" ? functionCall.call.trim() : "";
    return call
      ? { kind: "functionCall", call, args: toRecord(functionCall.args) }
      : null;
  }

  return null;
}

/** 解析 action context 中的动态绑定。 */
export function resolveActionContext(
  context: Record<string, unknown>,
  resolveValue: ActionValueResolver
): JsonObject {
  const resolvedContext: JsonObject = {};
  for (const [key, value] of Object.entries(context)) {
    const resolved = resolveValue(value);
    if (resolved !== undefined) {
      resolvedContext[key] = resolved as JsonValue;
    }
  }
  return resolvedContext;
}

/** 创建标准 A2UI action 回传消息。 */
export function createActionMessage(input: CreateActionMessageInput): A2UIClientMessage {
  return {
    version: "v0.9",
    action: {
      kind: "event",
      name: input.name,
      surfaceId: input.surfaceId,
      sourceComponentId: input.sourceComponentId,
      timestamp: input.timestamp ?? new Date().toISOString(),
      context: input.context,
    },
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toRecord(value: unknown): Record<string, unknown> {
  return isPlainObject(value) ? value : {};
}
