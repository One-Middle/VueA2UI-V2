// ─── 核心数据模型 ───────────────────────────────────────────
export { DataModel } from "./core/data-model";
export { ComponentModel } from "./core/component-model";
export { SurfaceModel, SurfaceGroupModel } from "./core/surface-model";
export { MessageProcessor } from "./core/message-processor";
export type { ProcessMessagesResult } from "./core/message-processor";
export { DataContext } from "./core/data-context";
export {
  createActionMessage,
  resolveActionContext,
  resolveComponentAction,
} from "./core/action";
export type {
  ActionValueResolver,
  CreateActionMessageInput,
  RendererComponentAction,
  RendererEventAction,
  RendererFunctionCallAction,
  RendererScriptAction,
} from "./core/action";
export {
  initializeJsRuntime,
  isActionScriptDeclaration,
  isPropertyScriptValue,
  runActionScript,
  runPropertyScript,
} from "./core/js-runtime";
export type {
  ActionScriptActions,
  ActionScriptDeclaration,
  PropertyScriptDeclaration,
  RunActionScriptInput,
  RunPropertyScriptInput,
} from "./core/js-runtime";
// ─── Renderer 中间层 ───────────────────────────────────────
export { buildRenderNode, buildRenderTree } from "./render/build-render-node";
export { RenderDependencyCollector } from "./render/dependency-collector";
export type {
  BuildRenderTreeResult,
  RenderEventIntent,
  RenderNode,
  RenderNodeMeta,
  RenderPanelSlot,
  RenderSlotValue,
} from "./render/render-node";
export type { RenderContext } from "./render/render-context";
export type { DomStyleProperties } from "./render/resolve-style";
export type { ComponentAddress, RenderPlan } from "./render/render-node";
export { ComponentStateStore } from "./runtime/component-state-store";
export type { ComponentState } from "./runtime/component-state-store";
export { SurfaceRuntime } from "./runtime/surface-runtime";
export type { AdapterEvent, RenderPlanSnapshot, SurfaceRuntimeOptions } from "./runtime/surface-runtime";
