/**
 * RenderNode 内部渲染模型。
 *
 * 职责：
 * - 描述 A2UI ComponentModel 解析后的普通组件树
 * - 保存普通 props、事件意图、内容区域和最小诊断 meta
 *
 * 不负责：创建 Vue VNode、执行事件意图或管理 DataModel 订阅。
 */

import type { JsonObject } from "@a2ui-platform/shared";
import type { RendererScriptAction } from "../core/action";

export interface RenderNodeMeta {
  surfaceId: string;
  componentId: string;
  basePath: string;
}

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

export interface RenderPanelSlot {
  key: string;
  nodes: RenderNode[];
}

export type RenderSlotValue = RenderNode[] | RenderPanelSlot[];

export interface RenderNode {
  id: string;
  type: string;
  props: Record<string, unknown>;
  events?: Record<string, RenderEventIntent>;
  slots?: Record<string, RenderSlotValue>;
  meta: RenderNodeMeta;
}

export interface BuildRenderTreeResult {
  node: RenderNode | null;
  dependencies: string[];
}
