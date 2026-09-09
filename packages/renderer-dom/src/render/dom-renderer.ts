import type { RenderNode, RenderPanelSlot, SurfaceRuntime } from "@a2ui-platform/renderer-core";
import { basicDomComponents } from "../ui/dom-basic";
import type { DomRenderResult } from "../ui/dom-basic/types";

export function renderDomNode(node: RenderNode | null, runtime: SurfaceRuntime): DomRenderResult | null {
  if (!node) return null;
  const component = basicDomComponents.get(node.type);
  if (!component) return fallback(node, `未注册的组件类型：${node.type}`);
  const result = component({
    props: node.props,
    slots: toSlots(node, runtime),
    emit: (eventName, value) => {
      if (eventName === "__requestRender") runtime.requestUpdate();
      else runtime.dispatch({ address: node.meta, eventName, value });
    },
    state: runtime.stateFor(node.meta),
    renderChildren: (nodes) => nodes.map((child) => renderDomNode(child, runtime)).filter((child): child is DomRenderResult => child !== null),
  });
  if (result.node instanceof HTMLElement) {
    result.node.dataset.componentId = node.meta.componentId;
    result.node.dataset.a2uiBasePath = node.meta.basePath;
  }
  return result;
}

function toSlots(node: RenderNode, runtime: SurfaceRuntime): { default?: () => DomRenderResult[]; media?: () => DomRenderResult[]; panels?: RenderPanelSlot[] } {
  const slots: { default?: () => DomRenderResult[]; media?: () => DomRenderResult[]; panels?: RenderPanelSlot[] } = {};
  if (node.type === "Tabs" && isPanelSlotArray(node.slots?.panels)) slots.panels = node.slots.panels;
  for (const [name, value] of Object.entries(node.slots ?? {})) {
    if (name === "panels" || !isNodeArray(value)) continue;
    if (name === "default" || name === "media") slots[name] = () => value.map((child) => renderDomNode(child, runtime)).filter((child): child is DomRenderResult => child !== null);
  }
  return slots;
}

function fallback(node: RenderNode, message: string): DomRenderResult {
  const element = document.createElement("div");
  element.className = "a2ui-fallback";
  element.dataset.componentId = node.meta.componentId;
  element.dataset.a2uiBasePath = node.meta.basePath;
  element.textContent = message;
  return { node: element };
}

function isNodeArray(value: unknown): value is RenderNode[] { return Array.isArray(value) && value.every((item) => item && typeof item === "object" && "type" in item); }
function isPanelSlotArray(value: unknown): value is RenderPanelSlot[] { return Array.isArray(value) && value.every((item) => item && typeof item === "object" && "key" in item && "nodes" in item); }
