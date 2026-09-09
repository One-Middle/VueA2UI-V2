/**
 * RenderNode action binding 解析。
 *
 * 职责：
 * - 保持现有 A2UI action 协议
 * - 将 Catalog 中明确声明的 action 字段映射为普通组件事件意图
 *
 * 不负责：扩大 action 可用组件范围或执行 action.script。
 */

import type { BasicCatalogComponentDefinition } from "@a2ui-platform/shared";
import { DataContext } from "../core/data-context";
import type { ComponentModel } from "../core/component-model";
import { resolveActionContext, resolveComponentAction } from "../core/action";
import type { RenderContext } from "./render-context";
import type { RenderEventIntent } from "./render-node";
import { resolveRenderValue } from "./resolve-dynamic";

export function resolveActionBindings(input: {
  componentModel: ComponentModel;
  componentDef: BasicCatalogComponentDefinition;
  dataContext: DataContext;
  renderContext: RenderContext;
  events: Record<string, RenderEventIntent>;
}): void {
  for (const field of input.componentDef.fields) {
    if (field.role !== "action") continue;

    const raw = input.componentModel.getProperty(field.name);
    const targetEvent = field.targetEvent;
    if (raw === undefined || !targetEvent) continue;

    const action = resolveComponentAction(raw, (value) =>
      resolveRenderValue({
        value,
        dataContext: input.dataContext,
        renderContext: input.renderContext,
        sourceComponentId: input.componentModel.id,
      }),
    );
    if (!action || action.kind === "functionCall") continue;

    if (action.kind === "event") {
      input.events[targetEvent] = {
        kind: "action-event",
        name: action.name,
        context: resolveActionContext(action.context, (value) =>
          resolveRenderValue({
            value,
            dataContext: input.dataContext,
            renderContext: input.renderContext,
            sourceComponentId: input.componentModel.id,
          }),
        ),
      };
      continue;
    }

    input.events[targetEvent] = {
      kind: "action-script",
      action,
      context: resolveActionContext(action.script.context ?? {}, (value) =>
        resolveRenderValue({
          value,
          dataContext: input.dataContext,
          renderContext: input.renderContext,
          sourceComponentId: input.componentModel.id,
        }),
      ),
    };
  }
}
