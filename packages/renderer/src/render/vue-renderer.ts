/**
 * RenderNode 到 Vue VNode 的渲染器。
 *
 * 职责：
 * - 将 RenderNode props/events/slots 转换为普通 Vue 组件输入
 * - 执行 RenderEventIntent 对应的 Renderer 行为
 *
 * 不负责：解析 A2UI ComponentModel 或订阅 DataModel。
 */

import { h, type VNode } from "vue";
import type { JsonValue } from "@a2ui-platform/shared";
import { basicUiComponents } from "../ui/basic";
import type { RenderContext } from "./render-context";
import type {
  RenderEventIntent,
  RenderNode,
  RenderPanelSlot,
  RenderSlotValue,
} from "./render-node";

export function renderVueNode(
  node: RenderNode | null,
  context: RenderContext,
): VNode | null {
  if (!node) return null;

  if (node.type === "__fallback") {
    return h(
      "div",
      {
        class: "a2ui-fallback",
        "data-component-id": node.meta.componentId,
      },
      String(node.props.message ?? "组件无法渲染"),
    );
  }

  const component = basicUiComponents.get(node.type);
  if (!component) {
    return h(
      "div",
      {
        class: "a2ui-fallback",
        "data-component-id": node.meta.componentId,
      },
      `未注册的组件类型：${node.type}`,
    );
  }

  return h(
    component,
    {
      ...node.props,
      ...toVueEventHandlers(node, context),
      "data-component-id": node.meta.componentId,
    },
    toVueSlots(node, context),
  );
}

function toVueEventHandlers(
  node: RenderNode,
  context: RenderContext,
): Record<string, (...args: unknown[]) => void> {
  const handlers: Record<string, (...args: unknown[]) => void> = {};
  for (const [eventName, intent] of Object.entries(node.events ?? {})) {
    handlers[toVueEventProp(eventName)] = (value: unknown) => {
      runEventIntent(intent, value, node, context);
    };
  }
  return handlers;
}

function runEventIntent(
  intent: RenderEventIntent,
  value: unknown,
  node: RenderNode,
  context: RenderContext,
): void {
  if (intent.kind === "model-set") {
    context.surfaceModel.dataModel.set(intent.path, value as JsonValue);
    return;
  }

  if (intent.kind === "action-event") {
    context.emitAction({
      name: intent.name,
      sourceComponentId: node.meta.componentId,
      context: intent.context,
    });
    return;
  }

  context.runActionScript({
    action: intent.action,
    sourceComponentId: node.meta.componentId,
    basePath: node.meta.basePath,
    context: intent.context,
  });
}

function toVueSlots(
  node: RenderNode,
  context: RenderContext,
): Record<string, (...args: unknown[]) => VNode[]> | undefined {
  if (!node.slots) return undefined;

  if (node.type === "Tabs" && isPanelSlotArray(node.slots.panels)) {
    const panels = node.slots.panels;
    return {
      default: (slotProps: unknown) => {
        const activeKey = getActiveKey(slotProps);
        const panel =
          panels.find((item) => item.key === activeKey) ?? panels[0];
        return panel ? renderNodeArray(panel.nodes, context) : [];
      },
    };
  }

  const slots: Record<string, (...args: unknown[]) => VNode[]> = {};
  for (const [slotName, slotValue] of Object.entries(node.slots)) {
    if (!isRenderNodeArray(slotValue)) continue;
    slots[slotName] = () => renderNodeArray(slotValue, context);
  }

  return Object.keys(slots).length > 0 ? slots : undefined;
}

function renderNodeArray(nodes: RenderNode[], context: RenderContext): VNode[] {
  return nodes
    .map((child) => renderVueNode(child, context))
    .filter((child): child is VNode => child !== null);
}

function toVueEventProp(eventName: string): string {
  if (eventName.startsWith("update:")) {
    return `onUpdate:${eventName.slice("update:".length)}`;
  }
  return `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`;
}

function getActiveKey(slotProps: unknown): string {
  if (!slotProps || typeof slotProps !== "object") return "";
  const value = (slotProps as Record<string, unknown>).activeKey;
  return typeof value === "string" ? value : "";
}

function isRenderNodeArray(value: RenderSlotValue): value is RenderNode[] {
  return Array.isArray(value) && value.every((item) => "type" in item);
}

function isPanelSlotArray(
  value: RenderSlotValue | undefined,
): value is RenderPanelSlot[] {
  return (
    Array.isArray(value) &&
    value.every((item) => "key" in item && "nodes" in item)
  );
}
