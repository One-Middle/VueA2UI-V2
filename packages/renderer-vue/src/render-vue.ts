import { h, type VNode } from "vue";
import type { RenderNode, RenderPanelSlot, SurfaceRuntime } from "@a2ui-platform/renderer-core";
import { basicUiComponents } from "./basic";

export function renderVueNode(node: RenderNode | null, runtime: SurfaceRuntime): VNode | null {
  if (!node) return null;
  const component = basicUiComponents.get(node.type);
  if (!component) return h("div", { class: "a2ui-fallback", "data-component-id": node.meta.componentId }, `未注册的组件类型：${node.type}`);
  const props: Record<string, unknown> = { ...node.props, "data-component-id": node.meta.componentId, "data-a2ui-base-path": node.meta.basePath };
  for (const eventName of Object.keys(node.events ?? {})) {
    props[toVueEventProp(eventName)] = (value: unknown) => runtime.dispatch({ address: node.meta, eventName, value });
  }
  if (node.type === "Tabs" && !node.events?.["update:modelValue"]) {
    props.modelValue = runtime.stateFor(node.meta).get("activeKey", String(node.props.defaultValue ?? ""));
    props["onUpdate:modelValue"] = (value: unknown) => runtime.setState(node.meta, "activeKey", String(value ?? ""));
  }
  return h(component, props, toVueSlots(node, runtime));
}

function toVueSlots(node: RenderNode, runtime: SurfaceRuntime): Record<string, (...args: unknown[]) => VNode[]> | undefined {
  if (!node.slots) return undefined;
  if (node.type === "Tabs" && isPanelSlotArray(node.slots.panels)) {
    return { default: (slotProps: unknown) => {
      const activeKey = slotProps && typeof slotProps === "object" ? String((slotProps as Record<string, unknown>).activeKey ?? "") : "";
      const panels = node.slots!.panels as RenderPanelSlot[];
      const panel = panels.find((item) => item.key === activeKey) ?? panels[0];
      return panel ? panel.nodes.map((child) => renderVueNode(child, runtime)).filter((child): child is VNode => child !== null) : [];
    } };
  }
  const slots: Record<string, (...args: unknown[]) => VNode[]> = {};
  for (const [name, value] of Object.entries(node.slots)) {
    if (!isNodeArray(value)) continue;
    slots[name] = () => value.map((child) => renderVueNode(child, runtime)).filter((child): child is VNode => child !== null);
  }
  return Object.keys(slots).length ? slots : undefined;
}

function toVueEventProp(eventName: string): string { return eventName.startsWith("update:") ? `onUpdate:${eventName.slice(7)}` : `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`; }
function isNodeArray(value: unknown): value is RenderNode[] { return Array.isArray(value) && value.every((item) => item && typeof item === "object" && "type" in item); }
function isPanelSlotArray(value: unknown): value is RenderPanelSlot[] { return Array.isArray(value) && value.every((item) => item && typeof item === "object" && "key" in item && "nodes" in item); }
