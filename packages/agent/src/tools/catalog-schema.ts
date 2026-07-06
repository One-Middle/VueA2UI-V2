import type {
  CatalogDefinition,
  CatalogComponentDefinition,
  CatalogComponentProperty,
} from "@a2ui-platform/shared";

// ─── Basic Catalog 硬编码组件定义 ────────────────────────────

/** 每个组件属性是否需要特殊处理的 JSON Schema 类型 */
type PropertyJsonType =
  | "string"
  | "number"
  | "boolean"
  | "array"
  | "string[]"
  | "object";

interface InternalPropertyDef {
  name: string;
  type: PropertyJsonType;
  required?: boolean;
  description?: string;
  defaultValue?: unknown;
  values?: readonly string[];
}

interface InternalComponentDef {
  component: string;
  description: string;
  properties: InternalPropertyDef[];
}

const COMPONENT_DEFS: InternalComponentDef[] = [
  {
    component: "Text",
    description: "文本显示组件，支持标题和正文样式",
    properties: [
      {
        name: "text",
        type: "string",
        required: true,
        description: "显示的文本内容，支持字符串或 { path } 数据绑定",
      },
      {
        name: "usageHint",
        type: "string",
        description: "文本样式提示",
        values: ["h1", "h2", "h3", "h4", "h5", "caption", "body"],
      },
    ],
  },
  {
    component: "Image",
    description: "图片显示组件",
    properties: [
      {
        name: "url",
        type: "string",
        required: true,
        description: "图片 URL，支持字符串或 { path } 数据绑定",
      },
      {
        name: "alt",
        type: "string",
        description: "替代文本",
      },
      {
        name: "fit",
        type: "string",
        description: "图片适应方式",
        values: ["contain", "cover", "fill", "none", "scale-down"],
      },
    ],
  },
  {
    component: "Icon",
    description: "图标组件",
    properties: [
      {
        name: "name",
        type: "string",
        required: true,
        description: "图标名称，支持字符串或 { path } 数据绑定",
      },
    ],
  },
  {
    component: "Video",
    description: "视频播放组件",
    properties: [
      {
        name: "url",
        type: "string",
        required: true,
        description: "视频 URL，支持字符串或 { path } 数据绑定",
      },
    ],
  },
  {
    component: "AudioPlayer",
    description: "音频播放组件",
    properties: [
      {
        name: "url",
        type: "string",
        required: true,
        description: "音频 URL，支持字符串或 { path } 数据绑定",
      },
    ],
  },
  {
    component: "Divider",
    description: "分割线组件，无属性",
    properties: [],
  },
  {
    component: "Row",
    description: "水平布局容器",
    properties: [
      {
        name: "children",
        type: "string[]",
        required: true,
        description: "子组件 ID 列表",
      },
      {
        name: "distribution",
        type: "string",
        description: "主轴分布方式",
        values: [
          "start",
          "center",
          "end",
          "spaceBetween",
          "spaceAround",
          "spaceEvenly",
        ],
      },
      {
        name: "alignment",
        type: "string",
        description: "交叉轴对齐方式",
        values: ["start", "center", "end", "stretch"],
      },
    ],
  },
  {
    component: "Column",
    description: "垂直布局容器",
    properties: [
      {
        name: "children",
        type: "string[]",
        required: true,
        description: "子组件 ID 列表",
      },
      {
        name: "distribution",
        type: "string",
        description: "主轴分布方式",
        values: [
          "start",
          "center",
          "end",
          "spaceBetween",
          "spaceAround",
          "spaceEvenly",
        ],
      },
      {
        name: "alignment",
        type: "string",
        description: "交叉轴对齐方式",
        values: ["start", "center", "end", "stretch"],
      },
    ],
  },
  {
    component: "List",
    description: "列表容器，支持静态和动态子项",
    properties: [
      {
        name: "children",
        type: "array",
        required: true,
        description:
          "子组件列表：静态模式下为组件 ID 字符串数组；模板模式下为 { path, componentId } 对象数组",
      },
      {
        name: "direction",
        type: "string",
        description: "列表排列方向",
        values: ["vertical", "horizontal"],
      },
    ],
  },
  {
    component: "Card",
    description: "卡片容器",
    properties: [
      {
        name: "child",
        type: "string",
        required: true,
        description: "卡片的子组件 ID 或内联组件对象",
      },
    ],
  },
  {
    component: "Tabs",
    description: "标签页容器",
    properties: [
      {
        name: "tabItems",
        type: "array",
        required: true,
        description:
          "标签页数组，每项包含 title（标签名）和 child（内容子组件 ID 或内联对象）",
      },
    ],
  },
  {
    component: "Modal",
    description: "模态框容器",
    properties: [
      {
        name: "child",
        type: "string",
        required: true,
        description: "模态框内容的子组件 ID 或内联对象",
      },
      {
        name: "trigger",
        type: "string",
        description: "触发打开模态框的子组件 ID 或内联对象",
      },
    ],
  },
  {
    component: "Button",
    description: "按钮组件，携带交互动作",
    properties: [
      {
        name: "child",
        type: "string",
        required: true,
        description: "按钮内容的子组件 ID 或内联对象",
      },
      {
        name: "action",
        type: "object",
        required: true,
        description: "按钮动作，包含 name 和可选的 context 对象",
      },
    ],
  },
  {
    component: "TextField",
    description: "文本输入框",
    properties: [
      {
        name: "label",
        type: "string",
        required: true,
        description: "输入框标签",
      },
      {
        name: "text",
        type: "string",
        required: true,
        description: "输入框值，支持字符串或 { path } 数据绑定",
      },
      {
        name: "usageHint",
        type: "string",
        description: "输入类型提示",
        values: ["shortText", "longText", "number", "obscured"],
      },
    ],
  },
  {
    component: "CheckBox",
    description: "复选框组件",
    properties: [
      {
        name: "label",
        type: "string",
        required: true,
        description: "复选框标签",
      },
      {
        name: "value",
        type: "string",
        required: true,
        description: "复选框值，支持字符串或 { path } 数据绑定",
      },
    ],
  },
  {
    component: "ChoicePicker",
    description: "下拉选择器",
    properties: [
      {
        name: "label",
        type: "string",
        required: true,
        description: "选择器标签",
      },
      {
        name: "options",
        type: "array",
        required: true,
        description: "选项数组，每项包含 label 和 value",
      },
      {
        name: "value",
        type: "string",
        required: true,
        description: "当前选中值，支持字符串或 { path } 数据绑定",
      },
    ],
  },
  {
    component: "Slider",
    description: "滑块组件",
    properties: [
      {
        name: "label",
        type: "string",
        required: true,
        description: "滑块标签",
      },
      {
        name: "min",
        type: "number",
        required: true,
        description: "最小值",
      },
      {
        name: "max",
        type: "number",
        required: true,
        description: "最大值",
      },
      {
        name: "value",
        type: "string",
        required: true,
        description: "当前值，支持字符串或 { path } 数据绑定",
      },
    ],
  },
  {
    component: "DateTimeInput",
    description: "日期时间选择器",
    properties: [
      {
        name: "label",
        type: "string",
        required: true,
        description: "日期时间选择器标签",
      },
      {
        name: "value",
        type: "string",
        required: true,
        description: "当前值，支持字符串或 { path } 数据绑定",
      },
    ],
  },
];

