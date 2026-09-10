/**
 * SurfaceModel 类：单个 surface 的状态模型。
 *
 * 管理 surface 上的所有组件（ComponentModel）和数据模型（DataModel）。
 * SurfaceGroupModel 管理所有 surface 实例。
 */

import type {
  A2UIComponent,
  JsonValue,
} from "@a2ui-platform/shared";
import { ComponentModel } from "./component-model";
import { DataModel } from "./data-model";

type SubscriberCallback = () => void;

/** SurfaceModel：单个 surface 的完整状态 */
export class SurfaceModel {
  /** Surface 唯一标识 */
  readonly surfaceId: string;
  /** 使用的 Catalog ID */
  readonly catalogId: string;
  /** 组件映射（componentId → ComponentModel） */
  components: Map<string, ComponentModel>;
  /** 数据模型 */
  dataModel: DataModel;

  /** 组件订阅取消函数集合（用于 destroy 时批量清理） */
  private _componentSubscriptions = new Map<string, () => void>();
  /** 组件集合变更订阅者 */
  private _subscribers = new Set<SubscriberCallback>();
  /** 是否已销毁 */
  private _destroyed = false;

  constructor(surfaceId: string, catalogId: string) {
    this.surfaceId = surfaceId;
    this.catalogId = catalogId;
    this.components = new Map<string, ComponentModel>();
    this.dataModel = new DataModel({});
  }

  // ─── 创建 Surface ─────────────────────────────────────────

  /**
   * 初始化或更新 surface。
   * 注意：createSurface 当前只声明 surface 与 Catalog 的绑定关系。
   */
  createSurface(): void {
    // 当前 createSurface 无额外可变字段，保留方法用于消息处理链路稳定。
  }

  // ─── 组件管理 ─────────────────────────────────────────────

  /**
   * 增量更新组件列表：
   *   - 列表中存在的组件：新增或更新
   *   - 类型变化时重建 ComponentModel
   *   - 不在列表中的现有组件：删除
   */
  updateComponents(components: A2UIComponent[]): void {
    this._ensureNotDestroyed();
    const incomingIds = new Set(components.map((c) => c.id));
    let changed = false;

    // 1. 删除不在新列表中的组件
    for (const [id] of this.components) {
      if (!incomingIds.has(id)) {
        this._removeComponent(id);
        changed = true;
      }
    }

    // 2. 新增或更新组件
    for (const raw of components) {
      const existing = this.components.get(raw.id);
      if (existing) {
        // 已存在，尝试更新；类型变化则重建
        if (!existing.update(raw)) {
          // 类型变化，重建
          this._removeComponent(raw.id);
          this._addComponent(raw);
          changed = true;
        } else {
          changed = true;
        }
      } else {
        this._addComponent(raw);
        changed = true;
      }
    }

    if (changed) {
      this._notify();
    }
  }

  // ─── 数据模型 ─────────────────────────────────────────────

  /** 更新 dataModel 中指定路径的值。 path 为 undefined 时用 value 替换整个 model。 */
  updateDataModel(path: string | undefined, value: JsonValue): void {
    this._ensureNotDestroyed();
    if (path === undefined || path === "/") {
      this.dataModel.set("/", value);
    } else {
      this.dataModel.set(path, value);
    }
  }

  /** 订阅组件集合变更。 */
  subscribe(callback: SubscriberCallback): () => void {
    this._ensureNotDestroyed();
    this._subscribers.add(callback);
    return () => {
      this._subscribers.delete(callback);
    };
  }

  // ─── 清理 ─────────────────────────────────────────────────

  /** 清理所有组件订阅和 dataModel */
  destroy(): void {
    if (this._destroyed) return;
    for (const [id, unsubscribe] of this._componentSubscriptions) {
      unsubscribe();
    }
    this._componentSubscriptions.clear();
    this._subscribers.clear();
    this.components.clear();
    this.dataModel.destroy();
    this._destroyed = true;
  }

  // ─── 内部方法 ─────────────────────────────────────────────

  private _addComponent(raw: A2UIComponent): void {
    const model = new ComponentModel(raw);
    this.components.set(raw.id, model);
  }

  private _removeComponent(componentId: string): void {
    const unsubscribe = this._componentSubscriptions.get(componentId);
    if (unsubscribe) {
      unsubscribe();
      this._componentSubscriptions.delete(componentId);
    }
    this.components.delete(componentId);
  }

  private _notify(): void {
    for (const callback of this._subscribers) {
      callback();
    }
  }

  private _ensureNotDestroyed(): void {
    if (this._destroyed) {
      throw new Error("[SurfaceModel] 实例已销毁，不能再执行写操作");
    }
  }
}

// ─────────────────────────────────────────────────────────────

/** SurfaceGroupModel：管理所有 surface 的集合 */
export class SurfaceGroupModel {
  /** surfaceId → SurfaceModel 映射 */
  private _surfaces = new Map<string, SurfaceModel>();
  /** surface 集合变更订阅者 */
  private _subscribers = new Set<SubscriberCallback>();

  // ─── 公开 API ─────────────────────────────────────────────

  /**
   * 获取或创建指定 surfaceId 的 SurfaceModel。
   * 已存在时直接返回；不存在时新建。
   */
  getOrCreate(surfaceId: string, catalogId: string): SurfaceModel {
    const existing = this._surfaces.get(surfaceId);
    if (existing) {
      return existing;
    }
    const surface = new SurfaceModel(surfaceId, catalogId);
    this._surfaces.set(surfaceId, surface);
    this._notify();
    return surface;
  }

  /** 获取指定 surface，不存在返回 undefined。 */
  get(surfaceId: string): SurfaceModel | undefined {
    return this._surfaces.get(surfaceId);
  }

  /** 获取所有 surface 的 surfaceId 列表。 */
  getSurfaceIds(): string[] {
    return Array.from(this._surfaces.keys());
  }

  /** 删除指定 surface，调用其 destroy()。 */
  delete(surfaceId: string): void {
    const surface = this._surfaces.get(surfaceId);
    if (surface) {
      surface.destroy();
      this._surfaces.delete(surfaceId);
      this._notify();
    }
  }

  /** 订阅 surface 集合变更。 */
  subscribe(callback: SubscriberCallback): () => void {
    this._subscribers.add(callback);
    return () => {
      this._subscribers.delete(callback);
    };
  }

  /** 清理所有 surface。 */
  destroy(): void {
    for (const surface of this._surfaces.values()) {
      surface.destroy();
    }
    this._surfaces.clear();
    this._notify();
  }

  private _notify(): void {
    for (const callback of this._subscribers) {
      callback();
    }
  }
}
