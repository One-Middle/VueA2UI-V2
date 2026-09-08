import "./styles.css";

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
export { renderDomNode } from "./render/dom-renderer";
export type { DomRenderContext } from "./render/dom-renderer";
export type {
  BuildRenderTreeResult,
  RenderEventIntent,
  RenderNode,
  RenderNodeMeta,
  RenderPanelSlot,
  RenderSlotValue,
} from "./render/render-node";
export type { RenderContext } from "./render/render-context";

// ─── DOM Basic UI 组件 ─────────────────────────────────────
export * from "./ui/dom-basic";

// ─── DOM Renderer ─────────────────────────────────────────
export { mountA2uiSurface } from "./dom/mount-surface";
export type {
  DomSurfaceHandle,
  MountA2uiSurfaceOptions,
} from "./dom/mount-surface";
export { DomSurfaceHost } from "./dom/surface-host";
export type { DomSurfaceHostOptions } from "./dom/surface-host";
export {
  registerA2uiSurfaceGroup,
  getA2uiSurfaceGroup,
  unregisterA2uiSurfaceGroup,
} from "./dom/surface-group-registry";
export {
  A2uiSurfaceElement,
  defineA2uiSurfaceElement,
} from "./dom/web-component";
