import type { JsonObject, JsonValue } from "@a2ui-platform/shared";
import { DataContext } from "../core/data-context";
import type { RendererScriptAction } from "../core/action";
import { runActionScript as executeActionScript } from "../core/js-runtime";
import { basicDomComponents } from "../ui/dom-basic";
import type {
  DomBasicComponentInput,
  DomRenderResult,
} from "../ui/dom-basic/types";
import type { RenderContext } from "./render-context";
import type {
  RenderEventIntent,
  RenderNode,
  RenderPanelSlot,
  RenderSlotValue,
} from "./render-node";
import type { DomStateStore } from "../dom/state-store";

export interface DomRenderContext extends RenderContext {
  stateStore: DomStateStore;
  requestRender(): void;
}

export function renderDomNode(
  node: RenderNode | null,
  context: DomRenderContext,
): DomRenderResult | null {
  if (!node) return null;

  if (node.type === "__fallback") {
    const fallback = document.createElement("div");
    fallback.className = "a2ui-fallback";
    fallback.dataset.componentId = node.meta.componentId;
    fallback.dataset.a2uiBasePath = node.meta.basePath;
    fallback.textContent = String(node.props.message ?? "组件无法渲染");
    return { node: fallback };
  }

  const component = basicDomComponents.get(node.type);
  if (!component) {
    const fallback = document.createElement("div");
    fallback.className = "a2ui-fallback";
    fallback.dataset.componentId = node.meta.componentId;
    fallback.dataset.a2uiBasePath = node.meta.basePath;
    fallback.textContent = `未注册的组件类型：${node.type}`;
    return { node: fallback };
  }

  const componentInput: DomBasicComponentInput = {
    props: node.props,
    slots: toDomSlots(node, context),
    emit: (eventName: string, value?: unknown) => {
      if (eventName === "__requestRender") {
        context.requestRender();
        return;
      }
      const intent = node.events?.[eventName];
      if (intent) runEventIntent(intent, value, node, context);
    },
    state: context.stateStore.stateFor({
      surfaceId: node.meta.surfaceId,
      componentId: node.meta.componentId,
      basePath: node.meta.basePath,
    }),
    renderChildren: (nodes: RenderNode[]) => renderNodeArray(nodes, context),
  };
  const result = component(componentInput);

  if (result.node instanceof HTMLElement) {
    result.node.dataset.componentId = node.meta.componentId;
    result.node.dataset.a2uiBasePath = node.meta.basePath;
  }

  return result;
}

function runEventIntent(
  intent: RenderEventIntent,
  value: unknown,
  node: RenderNode,
  context: DomRenderContext,
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

  runActionScript({
    action: intent.action,
    sourceComponentId: node.meta.componentId,
    basePath: node.meta.basePath,
    context: intent.context,
    renderContext: context,
  });
}

function runActionScript(input: {
  action: RendererScriptAction;
  sourceComponentId: string;
  basePath: string;
  context: JsonObject;
  renderContext: DomRenderContext;
}): void {
  try {
    executeActionScript({
      script: input.action.script,
      dataContext: new DataContext(
        input.renderContext.surfaceModel.dataModel,
        input.basePath,
      ),
      context: input.context,
      actions: {
        emit: (name, context) => {
          input.renderContext.emitAction({
            name,
            sourceComponentId: input.sourceComponentId,
            context: context ?? {},
          });
        },
      },
    });
  } catch (error) {
    input.renderContext.dispatchError({
      ...toRendererError(error),
      sourceComponentId: input.sourceComponentId,
    });
  }
}

function toDomSlots(
  node: RenderNode,
  context: DomRenderContext,
): {
  default?: () => DomRenderResult[];
  media?: () => DomRenderResult[];
  panels?: RenderPanelSlot[];
} {
  if (!node.slots) return {};

  const slots: {
    default?: () => DomRenderResult[];
    media?: () => DomRenderResult[];
    panels?: RenderPanelSlot[];
  } = {};

  if (node.type === "Tabs" && isPanelSlotArray(node.slots.panels)) {
    slots.panels = node.slots.panels;
  }

  for (const [slotName, slotValue] of Object.entries(node.slots)) {
    if (slotName === "panels") continue;
    if (!isRenderNodeArray(slotValue)) continue;
    if (slotName === "default" || slotName === "media") {
      slots[slotName] = () => renderNodeArray(slotValue, context);
    }
  }

  return slots;
}

function renderNodeArray(
  nodes: RenderNode[],
  context: DomRenderContext,
): DomRenderResult[] {
  return nodes
    .map((child) => renderDomNode(child, context))
    .filter((child): child is DomRenderResult => child !== null);
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

function toRendererError(error: unknown): {
  code: string;
  message: string;
  path?: string;
} {
  return {
    code:
      error instanceof Error && "code" in error
        ? String((error as { code: unknown }).code)
        : "SCRIPT_EXECUTION_ERROR",
    message: error instanceof Error ? error.message : "动作脚本执行失败。",
  };
}
