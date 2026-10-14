/**
 * SurfaceGroup 的进程内注册表。
 *
 * 职责：
 * - 允许 Web Component 通过 group 字符串属性找到对应 SurfaceGroup。
 * - 为非框架集成提供轻量的全局绑定点。
 *
 * 引用：
 * - renderer-core 的 SurfaceGroupModel。
 * 被引用：
 * - web-component。
 * 注意：
 * - 注册表只存在于当前 JavaScript 上下文，不跨窗口、iframe 或服务端进程共享。
 */
import type { SurfaceGroupModel } from "@a2ui-platform/renderer-core";

const registry = new Map<string, SurfaceGroupModel>();

/**
 * 注册一个可通过名称查找的 SurfaceGroup。
 *
 * @param name - 注册名称，通常对应 <a2ui-surface group="...">。
 * @param surfaceGroup - 要暴露给 DOM 自定义元素的 SurfaceGroup 实例。
 */
export function registerA2uiSurfaceGroup(
  name: string,
  surfaceGroup: SurfaceGroupModel,
): void {
  registry.set(name, surfaceGroup);
}

/**
 * 按名称读取已注册的 SurfaceGroup。
 *
 * @param name - 注册名称。
 * @returns 匹配的 SurfaceGroup；不存在时返回 undefined。
 */
export function getA2uiSurfaceGroup(
  name: string,
): SurfaceGroupModel | undefined {
  return registry.get(name);
}

/**
 * 移除指定名称下的 SurfaceGroup。
 *
 * @param name - 要移除的注册名称。
 */
export function unregisterA2uiSurfaceGroup(name: string): void {
  registry.delete(name);
}
