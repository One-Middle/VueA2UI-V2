/**
 * RenderNode 普通 props 解析。
 *
 * 职责：
 * - 处理 Catalog 中 prop/display/visual/state 字段
 * - 将 A2UI 字段值解析并映射为普通 UI 组件 props
 *
 * 不负责：model 写回、action 事件意图或 slot 子树构建。
 */

import type { BasicCatalogComponentDefinition } from "@a2ui-platform/shared";
import { DataContext } from "../core/data-context";
import type { ComponentModel } from "../core/component-model";
import type { RenderContext } from "./render-context";
import { resolveRenderValue } from "./resolve-dynamic";
import { resolveControlledStyle } from "./resolve-style";

const PROP_ROLES = new Set(["prop", "display", "visual", "state"]);

export function resolveProps(input: {
  componentModel: ComponentModel;
  componentDef: BasicCatalogComponentDefinition;
  dataContext: DataContext;
  renderContext: RenderContext;
}): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  for (const field of input.componentDef.fields) {
    if (!PROP_ROLES.has(field.role)) continue;

    const raw = input.componentModel.getProperty(field.name);
    if (raw === undefined) continue;

    const targetProp = field.targetProp ?? field.name;
    const resolved =
      field.type === "controlledStyle"
        ? resolveControlledStyle({
            value: raw,
            dataContext: input.dataContext,
            renderContext: input.renderContext,
            sourceComponentId: input.componentModel.id,
          })
        : resolveRenderValue({
            value: raw,
            dataContext: input.dataContext,
            renderContext: input.renderContext,
            sourceComponentId: input.componentModel.id,
          });

    if (resolved !== undefined) {
      props[targetProp] = resolved;
    }
  }

  return props;
}
