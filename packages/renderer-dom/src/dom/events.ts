import type { JsonObject } from "@a2ui-platform/shared";
import { createActionMessage } from "@a2ui-platform/renderer-core";

export type RendererEventTarget = Window | EventTarget;

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

function dispatch(target: RendererEventTarget, name: string, detail: unknown): void {
  target.dispatchEvent(
    new CustomEvent(name, {
      detail,
      bubbles: true,
      composed: true,
    }),
  );
}
