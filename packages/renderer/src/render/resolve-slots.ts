/**
 * RenderNode slot 解析。
 *
 * 职责：
 * - 根据 Catalog slot rule 解析 child/children/List/Tabs 结构字段
 * - 将 A2UI componentId 引用递归构建为 RenderNode 内容区域
 *
 * 不负责：创建 Vue runtime slots 或让普通 UI 组件读取 A2UI 结构字段。
 */

import type { BasicCatalogComponentDefinition } from "@a2ui-platform/shared";
import { DataContext } from "../core/data-context";
import type { ComponentModel } from "../core/component-model";
import type {
  RenderNode,
  RenderPanelSlot,
  RenderSlotValue,
} from "./render-node";
import type { RenderContext } from "./render-context";
import { resolveRenderValue } from "./resolve-dynamic";

export type BuildChildRenderNode = (
  componentId: string,
  basePath: string,
) => RenderNode | null;

export function resolveSlots(input: {
  componentModel: ComponentModel;
  componentDef: BasicCatalogComponentDefinition;
  dataContext: DataContext;
  renderContext: RenderContext;
  props: Record<string, unknown>;
  buildChild: BuildChildRenderNode;
}): Record<string, RenderSlotValue> {
  const slots: Record<string, RenderSlotValue> = {};
  for (const rule of input.componentDef.slots ?? []) {
    if (rule.mode === "component") {
      const childId = resolveComponentId(
        input.componentModel.getProperty(rule.source),
        input.dataContext,
        input.renderContext,
        input.componentModel.id,
      );
      if (childId) {
        appendNodes(slots, rule.target, [
          input.buildChild(childId, input.dataContext.basePath),
        ]);
      }
      continue;
    }

    if (rule.mode === "componentList") {
      const raw = input.componentModel.getProperty(rule.source);
      const children = Array.isArray(raw) ? raw : [];
      const nodes = children
        .filter((child): child is string => typeof child === "string")
        .map((childId) =>
          input.buildChild(childId, input.dataContext.basePath),
        );
      appendNodes(slots, rule.target, nodes);
      continue;
    }

    if (rule.mode === "repeatedComponent") {
      const repeatedNodes = resolveRepeatedNodes(input, rule.source);
      if (repeatedNodes.length > 0) {
        slots[rule.target] = repeatedNodes;
      }
      continue;
    }

    if (rule.mode === "tabPanels") {
      const resolved = resolveTabPanels(
        input,
        rule.source,
        rule.titleField,
        rule.childField,
      );
      if (resolved.items.length > 0) {
        slots[rule.target] = resolved.panels;
        input.props.items = resolved.items;
      }
    }
  }

  return slots;
}

export function resolveTabSlotData(input: {
  componentModel: ComponentModel;
  dataContext: DataContext;
  renderContext: RenderContext;
  sourceComponentId: string;
  buildChild: BuildChildRenderNode;
}): { items: Array<Record<string, unknown>>; panels: RenderPanelSlot[] } {
  return resolveTabPanels(input, "tabItems", "title", "child");
}

function resolveRepeatedNodes(
  input: {
    componentModel: ComponentModel;
    dataContext: DataContext;
    renderContext: RenderContext;
    buildChild: BuildChildRenderNode;
  },
  source: string,
): RenderNode[] {
  const raw = input.componentModel.getProperty(source);
  if (!Array.isArray(raw)) return [];

  const repeated = raw.find(
    (item): item is { path: string; componentId: string } =>
      Boolean(item) &&
      typeof item === "object" &&
      !Array.isArray(item) &&
      typeof (item as Record<string, unknown>).path === "string" &&
      typeof (item as Record<string, unknown>).componentId === "string",
  );
  if (!repeated) return [];

  input.renderContext.dependencies.addPath(repeated.path, input.dataContext);
  const data = resolveRenderValue({
    value: { path: repeated.path },
    dataContext: input.dataContext,
    renderContext: input.renderContext,
    sourceComponentId: input.componentModel.id,
  });
  if (!Array.isArray(data)) return [];

  const listBasePath = input.dataContext.resolvePath(repeated.path);
  return data
    .map((_, index) =>
      input.buildChild(
        repeated.componentId,
        appendPathSegment(listBasePath, String(index)),
      ),
    )
    .filter((node): node is RenderNode => node !== null);
}

function resolveTabPanels(
  input: {
    componentModel: ComponentModel;
    dataContext: DataContext;
    renderContext: RenderContext;
    sourceComponentId?: string;
    buildChild: BuildChildRenderNode;
  },
  source: string,
  titleField: string,
  childField: string,
): { items: Array<Record<string, unknown>>; panels: RenderPanelSlot[] } {
  const raw = input.componentModel.getProperty(source);
  const resolved = resolveRenderValue({
    value: raw,
    dataContext: input.dataContext,
    renderContext: input.renderContext,
    sourceComponentId: input.sourceComponentId ?? input.componentModel.id,
  });
  if (!Array.isArray(resolved)) {
    return { items: [], panels: [] };
  }

  const items: Array<Record<string, unknown>> = [];
  const panels: RenderPanelSlot[] = [];
  resolved.forEach((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return;
    const record = item as Record<string, unknown>;
    const childId = resolveComponentId(
      record[childField],
      input.dataContext,
      input.renderContext,
      input.componentModel.id,
    );
    if (!childId) return;
    const key = typeof record.key === "string" ? record.key : `tab-${index}`;
    const title =
      typeof record[titleField] === "string" ? record[titleField] : key;
    const disabled =
      typeof record.disabled === "boolean" ? record.disabled : false;
    const node = input.buildChild(childId, input.dataContext.basePath);
    items.push({ key, title, disabled });
    panels.push({ key, nodes: node ? [node] : [] });
  });

  return { items, panels };
}

function resolveComponentId(
  raw: unknown,
  dataContext: DataContext,
  renderContext: RenderContext,
  sourceComponentId: string,
): string | null {
  const resolved = resolveRenderValue({
    value: raw,
    dataContext,
    renderContext,
    sourceComponentId,
  });
  return typeof resolved === "string" ? resolved : null;
}

function appendNodes(
  slots: Record<string, RenderSlotValue>,
  target: string,
  nodes: Array<RenderNode | null>,
): void {
  const cleanNodes = nodes.filter((node): node is RenderNode => node !== null);
  if (cleanNodes.length === 0) return;
  const existing = slots[target];
  if (Array.isArray(existing)) {
    slots[target] = [...existing, ...cleanNodes] as RenderNode[];
    return;
  }
  slots[target] = cleanNodes;
}

function appendPathSegment(basePath: string, segment: string): string {
  return basePath === "/" ? `/${segment}` : `${basePath}/${segment}`;
}
