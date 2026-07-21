/**
 * A2UI v0.9 协议共享类型。
 *
 * 职责：
 * - 定义服务端到客户端 A2UI 消息
 * - 定义 Renderer 回传 action/error 消息
 * - 定义 Basic Catalog 相关共享类型
 *
 * 不负责：具体组件渲染、Agent 校验实现或后端持久化逻辑。
 */

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

/** 组件声明中的事件 action，用于描述用户交互触发的业务事件。 */
export interface A2UIActionEventDeclaration {
  /** 事件名称，如 submit、play、openDetail。 */
  name: string;
  /** 事件上下文，可包含静态值或 `{ path }` 动态绑定。 */
  context?: JsonObject;
}

/** 组件属性中的只读脚本声明，用于根据 dataModel 计算属性值。 */
export interface A2UIPropertyScriptDeclaration {
  /** 同步 JS 函数体，必须显式 return 一个 JSON-compatible 值。 */
  code: string;
  /** 脚本依赖的 dataModel JSON Pointer 路径，用于 Renderer 建立最小订阅。 */
  deps: string[];
  /** 脚本执行失败或返回值非法时使用的兜底值。 */
  fallback?: JsonValue;
}

/** 可出现在组件属性中的脚本动态值包装。 */
export interface A2UIPropertyScriptValue {
  /** 只读属性脚本声明。 */
  script: A2UIPropertyScriptDeclaration;
}

/** 组件声明中的函数调用 action，当前仅作为未来能力保留。 */
export interface A2UIActionFunctionCallDeclaration {
  /** 受控函数名称，如 openUrl。 */
  call: string;
  /** 函数参数。 */
  args?: JsonObject;
}

/** 组件声明中的脚本 action，用于在用户交互时执行受限本地逻辑。 */
export interface A2UIActionScriptDeclaration {
  /** 同步 JS 函数体，允许读取和写入 dataModel，并调用宿主注入的 actions 能力。 */
  code: string;
  /** 可选依赖说明，供 Agent 和调试工具理解脚本读取的数据路径。 */
  deps?: string[];
  /** 脚本上下文，可包含静态值或 `{ path }` 动态绑定。 */
  context?: JsonObject;
}

/** 组件声明中的 action 配置。 */
export interface A2UIComponentActionDeclaration {
  /** 用户交互事件。 */
  event?: A2UIActionEventDeclaration;
  /** 用户交互触发的受限脚本。 */
  script?: A2UIActionScriptDeclaration;
  /** 未来函数调用能力，当前 Agent 不应生成，Renderer 不执行。 */
  functionCall?: A2UIActionFunctionCallDeclaration;
}

/** Renderer 回传给宿主前端和后端记录的 action 载荷。 */
export interface A2UIActionPayload {
  /** action 类型，供后端 handler 稳定分发。 */
  kind: "event";
  /** 事件名称。 */
  name: string;
  /** 触发事件的 surface ID。 */
  surfaceId: string;
  /** 触发事件的组件 ID。 */
  sourceComponentId: string;
  /** 触发时间，ISO 8601 字符串。 */
  timestamp: string;
  /** 已解析后的事件上下文。 */
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
