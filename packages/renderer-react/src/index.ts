/**
 * React 渲染适配器，将 renderer-core 的 RenderNode 快照渲染为 React 元素。
 *
 * 职责：
 * - 通过 useSyncExternalStore 订阅 SurfaceRuntime 快照，适配 React 并发渲染模型。
 * - 把 RenderNode.type 映射到一组轻量 React 基础组件实现。
 * - 将 React 表单/点击事件派回 SurfaceRuntime，由 core 执行 model 写回或 action。
 *
 * 引用：
 * - renderer-core 的 SurfaceRuntime、RenderNode 和 RenderPanelSlot。
 * 被引用：
 * - React 宿主应用和 renderer-react 测试。
 * 注意：
 * - 本包是基础适配层，不追求与 renderer-dom / renderer-vue 完全等价的视觉能力。
 */
import React, { useSyncExternalStore } from "react";
import "./styles.css";
import type {
  RenderNode,
  RenderPanelSlot,
  SurfaceRuntime,
} from "@a2ui-platform/renderer-core";

/**
 * 订阅 SurfaceRuntime 的渲染快照。
 *
 * @param runtime - renderer-core 提供的 Surface 运行时。
 * @returns 当前 RenderPlanSnapshot，runtime 更新时会触发 React 重新渲染。
 */
export function useRenderPlan(runtime: SurfaceRuntime) {
  return useSyncExternalStore(
    (listener) => runtime.subscribe(listener),
    () => runtime.getSnapshot(),
    () => runtime.getSnapshot(),
  );
}

/**
 * React 版 A2UI Surface 容器组件。
 *
 * @param props.runtime - 要渲染的 SurfaceRuntime。
 * @returns React section 元素，内部挂载当前 Surface 的根 RenderNode。
 */
export function A2uiRuntimeSurface({ runtime }: { runtime: SurfaceRuntime }) {
  const snapshot = useRenderPlan(runtime);
  return React.createElement(
    "section",
    { className: "a2ui-surface", "data-surface-id": snapshot.surfaceId },
    snapshot.node
      ? React.createElement(RenderPlanNode, { node: snapshot.node, runtime })
      : React.createElement(
          "div",
          { className: "a2ui-empty" },
          "Surface 未找到或 Root 组件未定义",
        ),
  );
}

/**
 * 递归渲染单个 RenderNode。
 *
 * @param props.node - renderer-core 输出的普通渲染节点。
 * @param props.runtime - 当前 Surface 运行时，用于事件派发和局部状态。
 */
export function RenderPlanNode({
  node,
  runtime,
}: {
  node: RenderNode;
  runtime: SurfaceRuntime;
}): React.ReactElement {
  const Component = reactBasicComponents.get(node.type) ?? Fallback;
  return React.createElement(Component, { node, runtime });
}

type BasicProps = { node: RenderNode; runtime: SurfaceRuntime };
type BasicComponent = (props: BasicProps) => React.ReactElement;

const names = [
  "Text",
  "Image",
  "Icon",
  "Video",
  "AudioPlayer",
  "Divider",
  "Row",
  "Column",
  "Grid",
  "Container",
  "Spacer",
  "List",
  "Card",
  "Tabs",
  "Button",
  "TextField",
  "CheckBox",
  "ChoicePicker",
  "Slider",
  "DateTimeInput",
];

/**
 * RenderNode.type 到 React 基础组件的映射。
 *
 * 注意：当前多数基础组件共用 ReactBasic，通过 node.type 分支选择具体标签。
 */
export const reactBasicComponents = new Map<string, BasicComponent>(
  names.map((name) => [name, ReactBasic]),
);

