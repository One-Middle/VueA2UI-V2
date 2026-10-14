/**
 * DOM 渲染器对外派发事件的桥接模块。
 *
 * 职责：
 * - 将 renderer-core 的动作消息包装成浏览器 CustomEvent。
 * - 统一 a2ui:action 与 a2ui:error 的 detail 结构。
 * - 支持把容器级事件镜像到 window，方便宿主应用全局监听。
 *
 * 引用：
 * - renderer-core 的 createActionMessage。
 * 被引用：
 * - surface-host。
 * 注意：
 * - 本模块只负责事件派发，不处理动作执行或错误恢复。
 */
import type { JsonObject } from "@a2ui-platform/shared";
import { createActionMessage } from "@a2ui-platform/renderer-core";

export type RendererEventTarget = Window | EventTarget;

/**
 * 派发 A2UI 动作事件。
 *
 * @param input - 事件目标、Surface 信息和动作上下文。
 */
export function dispatchRendererAction(input: {
  target: RendererEventTarget;
  mirrorToWindow: boolean;
  surfaceId: string;
  sourceComponentId: string;
  name: string;
  context: JsonObject;
}): void {
  const detail = createActionMessage({
    name: input.name,
    surfaceId: input.surfaceId,
    sourceComponentId: input.sourceComponentId,
    context: input.context,
  });
  dispatch(input.target, "a2ui:action", detail);
  if (input.mirrorToWindow && input.target !== window) {
    dispatch(window, "a2ui:action", detail);
  }
}

/**
 * 派发 A2UI 渲染错误事件。
 *
 * @param input - 事件目标、Surface 信息和错误详情。
 */
export function dispatchRendererError(input: {
  target: RendererEventTarget;
  mirrorToWindow: boolean;
  surfaceId: string;
  code: string;
  message: string;
  path?: string;
  sourceComponentId?: string;
}): void {
  const detail = {
    version: "v0.9",
    error: {
      code: input.code,
      surfaceId: input.surfaceId,
      path: input.path,
      message: input.message,
      sourceComponentId: input.sourceComponentId,
    },
  };
  dispatch(input.target, "a2ui:error", detail);
  if (input.mirrorToWindow && input.target !== window) {
    dispatch(window, "a2ui:error", detail);
  }
}

function dispatch(
  target: RendererEventTarget,
  name: string,
  detail: unknown,
): void {
  target.dispatchEvent(
    new CustomEvent(name, {
      detail,
      bubbles: true,
      composed: true,
    }),
  );
}
