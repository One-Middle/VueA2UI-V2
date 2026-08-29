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
export { ComponentContextImpl } from "./core/component-context";
export type {
  ComponentContext,
  ComponentRenderInfo,
  ActionCallback,
  ErrorCallback,
} from "./core/component-context";
export {
  getCatalogComponent,
  getLoadedCatalogComponent,
  isCatalogComponent,
  catalogRegistry,
} from "./core/catalog";
export { registerBasicCatalog } from "./components/index";

// ─── 新 Renderer 中间层 ─────────────────────────────────────
export { buildRenderNode, buildRenderTree } from "./render/build-render-node";
export { RenderDependencyCollector } from "./render/dependency-collector";
export { renderVueNode } from "./render/vue-renderer";
export type {
  BuildRenderTreeResult,
  RenderEventIntent,
  RenderNode,
  RenderNodeMeta,
  RenderPanelSlot,
  RenderSlotValue,
} from "./render/render-node";
export type { RenderContext } from "./render/render-context";

// ─── 普通 Basic UI 组件 ─────────────────────────────────────
export * from "./ui/basic";

// ─── Vue 组件 ───────────────────────────────────────────────
export { default as A2uiSurface } from "./vue/A2uiSurface.vue";
