/**
 * RenderNode 到 Vue VNode 的递归渲染器。
 *
 * 职责：
 * - 根据 RenderNode.type 查找 Vue Basic 组件。
 * - 把 renderer-core 事件意图转换为 Vue 事件 prop。
 * - 将 RenderNode slots 转换为 Vue slots，并处理 Tabs 面板 slot。
 *
 * 引用：
 * - renderer-core 的 RenderNode、RenderPanelSlot、SurfaceRuntime。
 * - basicUiComponents 基础组件注册表。
 * 被引用：
 * - A2uiRuntimeSurface。
 * 注意：
 * - 本模块不解析 A2UI 协议，也不直接写 DataModel；事件统一交回 SurfaceRuntime。
 */
import { h, type VNode } from "vue";
import type {
  RenderNode,
  RenderPanelSlot,
  SurfaceRuntime,
} from "@a2ui-platform/renderer-core";
import { basicUiComponents } from "./basic";

/**
 * 将单个 RenderNode 渲染为 Vue VNode。
 *
 * @param node - renderer-core 输出的渲染节点；为空时返回 null。
 * @param runtime - 当前 Surface 运行时，用于事件派发和组件局部状态。
 * @returns Vue VNode；组件类型未注册时返回 fallback 节点。
 */
export function renderVueNode(
  node: RenderNode | null,
  runtime: SurfaceRuntime,
): VNode | null {
  if (!node) return null;
  const component = basicUiComponents.get(node.type);
  if (!component)
    return h(
      "div",
      { class: "a2ui-fallback", "data-component-id": node.meta.componentId },
      `未注册的组件类型：${node.type}`,
    );
  const props: Record<string, unknown> = {
    ...node.props,
    "data-component-id": node.meta.componentId,
    "data-a2ui-base-path": node.meta.basePath,
  };
  for (const eventName of Object.keys(node.events ?? {})) {
    props[toVueEventProp(eventName)] = (value: unknown) =>
      runtime.dispatch({ address: node.meta, eventName, value });
  }
  if (node.type === "Tabs" && !node.events?.["update:modelValue"]) {
    props.modelValue = runtime
      .stateFor(node.meta)
      .get("activeKey", String(node.props.defaultValue ?? ""));
    props["onUpdate:modelValue"] = (value: unknown) =>
      runtime.setState(node.meta, "activeKey", String(value ?? ""));
  }
  return h(component, props, toVueSlots(node, runtime));
}

/**
 * 把 RenderNode slot 数据转换为 Vue slot 函数。
 */
function toVueSlots(
  node: RenderNode,
  runtime: SurfaceRuntime,
): Record<string, (...args: unknown[]) => VNode[]> | undefined {
  if (!node.slots) return undefined;
  if (node.type === "Tabs" && isPanelSlotArray(node.slots.panels)) {
    return {
      default: (slotProps: unknown) => {
        const activeKey =
          slotProps && typeof slotProps === "object"
            ? String((slotProps as Record<string, unknown>).activeKey ?? "")
            : "";
        const panels = node.slots!.panels as RenderPanelSlot[];
        const panel =
          panels.find((item) => item.key === activeKey) ?? panels[0];
        return panel
          ? panel.nodes
              .map((child) => renderVueNode(child, runtime))
              .filter((child): child is VNode => child !== null)
          : [];
      },
    };
  }
  const slots: Record<string, (...args: unknown[]) => VNode[]> = {};
  for (const [name, value] of Object.entries(node.slots)) {
    if (!isNodeArray(value)) continue;
    slots[name] = () =>
      value
        .map((child) => renderVueNode(child, runtime))
        .filter((child): child is VNode => child !== null);
  }
  return Object.keys(slots).length ? slots : undefined;
}

/**
 * 将普通事件名转换为 Vue h() 可识别的事件 prop。
 */
function toVueEventProp(eventName: string): string {
  return eventName.startsWith("update:")
    ? `onUpdate:${eventName.slice(7)}`
    : `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`;
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
