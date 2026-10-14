/**
 * RenderNode 内部渲染模型。
 *
 * 职责：
 * - 描述 A2UI ComponentModel 解析后的普通组件树
 * - 保存普通 props、事件意图、内容区域和最小诊断 meta
 *
 * 不负责：创建 DOM 节点、执行事件意图或管理 DataModel 订阅。
 */

import type { JsonObject } from "@a2ui-platform/shared";
import type { RendererScriptAction } from "../core/action";

/**
 * 一个 RenderNode 在运行时中的定位信息。
 *
 * @property surfaceId - 所属 Surface。
 * @property componentId - 来源 A2UI 组件 ID。
 * @property basePath - 该节点当前绑定的数据作用域路径。
 */
export interface RenderNodeMeta {
  surfaceId: string;
  componentId: string;
  basePath: string;
}

/**
 * 组件事件寻址信息。
 */
export type ComponentAddress = RenderNodeMeta;

/**
 * 渲染计划根节点类型别名。
 */
export type RenderPlan = RenderNode;

/**
 * 组件事件在 renderer-core 中解析出的意图。
 *
 * - action-event：派发标准 A2UI action 事件。
 * - action-script：执行受限动作脚本。
 * - model-set：把组件值写回 DataModel。
 */
export type RenderEventIntent =
  | {
      kind: "action-event";
      name: string;
      context: JsonObject;
    }
  | {
      kind: "action-script";
      action: RendererScriptAction;
      context: JsonObject;
    }
  | {
      kind: "model-set";
      path: string;
    };

/**
 * Tabs 等组件使用的面板 slot。
 */
export interface RenderPanelSlot {
  key: string;
  nodes: RenderNode[];
}

/**
 * RenderNode 支持的 slot 值。
 */
export type RenderSlotValue = RenderNode[] | RenderPanelSlot[];

/**
 * renderer-core 输出给平台适配器的普通渲染节点。
 */
export interface RenderNode {
  id: string;
  type: string;
  props: Record<string, unknown>;
  events?: Record<string, RenderEventIntent>;
  slots?: Record<string, RenderSlotValue>;
  meta: RenderNodeMeta;
}

/**
 * 构建整棵 RenderNode tree 的结果。
 *
 * @property node - 根节点；根组件缺失或构建失败时为 null。
 * @property dependencies - 本次构建读取过的数据路径，用于运行时同步订阅。
 */
export interface BuildRenderTreeResult {
  node: RenderNode | null;
  dependencies: string[];
}
