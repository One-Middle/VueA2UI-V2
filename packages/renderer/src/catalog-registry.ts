/**
 * A2UI Catalog 组件注册表：组件类型名 → Vue 组件定义的映射。
 *
 * 当 A2uiComponent 需要按 componentType 查找对应的 Vue 渲染组件时，
 * 从该注册表中获取。扩展自定义 Catalog 时可向此 Map 注册新组件。
 */

import type { Component } from "vue";

/** 全局 Catalog 组件注册表 */
export const catalogRegistry = new Map<string, Component>();
