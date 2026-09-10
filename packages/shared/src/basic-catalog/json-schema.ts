/**
 * Basic Catalog JSON Schema 生成器。
 *
 * 职责：
 * - 从 TypeScript Catalog Definition 派生 Ajv 可用的 JSON Schema
 * - 保持组件字段合法性与 Catalog 单一事实源一致
 *
 * 不负责：执行 Ajv 校验或格式化 Agent prompt。
 */

import { BASIC_CATALOG_DEFINITION } from "./catalog-definition";
import type {
  BasicCatalogComponentDefinition,
  CatalogFieldDefinition,
} from "./types";

type JsonSchema = Record<string, unknown>;

export function getBasicCatalogJsonSchema(): JsonSchema {
  const definitions: Record<string, JsonSchema> = {};
  for (const componentDef of BASIC_CATALOG_DEFINITION.components) {
    definitions[componentDef.component] = componentToSchema(componentDef);
  }

  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: BASIC_CATALOG_DEFINITION.catalogId,
    title: "A2UI Basic Catalog Component Schema",
    description: "Basic Catalog 组件属性 JSON Schema 定义",
    $defs: createSharedDefs(),
    definitions,
  };
}

function componentToSchema(
  componentDef: BasicCatalogComponentDefinition,
): JsonSchema {
  const properties: Record<string, JsonSchema> = {
    id: { type: "string" },
    component: { type: "string", const: componentDef.component },
  };
  const required = ["id", "component"];

  for (const field of componentDef.fields) {
    properties[field.name] = fieldToSchema(field);
    if (field.required) {
      required.push(field.name);
    }
  }

  return {
    type: "object",
    required,
    properties,
    additionalProperties: false,
  };
}

function fieldToSchema(field: CatalogFieldDefinition): JsonSchema {
  if (field.values && field.values.length > 0) {
    return { type: "string", enum: [...field.values] };
  }

  switch (field.type) {
    case "string":
      return { type: "string" };
    case "number":
      return { type: "number" };
    case "boolean":
      return { type: "boolean" };
    case "object":
      return { type: "object" };
    case "array":
      return { type: "array" };
    case "stringOrBinding":
      return { $ref: "#/$defs/stringOrBinding" };
    case "numberOrBinding":
      return { $ref: "#/$defs/numberOrBinding" };
    case "booleanOrBinding":
      return { $ref: "#/$defs/booleanOrBinding" };
    case "choiceValueOrBinding":
      return { $ref: "#/$defs/choiceValueOrBinding" };
    case "gridColumns":
      return { $ref: "#/$defs/gridColumns" };
    case "componentRef":
      return { $ref: "#/$defs/componentRef" };
    case "staticOrDynamicChildren":
      return { $ref: "#/$defs/staticOrDynamicChildren" };
    case "action":
      return { $ref: "#/$defs/action" };
    case "controlledStyle":
      return { $ref: "#/$defs/controlledStyle" };
    case "tabItems":
      return { $ref: "#/$defs/tabItems" };
    case "choiceOptions":
      return { $ref: "#/$defs/choiceOptions" };
    case "sliderMarks":
      return { $ref: "#/$defs/sliderMarks" };
    default:
      return {};
  }
}

