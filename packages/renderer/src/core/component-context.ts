/**
 * ComponentContext：提供给 Vue 组件的渲染上下文接口。
 *
 * 实现类 ComponentContextImpl 负责：
 *   - 构建子组件的渲染信息
 *   - 解析动态值
 *   - 创建数据绑定 setter
 *   - 派发 action
 *   - 提供 surfaceId 等元信息
 */

import type { A2UIActionPayload, JsonValue } from "@a2ui-platform/shared";
import { ComponentModel } from "./component-model";
import { DataContext } from "./data-context";
import { SurfaceGroupModel } from "./surface-model";

// ─── 类型定义 ───────────────────────────────────────────────

/** 子组件的渲染信息：surfaceId + componentId + ComponentModel */
export interface ComponentRenderInfo {
  surfaceId: string;
  componentId: string;
  componentModel: ComponentModel;
}

/** Action 回调：将构建好的 action 消息返回给上层处理 */
export type ActionCallback = (action: {
  version: "v0.9";
  action: A2UIActionPayload;
}) => void;

/** Error 回调 */
export type ErrorCallback = (error: {
  version: "v0.9";
  error: {
    code: string;
    surfaceId: string;
    path?: string;
    message: string;
  };
}) => void;

// ─── 接口 ───────────────────────────────────────────────────

/** 提供给 Vue 渲染组件的上下文接口 */
export interface ComponentContext {
  /** 构建子组件的渲染信息 */
  buildChild(
    childRef: string | { path: string; componentId: string }
  ): ComponentRenderInfo | null;

  /** 解析动态值（{ path: "..." }） */
  resolveValue(value: unknown): unknown;

  /** 创建一个 setter 函数，调用时写入对应路径 */
  createSetter(path: string): (value: unknown) => void;

  /** 派发 action 消息 */
  dispatchAction(action: A2UIActionPayload): void;

  /** 获取当前 surfaceId */
  getSurfaceId(): string;
}

// ─── 实现类 ─────────────────────────────────────────────────

export class ComponentContextImpl implements ComponentContext {
  private _surfaceGroup: SurfaceGroupModel;
  private _surfaceId: string;
  private _componentModel: ComponentModel;
  private _dataContext: DataContext;
  private _onAction: ActionCallback;
  private _onError: ErrorCallback;

  constructor(
    surfaceGroup: SurfaceGroupModel,
    surfaceId: string,
    componentModel: ComponentModel,
    dataContext: DataContext,
    onAction: ActionCallback,
    onError: ErrorCallback
  ) {
    this._surfaceGroup = surfaceGroup;
    this._surfaceId = surfaceId;
    this._componentModel = componentModel;
    this._dataContext = dataContext;
    this._onAction = onAction;
    this._onError = onError;
  }

  // ─── buildChild ───────────────────────────────────────────

  /**
   * 构建子组件的渲染信息。
   *
   * 支持两种引用形式：
   *   - 静态 childId（字符串）：直接按 componentId 查找
   *   - 动态引用（{ path, componentId }）：从 dataContext 获取当前 childId，
   *     再查找对应 componentModel
   *
   * 返回 null 表示子组件不存在。
   */
  buildChild(
    childRef: string | { path: string; componentId: string }
  ): ComponentRenderInfo | null {
    let resolvedComponentId: string;

    if (typeof childRef === "string") {
      // 静态 child id
      resolvedComponentId = childRef;
    } else {
      // 动态 child：从 dataContext 获取当前值
      const dynamicValue = this._dataContext.resolve({ path: childRef.path });
      if (typeof dynamicValue === "string") {
        resolvedComponentId = dynamicValue;
      } else if (
        dynamicValue &&
        typeof dynamicValue === "object" &&
        "componentId" in (dynamicValue as Record<string, unknown>)
      ) {
        resolvedComponentId = (
          dynamicValue as Record<string, unknown>
        ).componentId as string;
      } else {
        // 无法解析动态子引用
        return null;
      }
    }

    const surface = this._surfaceGroup.get(this._surfaceId);
    if (!surface) return null;

    const compModel = surface.components.get(resolvedComponentId);
    if (!compModel) return null;

    return {
      surfaceId: this._surfaceId,
      componentId: resolvedComponentId,
      componentModel: compModel,
    };
  }

  // ─── resolveValue ─────────────────────────────────────────

  /** 解析动态值。如果是 { path: "..." } 对象，从 dataContext 取值；否则原样返回。 */
  resolveValue(value: unknown): unknown {
    return this._dataContext.resolve(value);
  }

  // ─── createSetter ─────────────────────────────────────────

  /**
   * 创建一个 setter 函数，用于双向绑定场景（如 TextField）。
   * 调用 setter 时会将值写入 dataModel 的指定路径。
   */
  createSetter(path: string): (value: unknown) => void {
    return (value: unknown) => {
      const fullPath = this._dataContext.resolvePath(path);
      this._dataContext.dataModel.set(fullPath, value as JsonValue);
    };
  }

  // ─── dispatchAction ───────────────────────────────────────

  /** 派发 action 消息。由上层（如 A2uiSurface）决定如何处理。 */
  dispatchAction(actionPayload: A2UIActionPayload): void {
    this._onAction({
      version: "v0.9",
      action: actionPayload,
    });
  }

  // ─── getSurfaceId ─────────────────────────────────────────

  getSurfaceId(): string {
    return this._surfaceId;
  }
}
