/**
 * 组件上下文（ComponentContext）：注入到每个 A2UI 组件中的渲染上下文。
 *
 * 组件通过 `inject(componentContextKey)` 获取该上下文，
 * 用于解析属性值、绑定数据、派发 action 等。
 */

import type { InjectionKey } from "vue";
import type { JsonObject } from "@a2ui-platform/shared";
import type { ComponentModel } from "../core/component-model";
import type { DataContext } from "../core/data-context";
import type { RendererScriptAction } from "../core/action";

/** 组件上下文中暴露的接口 */
export interface ComponentContext {
  /** 当前组件的 ComponentModel */
  readonly componentModel: ComponentModel;
  /** 当前组件作用域的 DataContext（已应用 basePath） */
  readonly dataContext: DataContext;
  /** 所属 surface 的 ID */
  readonly surfaceId: string;
  /** 解析属性值（自动处理 { path } 动态引用） */
  resolveValue(raw: unknown): unknown;
  /** 注册属性脚本依赖路径，用于 dataModel 变化时触发组件刷新。 */
  registerScriptDeps(deps: string[]): void;
  /** 派发 Renderer 错误消息。 */
  dispatchError(error: { code: string; message: string; path?: string }): void;
  /** 派发 action（组件点击等） */
  dispatchAction(name: string, context: JsonObject): void;
  /** 执行受限 action.script。 */
  runActionScript(action: RendererScriptAction, context: JsonObject): void;
  /** 为指定路径创建一个 setter 函数（用于双向绑定） */
  createSetter(path: string): (value: unknown) => void;
}

/** Vue3 provide/inject 注入键 */
export const componentContextKey: InjectionKey<ComponentContext> = Symbol("A2UI.ComponentContext");

/** action 派发回调类型 */
export type ActionDispatcher = (
  surfaceId: string,
  sourceComponentId: string,
  name: string,
  context: JsonObject
) => void;
