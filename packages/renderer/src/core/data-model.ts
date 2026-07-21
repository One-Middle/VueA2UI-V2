/**
 * DataModel 类：基于 JSON Pointer (RFC 6901) 的数据模型。
 *
 * 内部使用 Vue3 `reactive` 包裹数据，路径变更时通知所有祖先路径和
 * 已注册的路径订阅者。
 *
 * RFC 6901 编码规则：
 *   - "~0" 表示 "~"
 *   - "~1" 表示 "/"
 */

import { reactive } from "vue";
import { logger } from "../logger.js";
import type { JsonValue } from "@a2ui-platform/shared";

/** 将 JSON Pointer 路径解析为路径片段数组（已解码）。 */
function parsePath(path: string): string[] {
  if (path === "" || path === "/") return [];
  // 确保以 "/" 开头
  if (!path.startsWith("/")) {
    throw new Error(`[DataModel] 路径必须以 "/" 开头: ${path}`);
  }
  return path
    .slice(1)
    .split("/")
    .map((seg) => seg.replace(/~1/g, "/").replace(/~0/g, "~"));
}

/** 将路径片段数组编码为 JSON Pointer 字符串。 */
function encodePath(segments: string[]): string {
  if (segments.length === 0) return "/";
  return (
    "/" +
    segments
      .map((seg) => seg.replace(/~/g, "~0").replace(/\//g, "~1"))
      .join("/")
  );
}

type SubscriberCallback = () => void;

export class DataModel {
  /** 根数据，使用 Vue3 reactive 保持响应式；存储类型为 unknown 避免递归类型展开 */
  private _data: { root: unknown };
  /** 路径 → 订阅者映射 */
  private _subscribers = new Map<string, Set<SubscriberCallback>>();
  /** 是否已销毁 */
  private _destroyed = false;

  constructor(initialData?: JsonValue) {
    const state: { root: unknown } = { root: initialData ?? null };
    this._data = reactive(state) as { root: unknown };
  }

  // ─── 公开 API ─────────────────────────────────────────────

  /** 获取指定路径的值。路径 "/" 返回整个 model。 */
  get(path: string): JsonValue | undefined {
    const segments = parsePath(path);
    if (segments.length === 0) {
      return this._data.root as JsonValue;
    }
    return this._getBySegments(segments);
  }

  /** 设置指定路径的值。深层路径自动创建中间对象/数组。 */
  set(path: string, value: JsonValue): void {
    this._ensureNotDestroyed();
    const segments = parsePath(path);
    if (segments.length === 0) {
      this._data.root = value;
      this._notifyAffected([]);
      return;
    }
    this._setBySegments(segments, value);
    this._notifyAffected(segments);
  }

  /** 删除指定路径的值。 */
  delete(path: string): void {
    this._ensureNotDestroyed();
    const segments = parsePath(path);
    if (segments.length === 0) {
      this._data.root = null;
      this._notifyAffected([]);
      return;
    }
    this._deleteBySegments(segments);
    this._notifyAffected(segments);
  }

  /**
   * 订阅指定路径的变更。当路径或其祖先被修改时触发回调。
   * 返回取消订阅函数。
   */
  subscribe(path: string, callback: SubscriberCallback): () => void {
    const key = path;
    if (!this._subscribers.has(key)) {
      this._subscribers.set(key, new Set());
    }
    this._subscribers.get(key)!.add(callback);
    return () => {
      const set = this._subscribers.get(key);
      if (set) {
        set.delete(callback);
        if (set.size === 0) this._subscribers.delete(key);
      }
    };
  }

  /** 清理所有订阅。销毁后 DataModel 不可再使用。 */
  destroy(): void {
    this._subscribers.clear();
    this._destroyed = true;
  }

  // ─── 内部方法 ─────────────────────────────────────────────

  private _ensureNotDestroyed(): void {
    if (this._destroyed) {
      throw new Error("[DataModel] 实例已销毁，不能再执行写操作");
    }
  }

  /** 按路径片段读取值 */
  private _getBySegments(segments: string[]): JsonValue | undefined {
    let current: unknown = this._data.root;
    for (const seg of segments) {
      if (current === null || current === undefined) return undefined;
      if (typeof current !== "object") return undefined;
      if (Array.isArray(current)) {
        const idx = parseInt(seg, 10);
        if (isNaN(idx) || idx < 0 || idx >= current.length) return undefined;
        current = current[idx];
      } else {
        current = (current as Record<string, unknown>)[seg];
      }
    }
    return current as JsonValue | undefined;
  }

  /** 按路径片段设置值，自动创建中间节点 */
  private _setBySegments(segments: string[], value: JsonValue): void {
    if (this._data.root === null || this._data.root === undefined || typeof this._data.root !== "object") {
      this._data.root = this._shouldUseArray(segments[0]!) ? [] : {};
    }

    let current: unknown = this._data.root;
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i]!;
      const nextSeg = segments[i + 1]!;
      const isNextArray = this._shouldUseArray(nextSeg);

      let next: unknown;
      if (current === null || current === undefined || typeof current !== "object") {
        const newNode: unknown = isNextArray ? [] : {};
        if (Array.isArray(current)) {
          const idx = parseInt(seg, 10);
          (current as unknown[])[idx] = newNode;
        } else if (typeof current === "object" && current !== null) {
          (current as Record<string, unknown>)[seg] = newNode;
        }
        current = newNode;
        continue;
      }

      if (Array.isArray(current)) {
        const idx = parseInt(seg, 10);
        next = current[idx];
        if (next === undefined || next === null || typeof next !== "object") {
          next = isNextArray ? [] : {};
          (current as unknown[])[idx] = next;
        }
      } else {
        next = (current as Record<string, unknown>)[seg];
        if (next === undefined || next === null || typeof next !== "object") {
          next = isNextArray ? [] : {};
          (current as Record<string, unknown>)[seg] = next;
        }
      }
      current = next;
    }

    // 设置最后一个片段的值
    const lastSeg = segments[segments.length - 1]!;
    if (Array.isArray(current)) {
      const idx = parseInt(lastSeg, 10);
      if (!Number.isNaN(idx)) {
        (current as unknown[])[idx] = value;
      }
    } else if (typeof current === "object" && current !== null) {
      (current as Record<string, unknown>)[lastSeg] = value;
    }
  }

  /** 按路径片段删除值 */
  private _deleteBySegments(segments: string[]): void {
    let current: unknown = this._data.root;
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i]!;
      if (current === null || current === undefined || typeof current !== "object") {
        return; // 路径不存在，无需删除
      }
      if (Array.isArray(current)) {
        const idx = parseInt(seg, 10);
        current = current[idx];
      } else {
        current = (current as Record<string, unknown>)[seg];
      }
    }

    const lastSeg = segments[segments.length - 1]!;
    if (Array.isArray(current)) {
      const idx = parseInt(lastSeg, 10);
      (current as unknown[]).splice(idx, 1);
    } else if (typeof current === "object" && current !== null) {
      delete (current as Record<string, unknown>)[lastSeg];
    }
  }

  /** 通知指定路径的订阅者 */
  private _notify(segments: string[]): void {
    const key = encodePath(segments);
    const subs = this._subscribers.get(key);
    if (subs) {
      subs.forEach((cb) => {
        try {
          cb();
        } catch (e) {
          logger.error("订阅回调异常:", e);
        }
      });
    }
  }

  /**
   * 通知本次变更影响的订阅者。
   *
   * 根节点变更会影响所有路径；深层路径变更会影响该路径及所有祖先路径。
   */
  private _notifyAffected(segments: string[]): void {
    if (segments.length === 0) {
      for (const subs of this._subscribers.values()) {
        subs.forEach((cb) => {
          try {
            cb();
          } catch (e) {
            logger.error("订阅回调异常:", e);
          }
        });
      }
      return;
    }

    for (let i = segments.length; i >= 0; i--) {
      this._notify(segments.slice(0, i));
    }
  }

  /** 数字路径片段在自动创建中间节点时按数组处理。 */
  private _shouldUseArray(segment: string): boolean {
    return /^\d+$/.test(segment);
  }
}
