/**
 * Vue 渲染适配器入口。
 *
 * 职责：
 * - 导出不感知 A2UI 协议的 Vue Basic 组件。
 * - 导出 RenderNode 到 Vue VNode 的递归渲染函数。
 * - 导出基于 SurfaceRuntime 的 Vue Surface 容器组件。
 *
 * 引用：
 * - basic 组件集合、render-vue、A2uiRuntimeSurface。
 * 被引用：
 * - Vue 宿主应用和 renderer-vue 测试。
 * 注意：
 * - 协议解析发生在 renderer-core；本包只消费 RenderNode 和 SurfaceRuntime。
 */
import "./styles.css";

export * from "./basic";
export { renderVueNode } from "./render-vue";
export { A2uiRuntimeSurface } from "./A2uiRuntimeSurface";
