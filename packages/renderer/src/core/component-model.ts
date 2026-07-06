/**
 * ComponentModel 类：单个 A2UI 组件的响应式模型。
 *
 * 提供对组件原始属性的访问，以及 children 中静态/动态子引用的解析。
 */

import { reactive } from "vue";
import type { A2UIComponent, JsonValue } from "@a2ui-platform/shared";

export class ComponentModel {
  /** 组件唯一标识 */
  readonly id: string;

  /** 组件类型名（如 "Button"、"Row"、"Text" 等） */
  private _componentType: string;

  /** 组件的原始属性（不含 id、component） */
  private _raw: Record<string, unknown>;

  constructor(raw: A2UIComponent) {
    const { id, component, ...props } = raw;
    this.id = id;
    this._componentType = component;
    this._raw = reactive({ ...props }) as Record<string, unknown>;
  }

  // ─── 属性 ─────────────────────────────────────────────────

  /** 组件类型名 */
  get componentType(): string {
    return this._componentType;
  }

  // ─── 公开方法 ─────────────────────────────────────────────

  /** 获取指定属性的值。 */
  getProperty(key: string): JsonValue | undefined {
    return this._raw[key] as JsonValue | undefined;
  }

  /**
   * 提取 children 中的所有子引用。
   * children 数组元素可以是：
   *   - 字符串：静态 child id
   *   - { path: string; componentId: string }：动态 child 引用
   */
  getChildIds(): string[] {
    const children = this._raw.children;
    if (!Array.isArray(children)) return [];

    const ids: string[] = [];
    for (const child of children) {
      if (typeof child === "string") {
        ids.push(child);
      } else if (child && typeof child === "object" && "componentId" in child) {
        const compId = (child as Record<string, string>).componentId;
        if (compId !== undefined) ids.push(compId);
      }
    }
    return ids;
  }

  /** 返回所有静态子组件 id（字符串类型的 child）。 */
  getStaticChildren(): string[] {
    const children = this._raw.children;
    if (!Array.isArray(children)) return [];

    return children.filter((c): c is string => typeof c === "string");
  }

  /** 返回动态子组件配置（{ path, componentId }），没有则返回 undefined。 */
  getDynamicChild(): { path: string; componentId: string } | undefined {
    const children = this._raw.children;
    if (!Array.isArray(children)) return undefined;

    for (const child of children) {
      if (child && typeof child === "object" && "path" in child && "componentId" in child) {
        const obj = child as Record<string, string>;
        const p = obj.path;
        const cid = obj.componentId;
        if (p !== undefined && cid !== undefined) {
          return { path: p, componentId: cid };
        }
      }
    }
    return undefined;
  }

  /**
   * 用新的原始数据更新组件属性。
   * 如果组件类型（component）发生了变化，返回 false；否则返回 true。
   */
  update(raw: A2UIComponent): boolean {
    // 类型检查：只允许同类型更新
    if (raw.component !== this._componentType) {
      return false;
    }

    const { id: _id, component: _comp, ...newProps } = raw;

    // 清理旧属性
    for (const key of Object.keys(this._raw)) {
      delete this._raw[key];
    }
    // 写入新属性
    for (const [key, value] of Object.entries(newProps)) {
      this._raw[key] = value;
    }

    return true;
  }
}
