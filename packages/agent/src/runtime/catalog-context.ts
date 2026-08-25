/**
 * Workflow ReAct 运行期 Catalog Context。
 *
 * 职责：
 * - 记录本次 workflow task 已披露的 Basic Catalog 组件详情。
 * - 为 prompt 生成面向修复的组件字段约束文本。
 *
 * 不负责：
 * - 持久化跨 task 状态；当前 Catalog 详情可由模型按需重新请求。
 * - 执行 A2UI 校验；校验仍由 validateA2UI 负责。
 */

import type { CatalogComponentDefinition, CatalogComponentProperty } from "@a2ui-platform/shared";
import { getComponentDef } from "../tools/catalog-schema.js";

/** 单次 workflow task 内的组件规范上下文。 */
export interface CatalogContext {
  /** key 为组件名称，Map 保留首次披露顺序。 */
  components: Map<string, CatalogComponentDefinition>;
}

/** 创建空 Catalog Context。 */
export function createCatalogContext(): CatalogContext {
  return { components: new Map() };
}

/** 判断组件详情是否已经进入 Catalog Context。 */
export function hasCatalogComponent(context: CatalogContext, name: string): boolean {
  return context.components.has(name);
}

/**
 * 把组件详情写入 Catalog Context。
 *
 * @returns 本次实际新增的组件名称列表。
 */
export function recordCatalogComponents(context: CatalogContext, names: string[]): string[] {
  const newlyRecorded: string[] = [];
  for (const name of Array.from(new Set(names))) {
    if (context.components.has(name)) {
      continue;
    }
    const def = getComponentDef(name);
    if (!def) {
      continue;
    }
    context.components.set(name, def);
    newlyRecorded.push(name);
  }
  return newlyRecorded;
}

/** 按披露顺序列出已披露组件名称。 */
export function listCatalogComponentNames(context: CatalogContext): string[] {
  return [...context.components.keys()];
}

/**
 * 渲染 Catalog Context prompt 分区。
 *
 * 文本刻意以「允许 / 禁止 / 修复提示」组织，让模型在校验失败后更容易局部修复。
 */
export function formatCatalogContext(context: CatalogContext): string {
  if (context.components.size === 0) {
    return "";
  }

  const sections: string[] = ["## Catalog Context（已披露组件规范）"];
  for (const def of context.components.values()) {
    sections.push(`### ${def.component}`);
    if (def.description) {
      sections.push(`用途：${def.description}`);
    }
    sections.push("允许字段：");
    sections.push("- id: string，必填。");
    sections.push(`- component: "${def.component}"，必填。`);

    for (const property of def.properties) {
      sections.push(`- ${formatProperty(property)}`);
    }

    const forbidden = commonForbiddenFields(def.component);
    if (forbidden.length > 0) {
      sections.push(`禁止字段：${forbidden.join("、")}。`);
    }

    const hints = commonRepairHints(def.component);
    if (hints.length > 0) {
      sections.push("常见修复：");
      for (const hint of hints) {
        sections.push(`- ${hint}`);
      }
    }
    sections.push("");
  }

  return sections.join("\n").trim();
}

function formatProperty(property: CatalogComponentProperty): string {
  const required = property.required ? "，必填" : "，可选";
  const values = property.values?.length ? `，可选值：${property.values.join(" | ")}` : "";
  const description = property.description ? `，说明：${property.description}` : "";
  return `${property.name}: ${property.type}${required}${values}${description}`;
}

function commonForbiddenFields(component: string): string[] {
  switch (component) {
    case "Text":
      return ["label", "value", "checked", "placeholder", "children", "child"];
    case "TextField":
      return ["value", "checked", "children", "child", "onChange", "onInput"];
    case "CheckBox":
      return ["text", "checked", "placeholder", "readonly", "children", "child", "onChange"];
    case "Card":
      return ["children"];
    case "Button":
      return ["onClick", "onChange", "href", "url"];
    default:
      return [];
  }
}

function commonRepairHints(component: string): string[] {
  switch (component) {
    case "Text":
      return [
        '展示文案必须使用 text；如果使用数据绑定，只写 { "path": "title" }，不要在同一个对象里混入 fallback。',
        "padding、fontWeight、color 等视觉字段必须放入 style 对象。",
      ];
    case "TextField":
      return [
        'TextField 的输入值字段是 text，不使用 value；例如 { "text": { "path": "/todo/draft" } }。',
        "输入框标签使用 label，占位文案使用 placeholder。",
      ];
    case "CheckBox":
      return [
        '勾选状态使用 boolean value 或 { "path": "done" }，不要使用 text / checked。',
        "CheckBox 的 value 表示是否选中，label 表示旁边显示的文字。",
      ];
    case "Card":
      return ["Card 只能通过 child 指向一个子组件；多个内容先放入 Column 或 Row。"];
    default:
      return [];
  }
}
