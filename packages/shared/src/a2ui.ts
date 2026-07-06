export const A2UI_VERSION = "v0.9" as const;

export type A2UIVersion = typeof A2UI_VERSION;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export interface A2UIBaseMessage {
  version: A2UIVersion;
}

export interface CreateSurfacePayload {
  surfaceId: string;
  catalogId: string;
  theme?: JsonObject;
  sendDataModel?: boolean;
}

export interface UpdateComponentsPayload {
  surfaceId: string;
  components: A2UIComponent[];
}

export interface UpdateDataModelPayload {
  surfaceId: string;
  path?: string;
  value?: JsonValue;
}

export interface DeleteSurfacePayload {
  surfaceId: string;
}

export type A2UIServerMessage =
  | (A2UIBaseMessage & { createSurface: CreateSurfacePayload })
  | (A2UIBaseMessage & { updateComponents: UpdateComponentsPayload })
  | (A2UIBaseMessage & { updateDataModel: UpdateDataModelPayload })
  | (A2UIBaseMessage & { deleteSurface: DeleteSurfacePayload });

export type A2UIComponent = {
  id: string;
  component: string;
  [property: string]: JsonValue | undefined;
};

export interface A2UIActionPayload {
  name: string;
  surfaceId: string;
  sourceComponentId: string;
  timestamp: string;
  context: JsonObject;
}

export interface A2UIErrorPayload {
  code: string;
  surfaceId: string;
  path?: string;
  message: string;
  [property: string]: JsonValue | undefined;
}

export type A2UIClientMessage =
  | (A2UIBaseMessage & { action: A2UIActionPayload })
  | (A2UIBaseMessage & { error: A2UIErrorPayload });

export interface SurfaceSnapshotData {
  version: A2UIVersion;
  surfaces: Record<string, SurfaceState>;
}

// ─── Catalog ─────────────────────────────────────────────

/** Basic Catalog 中包含的所有组件名称。 */
export const BASIC_CATALOG_COMPONENTS = [
  "Text",
  "Image",
  "Icon",
  "Video",
  "AudioPlayer",
  "Divider",
  "Row",
  "Column",
  "List",
  "Card",
  "Tabs",
  "Modal",
  "Button",
  "TextField",
  "CheckBox",
  "ChoicePicker",
  "Slider",
  "DateTimeInput",
] as const;

/** Basic Catalog 组件名称枚举。 */
export type BasicCatalogComponent = (typeof BASIC_CATALOG_COMPONENTS)[number];

/** 单个组件的属性定义。 */
export interface CatalogComponentProperty {
  /** 属性名称 */
  name: string;
  /** 属性类型（如 "string" | "number" | "boolean" | "string[]" 等） */
  type: string;
  /** 属性默认值 */
  defaultValue?: unknown;
  /** 是否必填 */
  required?: boolean;
  /** 属性描述 */
  description?: string;
  /** 枚举值（如有） */
  values?: readonly string[];
}

/** 描述单个组件的 schema：名称、允许属性列表、属性类型和默认值。 */
export interface CatalogComponentDefinition {
  /** 组件名称（如 "Button"、"TextField"） */
  component: string;
  /** 组件说明 */
  description?: string;
  /** 允许使用的属性列表 */
  properties: CatalogComponentProperty[];
}

/** 完整 Catalog 定义。 */
export interface CatalogDefinition {
  /** Catalog ID（如 "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json"） */
  catalogId: string;
  /** Catalog 版本 */
  version: string;
  /** 该 Catalog 中包含的组件定义列表 */
  components: CatalogComponentDefinition[];
}

export interface SurfaceState {
  surfaceId: string;
  catalogId: string;
  theme?: JsonObject;
  sendDataModel?: boolean;
  components: Record<string, A2UIComponent>;
  dataModel: JsonValue;
}
