/**
 * dom-basic 组件适配器的类型契约。
 *
 * 职责：
 * - 描述基础组件如何接收 props、slots、emit 与局部状态。
 * - 统一组件返回 DOM 节点与清理函数的形状。
 *
 * 引用：
 * - renderer-core 的 RenderNode、RenderPanelSlot、DomStyleProperties。
 * 被引用：
 * - dom-basic 组件实现、DOM 渲染器。
 * 注意：
 * - cleanup 必须释放事件监听等副作用，避免整树重绘后留下旧 DOM 引用。
 */
import type {
  RenderNode,
  RenderPanelSlot,
  DomStyleProperties,
} from "@a2ui-platform/renderer-core";

/**
 * DOM 渲染结果的副作用清理函数。
 */
export type DomCleanup = () => void;

/**
 * 单个组件渲染后的 DOM 结果。
 *
 * @property node - 渲染得到的 DOM 节点。
 * @property cleanup - 可选的清理函数，用于移除事件监听或释放子节点副作用。
 */
export interface DomRenderResult {
  node: Node;
  cleanup?: DomCleanup;
}

/**
 * 组件局部状态存取接口。
 *
 * 注意：该状态由 SurfaceRuntime 按组件地址隔离，适合保存 Tabs 当前项等 UI 状态。
 */
export interface DomComponentState {
  get<T>(key: string, fallback: T): T;
  set<T>(key: string, value: T): void;
  delete(key: string): void;
}

/**
 * 渲染一个 slot 的函数。
 */
export type DomSlotRenderer = () => DomRenderResult[];

/**
 * DOM 基础组件可接收的 slot 集合。
 */
export interface DomSlotRendererMap {
  default?: DomSlotRenderer;
  media?: DomSlotRenderer;
  panels?: RenderPanelSlot[];
}

/**
 * 基础组件适配器的输入上下文。
 *
 * @property props - 协议层解析后的组件属性。
 * @property slots - 已延迟绑定的插槽渲染器。
 * @property emit - 向运行时派发组件事件。
 * @property state - 当前组件地址下的局部状态。
 * @property renderChildren - 渲染显式子节点的辅助函数。
 */
export interface DomBasicComponentInput {
  props: Record<string, unknown>;
  slots: DomSlotRendererMap;
  emit: (eventName: string, value?: unknown) => void;
  state: DomComponentState;
  renderChildren: (nodes: RenderNode[]) => DomRenderResult[];
}

/**
 * 把一个 A2UI 基础组件渲染为 DOM 的适配函数。
 */
export type DomBasicComponent = (
  input: DomBasicComponentInput,
) => DomRenderResult;

export type { DomStyleProperties };
