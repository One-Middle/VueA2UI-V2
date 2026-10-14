/**
 * A2UI RenderNode 到真实 DOM 节点的递归渲染器。
 *
 * 职责：
 * - 根据节点类型查找 dom-basic 组件适配器。
 * - 把 slots、emit、组件状态与子节点渲染能力注入组件。
 * - 在根 DOM 元素上写入组件定位数据，供焦点恢复使用。
 *
 * 引用：
 * - renderer-core 的 RenderNode、SurfaceRuntime。
 * - dom-basic 组件注册表与渲染结果类型。
 * 被引用：
 * - surface-host、包入口。
 * 注意：
 * - 本模块不做虚拟 DOM diff，调用方会用返回结果整体替换容器内容。
 */
import type {
  RenderNode,
  RenderPanelSlot,
  SurfaceRuntime,
} from "@a2ui-platform/renderer-core";
import { basicDomComponents } from "../ui/dom-basic";
import type { DomRenderResult } from "../ui/dom-basic/types";

/**
 * 将一个 RenderNode 渲染为 DOM 节点。
 *
 * @param node - renderer-core 生成的渲染节点。
 * @param runtime - 当前 Surface 运行时，用于派发事件和读取组件局部状态。
 * @returns DOM 渲染结果；node 为空时返回 null。
 */
export function renderDomNode(
  node: RenderNode | null,
  runtime: SurfaceRuntime,
): DomRenderResult | null {
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
    renderChildren: (nodes) =>
      nodes
        .map((child) => renderDomNode(child, runtime))
        .filter((child): child is DomRenderResult => child !== null),
  });
  if (result.node instanceof HTMLElement) {
    // 焦点恢复依赖组件标识和数据路径定位重建后的等价控件。
    result.node.dataset.componentId = node.meta.componentId;
    result.node.dataset.a2uiBasePath = node.meta.basePath;
  }
  return result;
}

function toSlots(
  node: RenderNode,
  runtime: SurfaceRuntime,
): {
  default?: () => DomRenderResult[];
  media?: () => DomRenderResult[];
  panels?: RenderPanelSlot[];
} {
  const slots: {
    default?: () => DomRenderResult[];
    media?: () => DomRenderResult[];
    panels?: RenderPanelSlot[];
  } = {};
  if (node.type === "Tabs" && isPanelSlotArray(node.slots?.panels))
    slots.panels = node.slots.panels;
  for (const [name, value] of Object.entries(node.slots ?? {})) {
    if (name === "panels" || !isNodeArray(value)) continue;
    if (name === "default" || name === "media")
      slots[name] = () =>
        value
          .map((child) => renderDomNode(child, runtime))
          .filter((child): child is DomRenderResult => child !== null);
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

function isNodeArray(value: unknown): value is RenderNode[] {
  return (
    Array.isArray(value) &&
    value.every((item) => item && typeof item === "object" && "type" in item)
  );
}
function isPanelSlotArray(value: unknown): value is RenderPanelSlot[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item && typeof item === "object" && "key" in item && "nodes" in item,
    )
  );
}
