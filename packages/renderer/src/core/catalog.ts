/**
 * Catalog 组件映射：组件名到 Vue 组件的懒加载映射。
 *
 * 这是一个薄封装，实际注册通过 `registerBasicCatalog()` 完成。
 * 如需扩展自定义组件，调用 catalogRegistry.set(...) 即可。
 */
import type { Component } from "vue";
import { catalogRegistry } from "../catalog-registry";
import { registerBasicCatalog } from "../components/index";

/** 确保 Basic Catalog 组件已注册 */
let _initialized = false;
function ensureInitialized() {
  if (!_initialized) {
    registerBasicCatalog();
    _initialized = true;
  }
}

/** 同步获取组件（确保已初始化） */
export function getCatalogComponent(name: string): Component | undefined {
  ensureInitialized();
  return catalogRegistry.get(name);
}

/** 同步获取已加载组件（不触发初始化） */
export function getLoadedCatalogComponent(name: string): Component | undefined {
  return catalogRegistry.get(name);
}

/** 判断组件名是否有效 */
export function isCatalogComponent(name: string): boolean {
  ensureInitialized();
  return catalogRegistry.has(name);
}

export { catalogRegistry };
