/**
 * RenderNode model binding 解析。
 *
 * 职责：
 * - 将 Catalog model 字段映射为普通组件 modelValue
 * - 仅在 A2UI 值为 `{ path }` 时生成写回事件意图
 *
 * 不负责：普通 props 解析或执行 Vue emit。
 */

import type { BasicCatalogComponentDefinition } from "@a2ui-platform/shared";
import { DataContext } from "../core/data-context";
import type { ComponentModel } from "../core/component-model";
import { isDynamicRef } from "../core/dynamic-value";
import type { RenderEventIntent } from "./render-node";
import type { RenderContext } from "./render-context";
import { resolveRenderValue } from "./resolve-dynamic";

export function resolveModelBindings(input: {
  componentModel: ComponentModel;
  componentDef: BasicCatalogComponentDefinition;
  dataContext: DataContext;
  renderContext: RenderContext;
  props: Record<string, unknown>;
  events: Record<string, RenderEventIntent>;
}): void {
  for (const field of input.componentDef.fields) {
    if (field.role !== "model") continue;

    const raw = input.componentModel.getProperty(field.name);
    if (raw === undefined) continue;

    const targetProp = field.targetProp ?? "modelValue";
    const updateEvent = field.updateEvent ?? `update:${targetProp}`;
    input.props[targetProp] = resolveRenderValue({
      value: raw,
      dataContext: input.dataContext,
      renderContext: input.renderContext,
      sourceComponentId: input.componentModel.id,
    });

    if (isDynamicRef(raw)) {
      input.events[updateEvent] = {
        kind: "model-set",
        path: input.dataContext.resolvePath(raw.path),
      };
    }
  }
}