// ─── 公共 API ──────────────────────────────────────────────

/**
 * 获取所有 Basic Catalog 组件的定义。
 * 返回符合 `CatalogComponentDefinition` 类型的数据。
 */
export function getCatalogComponents(): CatalogComponentDefinition[] {
  return COMPONENT_DEFS.map((def) => ({
    component: def.component,
    description: def.description,
    properties: def.properties.map((p) => ({
      name: p.name,
      type: p.type,
      required: p.required ?? false,
      description: p.description,
      ...(p.values ? { values: p.values } : {}),
    })) as CatalogComponentProperty[],
  }));
}

/**
 * 获取所有组件名称列表。
 */
export function getCatalogComponentNames(): string[] {
  return COMPONENT_DEFS.map((d) => d.component);
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
  const found = COMPONENT_DEFS.find((d) => d.component === name);
  if (!found) return undefined;
  return {
    component: found.component,
    description: found.description,
    properties: found.properties.map((p) => ({
      name: p.name,
      type: p.type,
      required: p.required ?? false,
      description: p.description,
      ...(p.values ? { values: p.values } : {}),
    })) as CatalogComponentProperty[],
  };
}

/**
 * 返回完整的 Basic Catalog 定义，包含 catalogId、version 和所有组件定义。
 */
export function getBasicCatalogDefinition(): CatalogDefinition {
  return {
    catalogId:
      "https://a2ui.org/specification/v0.9/catalogs/basic/catalog.json",
    version: "v0.9",
    components: getCatalogComponents(),
  };
}
