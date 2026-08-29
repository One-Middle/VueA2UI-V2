/**
 * Basic Catalog Definition 类型。
 *
 * 职责：
 * - 定义 Basic Catalog 单一事实源的数据结构
 * - 描述字段 schema、字段语义和 Renderer 映射元信息
 *
 * 不负责：具体 JSON Schema 生成、Renderer 渲染或 Agent prompt 格式化。
 */

export type CatalogFieldRole =
  "prop" | "display" | "visual" | "state" | "model" | "action" | "slot";

export type CatalogFieldType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "stringOrBinding"
  | "numberOrBinding"
  | "booleanOrBinding"
  | "choiceValueOrBinding"
  | "gridColumns"
  | "componentRef"
  | "staticOrDynamicChildren"
  | "action"
  | "controlledStyle"
  | "tabItems"
  | "choiceOptions"
  | "sliderMarks";

export interface CatalogFieldDefinition {
  readonly name: string;
  readonly role: CatalogFieldRole;
  readonly type: CatalogFieldType;
  readonly required?: boolean;
  readonly description?: string;
  readonly values?: readonly string[];
  readonly targetProp?: string;
  readonly updateEvent?: string;
  readonly targetEvent?: string;
}

export type CatalogSlotRule =
  | {
      readonly mode: "component";
      readonly source: string;
      readonly target: string;
    }
  | {
      readonly mode: "componentList";
      readonly source: string;
      readonly target: string;
    }
  | {
      readonly mode: "repeatedComponent";
      readonly source: string;
      readonly target: string;
      readonly pathField: string;
      readonly componentIdField: string;
    }
  | {
      readonly mode: "tabPanels";
      readonly source: string;
      readonly target: "panels";
      readonly titleField: string;
      readonly childField: string;
    };

export interface BasicCatalogComponentDefinition {
  readonly component: string;
  readonly description: string;
  readonly fields: readonly CatalogFieldDefinition[];
  readonly slots?: readonly CatalogSlotRule[];
}

export interface BasicCatalogDefinition {
  readonly catalogId: string;
  readonly version: string;
  readonly components: readonly BasicCatalogComponentDefinition[];
}
