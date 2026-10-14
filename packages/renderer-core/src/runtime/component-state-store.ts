/**
 * 组件局部状态存储。
 *
 * 职责：
 * - 为渲染适配器提供按组件地址隔离的临时 UI 状态。
 * - 支持 Tabs 当前项、图片加载错误等不适合写入 DataModel 的状态。
 *
 * 引用：
 * - render-node 中的 ComponentAddress。
 * 被引用：
 * - SurfaceRuntime 与平台渲染器。
 * 注意：
 * - 状态 key 包含 surfaceId、componentId 和 basePath，同一动态列表模板的不同项互不影响。
 */
import type { ComponentAddress } from "../render/render-node";

/**
 * 单个组件地址下的状态读写接口。
 */
export interface ComponentState {
  get<T>(field: string, fallback: T): T;
  set<T>(field: string, value: T): void;
  delete(field: string): void;
}

/**
 * 按组件地址创建和复用局部状态容器。
 */
export class ComponentStateStore {
  private readonly values = new Map<string, Map<string, unknown>>();

  /**
   * 获取指定组件地址对应的状态对象。
   *
   * @param address - 组件地址，包含 surfaceId、componentId 和 basePath。
   * @returns 可读写该地址局部状态的轻量对象。
   */
  stateFor(address: ComponentAddress): ComponentState {
    const key = `${address.surfaceId}::${address.componentId}::${address.basePath}`;
    if (!this.values.has(key)) this.values.set(key, new Map());
    const values = this.values.get(key)!;
    return {
      get<T>(field: string, fallback: T): T {
        return values.has(field) ? (values.get(field) as T) : fallback;
      },
      set<T>(field: string, value: T): void {
        values.set(field, value);
      },
      delete(field: string): void {
        values.delete(field);
      },
    };
  }

  /**
   * 清空所有局部状态。
   */
  clear(): void {
    this.values.clear();
  }
}