function createSharedDefs(): Record<string, JsonSchema> {
  return {
    dataBinding: {
      type: "object",
      required: ["path"],
      properties: { path: { type: "string" } },
      additionalProperties: false,
    },
    propertyScript: {
      type: "object",
      required: ["script"],
      properties: {
        script: {
          type: "object",
          required: ["code", "deps"],
          properties: {
            code: { type: "string", minLength: 1, maxLength: 2000 },
            deps: {
              type: "array",
              minItems: 1,
              maxItems: 32,
              items: { type: "string" },
            },
            fallback: {},
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
    stringOrBinding: {
      oneOf: [
        { type: "string" },
        { $ref: "#/$defs/dataBinding" },
        { $ref: "#/$defs/propertyScript" },
      ],
    },
    numberOrBinding: {
      oneOf: [
        { type: "number" },
        { $ref: "#/$defs/dataBinding" },
        { $ref: "#/$defs/propertyScript" },
      ],
    },
    booleanOrBinding: {
      oneOf: [
        { type: "boolean" },
        { $ref: "#/$defs/dataBinding" },
        { $ref: "#/$defs/propertyScript" },
      ],
    },
    choiceValueOrBinding: {
      oneOf: [
        { type: "string" },
        { type: "number" },
        { type: "boolean" },
        { $ref: "#/$defs/dataBinding" },
        { $ref: "#/$defs/propertyScript" },
      ],
    },
    gridColumns: {
      oneOf: [
        { type: "number", minimum: 1 },
        { type: "string", enum: ["auto"] },
        { $ref: "#/$defs/dataBinding" },
        { $ref: "#/$defs/propertyScript" },
      ],
    },
    componentRef: {
      oneOf: [{ type: "string" }, { type: "object" }],
    },
    staticOrDynamicChildren: {
      type: "array",
      items: {
        oneOf: [
          { type: "string" },
          {
            type: "object",
            required: ["path", "componentId"],
            properties: {
              path: { type: "string" },
              componentId: { type: "string" },
            },
            additionalProperties: false,
          },
        ],
      },
    },
    controlledStyle: {
      type: "object",
      properties: {
        width: { $ref: "#/$defs/styleStringOrScript" },
        height: { $ref: "#/$defs/styleStringOrScript" },
        minWidth: { $ref: "#/$defs/styleStringOrScript" },
        maxWidth: { $ref: "#/$defs/styleStringOrScript" },
        minHeight: { $ref: "#/$defs/styleStringOrScript" },
        maxHeight: { $ref: "#/$defs/styleStringOrScript" },
        padding: { $ref: "#/$defs/styleStringOrScript" },
        paddingX: { $ref: "#/$defs/styleStringOrScript" },
        paddingY: { $ref: "#/$defs/styleStringOrScript" },
        margin: { $ref: "#/$defs/styleStringOrScript" },
        marginX: { $ref: "#/$defs/styleStringOrScript" },
        marginY: { $ref: "#/$defs/styleStringOrScript" },
        gap: { $ref: "#/$defs/styleStringOrScript" },
        color: { $ref: "#/$defs/styleStringOrScript" },
        backgroundColor: { $ref: "#/$defs/styleStringOrScript" },
        borderColor: { $ref: "#/$defs/styleStringOrScript" },
        borderWidth: { $ref: "#/$defs/styleStringOrScript" },
        borderRadius: { $ref: "#/$defs/styleStringOrScript" },
        fontSize: { $ref: "#/$defs/styleStringOrScript" },
        fontWeight: { $ref: "#/$defs/styleStringNumberOrScript" },
        lineHeight: { $ref: "#/$defs/styleStringNumberOrScript" },
        textAlign: { $ref: "#/$defs/styleStringOrScript" },
        alignSelf: { $ref: "#/$defs/styleStringOrScript" },
        justifySelf: { $ref: "#/$defs/styleStringOrScript" },
        shadow: {
          oneOf: [
            { type: "string", enum: ["none", "xs", "sm", "md", "lg"] },
            { $ref: "#/$defs/propertyScript" },
          ],
        },
        opacity: {
          oneOf: [
            { type: "number", minimum: 0, maximum: 1 },
            { type: "string" },
            { $ref: "#/$defs/propertyScript" },
          ],
        },
        overflow: { $ref: "#/$defs/styleStringOrScript" },
        flex: { $ref: "#/$defs/styleStringNumberOrScript" },
      },
      additionalProperties: false,
    },
    styleStringOrScript: {
      oneOf: [{ type: "string" }, { $ref: "#/$defs/propertyScript" }],
    },
    styleStringNumberOrScript: {
      oneOf: [
        { type: "string" },
        { type: "number" },
        { $ref: "#/$defs/propertyScript" },
      ],
    },
    action: {
      type: "object",
      oneOf: [{ required: ["event"] }, { required: ["script"] }],
      properties: {
        event: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string" },
            context: { type: "object" },
          },
          additionalProperties: false,
        },
        script: {
          type: "object",
          required: ["code"],
          properties: {
            code: { type: "string", minLength: 1, maxLength: 2000 },
            deps: {
              type: "array",
              maxItems: 32,
              items: { type: "string" },
            },
            context: { type: "object" },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
    tabItems: {
      type: "array",
      items: {
        type: "object",
        required: ["title", "child"],
        properties: {
          key: { type: "string" },
          title: { type: "string" },
          disabled: { type: "boolean" },
          child: { $ref: "#/$defs/componentRef" },
        },
        additionalProperties: false,
      },
    },
    choiceOptions: {
      type: "array",
      items: {
        type: "object",
        required: ["label", "value"],
        properties: {
          label: { type: "string" },
          value: {
            oneOf: [
              { type: "string" },
              { type: "number" },
              { type: "boolean" },
            ],
          },
        },
        additionalProperties: false,
      },
    },
    sliderMarks: {
      type: "array",
      items: {
        type: "object",
        required: ["value", "label"],
        properties: {
          value: { type: "number" },
          label: { type: "string" },
        },
        additionalProperties: false,
      },
    },
  };
}
