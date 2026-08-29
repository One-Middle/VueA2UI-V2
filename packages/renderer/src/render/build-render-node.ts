/**
 * RenderNode tree 构建入口。
 *
 * 职责：
 * - 从 SurfaceModel 和 ComponentModel 构建 RenderNode tree
 * - 串联 props/model/action/slots resolver
 * - 返回可订阅依赖集合
 *
 * 不负责：创建 Vue VNode 或同步 DataModel 订阅副作用。
 */

import { getBasicCatalogComponentDefinition } from "@a2ui-platform/shared";
import { DataContext } from "../core/data-context";
import type { SurfaceModel } from "../core/surface-model";
import { RenderDependencyCollector } from "./dependency-collector";
import type {
  BuildRenderTreeResult,
  RenderEventIntent,
  RenderNode,
} from "./render-node";
import type { RenderContext } from "./render-context";
import { resolveActionBindings } from "./resolve-action-bindings";
import { resolveModelBindings } from "./resolve-model-bindings";
import { resolveProps } from "./resolve-props";
import { resolveSlots, resolveTabSlotData } from "./resolve-slots";

export function buildRenderTree(input: {
  surfaceModel: SurfaceModel;
  rootComponentId?: string;
  basePath?: string;
  dispatchError: RenderContext["dispatchError"];
  emitAction: RenderContext["emitAction"];
  runActionScript: RenderContext["runActionScript"];
}): BuildRenderTreeResult {
  const dependencies = new RenderDependencyCollector();
  const context: RenderContext = {
    surfaceModel: input.surfaceModel,
    surfaceId: input.surfaceModel.surfaceId,
    basePath: input.basePath ?? "/",
    dependencies,
    dispatchError: input.dispatchError,
    emitAction: input.emitAction,
    runActionScript: input.runActionScript,
  };

  const node = buildRenderNode({
    componentId: input.rootComponentId ?? "root",
    basePath: input.basePath ?? "/",
    context,
  });

  return {
    node,
    dependencies: dependencies.toArray(),
  };
}

export function buildRenderNode(input: {
  componentId: string;
  basePath: string;
  context: RenderContext;
}): RenderNode | null {
  const componentModel = input.context.surfaceModel.components.get(
    input.componentId,
  );
  if (!componentModel) {
    input.context.dispatchError({
      code: "COMPONENT_NOT_FOUND",
      message: `组件未找到：${input.componentId}`,
      sourceComponentId: input.componentId,
    });
    return null;
  }

  const componentDef = getBasicCatalogComponentDefinition(
    componentModel.componentType,
  );
  if (!componentDef) {
    input.context.dispatchError({
      code: "COMPONENT_TYPE_UNREGISTERED",
      message: `未注册的组件类型：${componentModel.componentType}`,
      sourceComponentId: componentModel.id,
    });
    return {
      id: componentModel.id,
      type: "__fallback",
      props: { message: `未注册的组件类型：${componentModel.componentType}` },
      meta: {
        surfaceId: input.context.surfaceId,
        componentId: componentModel.id,
        basePath: input.basePath,
      },
    };
  }

  const dataContext = new DataContext(
    input.context.surfaceModel.dataModel,
    input.basePath,
  );
  const props = resolveProps({
    componentModel,
    componentDef,
    dataContext,
    renderContext: input.context,
  });
  const events: Record<string, RenderEventIntent> = {};

  resolveModelBindings({
    componentModel,
    componentDef,
    dataContext,
    renderContext: input.context,
    props,
    events,
  });
  resolveActionBindings({
    componentModel,
    componentDef,
    dataContext,
    renderContext: input.context,
    events,
  });

  const slots = resolveSlots({
    componentModel,
    componentDef,
    dataContext,
    renderContext: input.context,
    props,
    buildChild: (componentId, basePath) =>
      buildRenderNode({ componentId, basePath, context: input.context }),
  });

  if (componentModel.componentType === "Tabs" && !props.items) {
    const tabData = resolveTabSlotData({
      componentModel,
      dataContext,
      renderContext: input.context,
      sourceComponentId: componentModel.id,
      buildChild: (componentId, basePath) =>
        buildRenderNode({ componentId, basePath, context: input.context }),
    });
    if (tabData.items.length > 0) {
      props.items = tabData.items;
      slots.panels = tabData.panels;
    }
  }

  return {
    id: componentModel.id,
    type: componentModel.componentType,
    props,
    ...(Object.keys(events).length > 0 ? { events } : {}),
    ...(Object.keys(slots).length > 0 ? { slots } : {}),
    meta: {
      surfaceId: input.context.surfaceId,
      componentId: componentModel.id,
      basePath: input.basePath,
    },
  };
}