function ReactBasic({ node, runtime }: BasicProps): React.ReactElement {
  const props = node.props;
  const attrs = {
    className: `a2ui-${kebab(node.type)}`,
    "data-component-id": node.meta.componentId,
    "data-a2ui-base-path": node.meta.basePath,
    style: props.style as React.CSSProperties | undefined,
  };
  if (node.type === "Text") {
    return React.createElement("p", attrs, String(props.text ?? ""));
  }
  if (node.type === "Image") {
    return React.createElement("img", {
      ...attrs,
      src: String(props.src ?? ""),
      alt: String(props.alt ?? ""),
      onError: () => runtime.setState(node.meta, "hasLoadError", true),
    });
  }
  if (node.type === "Icon") {
    return React.createElement(
      "span",
      attrs,
      String(props.name ?? props.icon ?? ""),
    );
  }
  if (node.type === "Video") {
    return React.createElement("video", {
      ...attrs,
      src: String(props.src ?? ""),
      controls: Boolean(props.controls ?? true),
    });
  }
  if (node.type === "AudioPlayer") {
    return React.createElement("audio", {
      ...attrs,
      src: String(props.src ?? ""),
      controls: true,
    });
  }
  if (node.type === "Divider") return React.createElement("hr", attrs);
  if (node.type === "Spacer") return React.createElement("div", attrs);
  if (node.type === "Button") {
    return React.createElement(
      "button",
      {
        ...attrs,
        disabled: Boolean(props.disabled),
        onClick: () =>
          runtime.dispatch({ address: node.meta, eventName: "click" }),
      },
      String(props.label ?? ""),
    );
  }
  if (node.type === "CheckBox") {
    return React.createElement(
      "label",
      attrs,
      React.createElement("input", {
        type: "checkbox",
        checked: Boolean(props.modelValue),
        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
          dispatchModel(node, runtime, event.currentTarget.checked),
      }),
      String(props.label ?? ""),
    );
  }
  if (node.type === "TextField" || node.type === "DateTimeInput") {
    return React.createElement("input", {
      ...attrs,
      type:
        node.type === "DateTimeInput"
          ? "datetime-local"
          : String(props.type ?? "text"),
      value: String(props.modelValue ?? ""),
      onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
        dispatchModel(node, runtime, event.currentTarget.value),
    });
  }
  if (node.type === "Slider") {
    return React.createElement("input", {
      ...attrs,
      type: "range",
      value: Number(props.modelValue ?? 0),
      min: Number(props.min ?? 0),
      max: Number(props.max ?? 100),
      onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
        dispatchModel(node, runtime, Number(event.currentTarget.value)),
    });
  }
  if (node.type === "ChoicePicker") {
    return React.createElement(
      "select",
      {
        ...attrs,
        value: String(props.modelValue ?? ""),
        onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
          dispatchModel(node, runtime, event.currentTarget.value),
      },
      ...(Array.isArray(props.options) ? props.options : []).map(
        (option: any) =>
          React.createElement(
            "option",
            {
              key: String(option.value ?? option),
              value: String(option.value ?? option),
            },
            String(option.label ?? option.value ?? option),
          ),
      ),
    );
  }
  if (node.type === "Tabs") return React.createElement(Tabs, { node, runtime });
  return React.createElement("div", attrs, renderChildren(node, runtime));
}

function Tabs({ node, runtime }: BasicProps): React.ReactElement {
  const items = Array.isArray(node.props.items)
    ? (node.props.items as Array<Record<string, unknown>>)
    : [];
  const active = runtime
    .stateFor(node.meta)
    .get("activeKey", String(items[0]?.key ?? ""));
  const panels = (node.slots?.panels ?? []) as RenderPanelSlot[];
  const panel = panels.find((item) => item.key === active) ?? panels[0];
  const headers = items.map((item) =>
    React.createElement(
      "button",
      {
        key: String(item.key),
        disabled: Boolean(item.disabled),
        onClick: () =>
          runtime.setState(node.meta, "activeKey", String(item.key)),
      },
      String(item.title ?? item.key),
    ),
  );
  const content =
    panel?.nodes.map((child) =>
      React.createElement(RenderPlanNode, {
        key: `${child.meta.componentId}:${child.meta.basePath}`,
        node: child,
        runtime,
      }),
    ) ?? [];
  return React.createElement(
    "div",
    {
      className: "a2ui-tabs",
      "data-component-id": node.meta.componentId,
      "data-a2ui-base-path": node.meta.basePath,
    },
    React.createElement("div", { className: "a2ui-tabs-header" }, ...headers),
    React.createElement("div", { className: "a2ui-tabs-content" }, ...content),
  );
}

/**
 * 将受控组件值派回 renderer-core 的 model 更新事件。
 */
function dispatchModel(
  node: RenderNode,
  runtime: SurfaceRuntime,
  value: unknown,
): void {
  runtime.dispatch({
    address: node.meta,
    eventName: "update:modelValue",
    value,
  });
}

function renderChildren(
  node: RenderNode,
  runtime: SurfaceRuntime,
): React.ReactNode[] {
  return ((node.slots?.default as RenderNode[] | undefined) ?? []).map(
    (child) =>
      React.createElement(RenderPlanNode, {
        key: `${child.meta.componentId}:${child.meta.basePath}`,
        node: child,
        runtime,
      }),
  );
}

function Fallback({ node }: BasicProps): React.ReactElement {
  return React.createElement(
    "div",
    { className: "a2ui-fallback" },
    `未注册的组件类型：${node.type}`,
  );
}

function kebab(value: string): string {
  return value
    .replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
    .replace(/^-/, "");
}
