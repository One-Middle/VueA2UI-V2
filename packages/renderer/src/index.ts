import "./styles.css";

// ─── 核心数据模型 ───────────────────────────────────────────
export { DataModel } from "./core/data-model";
export { ComponentModel } from "./core/component-model";
export { SurfaceModel, SurfaceGroupModel } from "./core/surface-model";
export { MessageProcessor } from "./core/message-processor";
export type { ProcessMessagesResult } from "./core/message-processor";
export { DataContext } from "./core/data-context";
export {
  ComponentContextImpl,
} from "./core/component-context";
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

// ─── Vue 组件 ───────────────────────────────────────────────
export { default as A2uiSurface } from "./vue/A2uiSurface.vue";
