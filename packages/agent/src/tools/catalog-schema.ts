/**
 * Basic Catalog 组件定义与查询 API。
 *
 * 职责：
 * - 从 shared Basic Catalog Definition 读取当前正式组件集合
 * - 提供组件定义查询、摘要生成、详情格式化的公共 API
 * - 支撑渐进式组件披露流程中按需注入组件详情的功能
 *
 * 不负责：维护第二份 Catalog 字段事实源、执行 A2UI Schema 校验。
 */

import {
  BASIC_CATALOG_DEFINITION,
  BASIC_CATALOG_ID,
  type CatalogComponentDefinition,
  type CatalogComponentProperty,
  type CatalogDefinition,
} from "@a2ui-platform/shared";

type SharedComponentDefinition =
  (typeof BASIC_CATALOG_DEFINITION.components)[number];

function toCatalogComponentDefinition(
  componentDef: SharedComponentDefinition,
): CatalogComponentDefinition {
  return {
    component: componentDef.component,
    description: componentDef.description,
    properties: componentDef.fields.map((field) => ({
      name: field.name,
      type: field.type,
      required: field.required ?? false,
      description: field.description,
      ...(field.values ? { values: field.values } : {}),
    })) as CatalogComponentProperty[],
  };
}

/**
 * 获取所有 Basic Catalog 组件的定义。
 * 返回面向 Agent 披露和历史调用方兼容的组件定义结构。
 */
export function getCatalogComponents(): CatalogComponentDefinition[] {
  return BASIC_CATALOG_DEFINITION.components.map(toCatalogComponentDefinition);
}

/**
 * 返回用于首轮 Prompt 的组件摘要。
 * 只暴露组件名称和一句话用途，不包含字段清单。
 */
export function getCatalogComponentSummaries(): Array<{
  component: string;
  description: string;
}> {
  return BASIC_CATALOG_DEFINITION.components.map((def) => ({
    component: def.component,
    description: def.description,
  }));
}

/**
 * 将组件摘要格式化为 Prompt 文本。
 */
export function formatCatalogComponentSummaries(): string {
  return getCatalogComponentSummaries()
    .map((summary) => `- ${summary.component}: ${summary.description}`)
    .join("\n");
}

export function getCatalogComponentNames(): string[] {
  return BASIC_CATALOG_DEFINITION.components.map((d) => d.component);
}

/**
 * 同 getCatalogComponentNames()，兼容旧命名。
 */
export function getAllCatalogComponentNames(): string[] {
  return getCatalogComponentNames();
}

/**
 * 根据名称获取单个组件的定义。
 */
export function getComponentDef(
  name: string,
): CatalogComponentDefinition | undefined {
  const found = BASIC_CATALOG_DEFINITION.components.find(
    (d) => d.component === name,
  );
  return found ? toCatalogComponentDefinition(found) : undefined;
}

/**
 * 将按需请求的组件详情格式化为 Prompt 文本。
 * 该函数故意通过 getComponentDef() 查询，作为渐进式披露的单组件入口。
 */
export function formatCatalogComponentDetails(names: string[]): string {
  const uniqueNames = Array.from(new Set(names));
  const sections: string[] = [];

  for (const name of uniqueNames) {
    const def = getComponentDef(name);
    if (!def) continue;

    sections.push(`### ${def.component}`);
    if (def.description) {
      sections.push(`用途：${def.description}`);
    }
    sections.push("字段：");
    sections.push("- id: string，必填，组件在当前 surface 内的唯一 ID。");
    sections.push("- component: string，必填，固定为该组件名称。");

    for (const property of def.properties) {
      const required = property.required ? "，必填" : "，可选";
      const values =
        property.values && property.values.length > 0
          ? `，可选值：${property.values.join(" | ")}`
          : "";
      const description = property.description
        ? `，说明：${property.description}`
        : "";
      sections.push(
        `- ${property.name}: ${property.type}${required}${values}${description}`,
      );
    }

    sections.push("");
  }

  return sections.join("\n").trim();
}

/**
 * 返回完整的 Basic Catalog 定义，包含 catalogId、version 和所有组件定义。
 */
export function getBasicCatalogDefinition(): CatalogDefinition {
  return {
    catalogId: BASIC_CATALOG_ID,
    version: BASIC_CATALOG_DEFINITION.version,
    components: getCatalogComponents(),
  };
}
