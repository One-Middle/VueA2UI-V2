import type { RenderNode, RenderPanelSlot } from "../../render/render-node";
import type { DomStyleProperties } from "../../render/resolve-style";

export type DomCleanup = () => void;

export interface DomRenderResult {
  node: Node;
  cleanup?: DomCleanup;
}

export interface DomComponentState {
  get<T>(key: string, fallback: T): T;
  set<T>(key: string, value: T): void;
  delete(key: string): void;
}

export type DomSlotRenderer = () => DomRenderResult[];

export interface DomSlotRendererMap {
  default?: DomSlotRenderer;
  media?: DomSlotRenderer;
  panels?: RenderPanelSlot[];
}

export interface DomBasicComponentInput {
  props: Record<string, unknown>;
  slots: DomSlotRendererMap;
  emit: (eventName: string, value?: unknown) => void;
  state: DomComponentState;
  renderChildren: (nodes: RenderNode[]) => DomRenderResult[];
}

export type DomBasicComponent = (
  input: DomBasicComponentInput,
) => DomRenderResult;

export type { DomStyleProperties };
