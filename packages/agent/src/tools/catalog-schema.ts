/**
 * Basic Catalog 组件定义与查询 API。
 *
 * 职责：
 * - 硬编码 A2UI v0.9 Basic Catalog 所有组件的字段定义（类型、必填、可选值等）
 * - 提供组件定义查询、摘要生成、详情格式化的公共 API
 * - 支撑渐进式组件披露流程中按需注入组件详情的功能
 *
 * 不负责：A2UI Schema 校验逻辑（见 validate-a2ui.ts）、Catalog JSON Schema 文件维护。
 */

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

const STYLE_PROPERTY: InternalPropertyDef = {
  name: "style",
  type: "object",
  description:
    "受控样式对象。可用字段：width (string)、height (string)、minWidth (string)、maxWidth (string)、minHeight (string)、maxHeight (string)、padding (string)、paddingX (string → paddingLeft+paddingRight)、paddingY (string → paddingTop+paddingBottom)、margin (string)、marginX (string → marginLeft+marginRight)、marginY (string → marginTop+marginBottom)、gap (string)、color (string)、backgroundColor (string)、borderColor (string)、borderWidth (string)、borderRadius (string)、fontSize (string)、fontWeight (number|string)、lineHeight (number|string)、textAlign (string)、alignSelf (string)、justifySelf (string)、shadow (string，允许值 none|xs|sm|md|lg，映射到 boxShadow)、opacity (number|string)、overflow (string)、flex (number|string)。不在上述列表中的字段会被渲染器忽略。",
};

const VISUAL_PROPERTIES: InternalPropertyDef[] = [
  STYLE_PROPERTY,
  {
    name: "variant",
    type: "string",
    description: "视觉变体",
    values: ["primary", "secondary", "outline", "ghost", "filled", "plain", "elevated", "underline", "pills", "segmented", "solid", "dashed", "dotted"],
  },
  {
    name: "size",
    type: "string",
    description: "尺寸密度",
    values: ["sm", "md", "lg"],
  },
  {
    name: "tone",
    type: "string",
    description: "语义色调",
    values: ["neutral", "brand", "success", "warning", "danger"],
  },
  {
    name: "preset",
    type: "string",
    description: "组件预定义复杂样式",
    values: ["title", "subtitle", "body", "caption", "metric", "section", "toolbar", "grid", "form", "centered", "summary", "formPanel", "media", "avatar", "thumbnail", "hero", "logo", "inline", "badge", "buttonIcon", "status", "mediaCard", "heroMedia", "dense", "cardList"],
  },
];

const FORM_PROPERTIES: InternalPropertyDef[] = [
  {
    name: "description",
    type: "string",
    description: "字段补充说明，显示在 label 下方",
  },
  {
    name: "placeholder",
    type: "string",
    description: "输入占位提示",
  },
  {
    name: "disabled",
    type: "boolean",
    description: "是否禁用",
  },
  {
    name: "required",
    type: "boolean",
    description: "是否必填",
  },
  {
    name: "readonly",
    type: "boolean",
    description: "是否只读",
  },
  {
    name: "validationState",
    type: "string",
    description: "字段校验状态",
    values: ["default", "success", "warning", "error"],
  },
  {
    name: "helpText",
    type: "string",
    description: "辅助说明文案",
  },
  {
    name: "errorText",
    type: "string",
    description: "错误状态文案",
  },
  {
    name: "density",
    type: "string",
    description: "字段密度",
    values: ["compact", "comfortable"],
  },
];

const LAYOUT_SEMANTIC_PROPERTIES: InternalPropertyDef[] = [
  {
    name: "role",
    type: "string",
    description: "布局语义角色",
    values: ["default", "toolbar", "formRow", "actions", "metadata", "mediaObject", "centered"],
  },
  {
    name: "density",
    type: "string",
    description: "布局密度",
    values: ["compact", "comfortable", "spacious"],
  },
  {
    name: "divider",
    type: "string",
    description: "子项之间的分隔策略",
    values: ["none", "between", "after"],
  },
];

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
      {
        name: "maxLines",
        type: "number",
        description: "最大显示行数，用于多行截断",
      },
      {
        name: "decoration",
        type: "string",
        description: "文本装饰语义，例如删除线或下划线",
        values: ["none", "underline", "lineThrough", "overline"],
      },
      {
        name: "emphasis",
        type: "string",
        description: "文本强调语义",
        values: ["default", "muted", "strong", "danger", "success", "warning"],
      },
      {
        name: "role",
        type: "string",
        description: "文本业务角色，例如价格、旧价格、状态或时间",
        values: ["default", "price", "previousPrice", "discount", "status", "timestamp", "emptyState"],
      },
      {
        name: "truncate",
        type: "boolean",
        description: "是否单行截断",
      },
      ...VISUAL_PROPERTIES,
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
      {
        name: "aspectRatio",
        type: "string",
        description: "图片比例，如 1:1、4:3、16:9",
      },
      {
        name: "loading",
        type: "string",
        description: "图片加载策略",
        values: ["lazy", "eager"],
      },
      {
        name: "role",
        type: "string",
        description: "图片内容角色",
        values: ["image", "avatar", "thumbnail", "cover", "logo", "hero"],
      },
      {
        name: "shape",
        type: "string",
        description: "图片形状",
        values: ["square", "rounded", "circle"],
      },
      {
        name: "fallbackText",
        type: "string",
        description: "图片加载失败时显示的兜底文本",
      },
      {
        name: "caption",
        type: "string",
        description: "图片说明文案",
      },
      ...VISUAL_PROPERTIES,
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
      {
        name: "icon",
        type: "string",
        description: "兼容旧字段，建议改用 name",
      },
      {
        name: "semantic",
        type: "string",
        description: "图标语义，用于可访问性和状态表达",
        values: ["decorative", "status", "action", "navigation"],
      },
      {
        name: "label",
        type: "string",
        description: "非装饰图标的可访问标签",
      },
      {
        name: "status",
        type: "string",
        description: "状态图标语义",
        values: ["info", "success", "warning", "danger", "neutral"],
      },
      ...VISUAL_PROPERTIES,
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
      {
        name: "poster",
        type: "string",
        description: "视频封面图 URL",
      },
      {
        name: "controls",
        type: "boolean",
        description: "是否显示播放控件",
      },
      {
        name: "autoplay",
        type: "boolean",
        description: "是否自动播放",
      },
      {
        name: "loop",
        type: "boolean",
        description: "是否循环播放",
      },
      {
        name: "muted",
        type: "boolean",
        description: "是否静音",
      },
      {
        name: "fit",
        type: "string",
        description: "媒体适应方式",
        values: ["contain", "cover", "fill", "none", "scale-down"],
      },
      {
        name: "aspectRatio",
        type: "string",
        description: "视频比例，如 16:9",
      },
      {
        name: "density",
        type: "string",
        description: "播放器密度",
        values: ["compact", "comfortable"],
      },
      ...VISUAL_PROPERTIES,
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
      {
        name: "controls",
        type: "boolean",
        description: "是否显示播放控件",
      },
      {
        name: "autoplay",
        type: "boolean",
        description: "是否自动播放",
      },
      {
        name: "loop",
        type: "boolean",
        description: "是否循环播放",
      },
      {
        name: "muted",
        type: "boolean",
        description: "是否静音",
      },
      {
        name: "density",
        type: "string",
        description: "播放器密度",
        values: ["compact", "comfortable"],
      },
      ...VISUAL_PROPERTIES,
    ],
  },
  {
    component: "Divider",
    description: "分割线组件",
    properties: [
      {
        name: "orientation",
        type: "string",
        description: "分割线方向",
        values: ["horizontal", "vertical"],
      },
      {
        name: "thickness",
        type: "number",
        description: "线条粗细",
      },
      {
        name: "color",
        type: "string",
        description: "线条颜色",
      },
      {
        name: "spacing",
        type: "number",
        description: "上下或左右间距",
      },
      {
        name: "label",
        type: "string",
        description: "分割线标签",
      },
      {
        name: "labelAlign",
        type: "string",
        description: "标签对齐方式",
        values: ["start", "center", "end"],
      },
      ...VISUAL_PROPERTIES,
    ],
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
      {
        name: "gap",
        type: "string",
        description: "子组件间距",
      },
      {
        name: "wrap",
        type: "boolean",
        description: "是否允许换行",
      },
      ...LAYOUT_SEMANTIC_PROPERTIES,
      ...VISUAL_PROPERTIES,
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
      {
        name: "gap",
        type: "string",
        description: "子组件间距",
      },
      {
        name: "wrap",
        type: "boolean",
        description: "是否允许换行或未来扩展换列",
      },
      ...LAYOUT_SEMANTIC_PROPERTIES,
      ...VISUAL_PROPERTIES,
    ],
  },
  {
    component: "Grid",
    description: "二维网格布局容器，适合卡片墙、表单栅格和仪表盘区域",
    properties: [
      {
        name: "children",
        type: "string[]",
        required: true,
        description: "子组件 ID 列表",
      },
      {
        name: "columns",
        type: "string",
        description: "列数，使用数字或 auto",
        values: ["auto"],
      },
      {
        name: "minItemWidth",
        type: "string",
        description: "auto 列布局时的最小单项宽度，如 220px",
      },
      {
        name: "gap",
        type: "string",
        description: "网格间距",
      },
      {
        name: "density",
        type: "string",
        description: "网格密度",
        values: ["compact", "comfortable", "spacious"],
      },
      ...VISUAL_PROPERTIES,
    ],
  },
  {
    component: "Container",
    description: "页面区块容器，提供受控宽度、内边距和水平对齐",
    properties: [
      {
        name: "child",
        type: "string",
        required: true,
        description: "容器内的子组件 ID",
      },
      {
        name: "width",
        type: "string",
        description: "容器宽度语义",
        values: ["narrow", "content", "wide", "full"],
      },
      {
        name: "padding",
        type: "string",
        description: "容器内边距语义",
        values: ["none", "sm", "md", "lg"],
      },
      {
        name: "align",
        type: "string",
        description: "容器水平对齐",
        values: ["start", "center"],
      },
      ...VISUAL_PROPERTIES,
    ],
  },
  {
    component: "Spacer",
    description: "受控空隙或弹性占位组件",
    properties: [
      {
        name: "size",
        type: "string",
        description: "空隙尺寸",
        values: ["xs", "sm", "md", "lg", "xl"],
      },
      {
        name: "axis",
        type: "string",
        description: "空隙方向",
        values: ["horizontal", "vertical"],
      },
      {
        name: "flex",
        type: "boolean",
        description: "是否作为弹性占位撑开空间",
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
      {
        name: "marker",
        type: "string",
        description: "列表标记样式",
        values: ["none", "disc", "decimal", "check"],
      },
      {
        name: "gap",
        type: "string",
        description: "列表项间距",
      },
      {
        name: "divided",
        type: "boolean",
        description: "列表项之间是否显示分割线",
      },
      {
        name: "wrap",
        type: "boolean",
        description: "横向列表是否换行",
      },
      {
        name: "emptyText",
        type: "string",
        description: "空列表提示文案",
      },
      {
        name: "loading",
        type: "boolean",
        description: "是否显示加载状态",
      },
      {
        name: "itemRole",
        type: "string",
        description: "列表项语义角色",
        values: ["default", "menuItem", "option", "article", "media", "card"],
      },
      {
        name: "selection",
        type: "string",
        description: "选择模式声明",
        values: ["none", "single", "multiple"],
      },
      {
        name: "dividers",
        type: "boolean",
        description: "是否显示列表项分隔线",
      },
      ...VISUAL_PROPERTIES,
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
      {
        name: "title",
        type: "string",
        description: "简单卡片标题；复杂标题建议使用 child 内部 Text 组件",
      },
      {
        name: "header",
        type: "string",
        description: "卡片头部标题，优先于 title",
      },
      {
        name: "subtitle",
        type: "string",
        description: "卡片副标题",
      },
      {
        name: "footer",
        type: "string",
        description: "卡片底部说明文案",
      },
      {
        name: "role",
        type: "string",
        description: "卡片语义角色",
        values: ["default", "summary", "metric", "media", "form", "interactive", "emptyState"],
      },
      {
        name: "density",
        type: "string",
        description: "卡片内容密度",
        values: ["compact", "comfortable", "spacious"],
      },
      {
        name: "selected",
        type: "boolean",
        description: "是否处于选中状态",
      },
      {
        name: "clickable",
        type: "boolean",
        description: "是否表现为可点击卡片",
      },
      ...VISUAL_PROPERTIES,
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
      {
        name: "align",
        type: "string",
        description: "标签页头部对齐方式",
        values: ["start", "center", "end", "stretch"],
      },
      {
        name: "fullWidth",
        type: "boolean",
        description: "标签是否撑满宽度",
      },
      ...VISUAL_PROPERTIES,
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
      {
        name: "visible",
        type: "boolean",
        description: "是否显示，支持布尔值或 { path } 绑定",
      },
      {
        name: "size",
        type: "string",
        description: "模态框尺寸",
        values: ["sm", "md", "lg", "fullscreen"],
      },
      {
        name: "placement",
        type: "string",
        description: "模态框位置",
        values: ["center", "right", "bottom"],
      },
      {
        name: "closeOnOverlayClick",
        type: "boolean",
        description: "点击遮罩是否关闭",
      },
      {
        name: "showCloseButton",
        type: "boolean",
        description: "是否显示关闭按钮",
      },
      {
        name: "overlayOpacity",
        type: "number",
        description: "遮罩透明度",
      },
      {
        name: "title",
        type: "string",
        description: "简单弹窗标题",
      },
      {
        name: "footer",
        type: "string",
        description: "简单弹窗底部子组件 ID",
      },
      ...VISUAL_PROPERTIES,
    ],
  },
  {
    component: "Button",
    description: "按钮组件，携带交互动作",
    properties: [
      {
        name: "child",
        type: "string",
        required: false,
        description: "按钮内容的子组件 ID 或内联对象",
      },
      {
        name: "label",
        type: "string",
        description: "按钮文本；无 child 时可直接使用",
      },
      {
        name: "icon",
        type: "string",
        description: "按钮图标名称；无 child 时可直接使用",
      },
      {
        name: "action",
        type: "object",
        required: true,
        description: "按钮事件动作，格式为 { event: { name, context? } }",
      },
      {
        name: "fullWidth",
        type: "boolean",
        description: "是否撑满父容器宽度",
      },
      {
        name: "disabled",
        type: "boolean",
        description: "是否禁用",
      },
      {
        name: "loading",
        type: "boolean",
        description: "是否显示加载态",
      },
      {
        name: "iconPosition",
        type: "string",
        description: "图标位置",
        values: ["left", "right", "only"],
      },
      {
        name: "intent",
        type: "string",
        description: "按钮业务意图",
        values: ["default", "primary", "secondary", "danger", "success", "warning"],
      },
      {
        name: "shape",
        type: "string",
        description: "按钮形状",
        values: ["rounded", "pill", "square", "circle"],
      },
      {
        name: "importance",
        type: "string",
        description: "按钮视觉重要程度",
        values: ["normal", "quiet", "prominent"],
      },
      ...VISUAL_PROPERTIES,
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
        name: "name",
        type: "string",
        description: "字段名称，用于表单语义",
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
      {
        name: "rows",
        type: "number",
        description: "多行输入行数",
      },
      {
        name: "minRows",
        type: "number",
        description: "多行输入最小行数",
      },
      {
        name: "inputMode",
        type: "string",
        description: "输入键盘和数据类型提示",
        values: ["text", "email", "url", "tel", "numeric", "decimal"],
      },
      {
        name: "prefix",
        type: "string",
        description: "输入前缀",
      },
      {
        name: "suffix",
        type: "string",
        description: "输入后缀",
      },
      {
        name: "clearable",
        type: "boolean",
        description: "是否声明为可清空输入",
      },
      ...FORM_PROPERTIES,
      ...VISUAL_PROPERTIES,
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
        name: "name",
        type: "string",
        description: "字段名称，用于表单语义",
      },
      {
        name: "value",
        type: "string",
        required: true,
        description: "复选框值，支持字符串或 { path } 数据绑定",
      },
      {
        name: "description",
        type: "string",
        description: "复选框补充说明",
      },
      {
        name: "labelPosition",
        type: "string",
        description: "标签位置",
        values: ["left", "right"],
      },
      ...FORM_PROPERTIES,
      ...VISUAL_PROPERTIES,
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
        name: "name",
        type: "string",
        description: "字段名称，用于表单语义",
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
      {
        name: "mode",
        type: "string",
        description: "选择器展示模式",
        values: ["select", "radio", "segmented"],
      },
      {
        name: "multiple",
        type: "boolean",
        description: "是否声明为多选",
      },
      ...FORM_PROPERTIES,
      ...VISUAL_PROPERTIES,
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
        name: "name",
        type: "string",
        description: "字段名称，用于表单语义",
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
      {
        name: "step",
        type: "number",
        description: "步进值",
      },
      {
        name: "showValue",
        type: "boolean",
        description: "是否显示当前值",
      },
      {
        name: "valuePrefix",
        type: "string",
        description: "数值前缀",
      },
      {
        name: "valueSuffix",
        type: "string",
        description: "数值后缀",
      },
      {
        name: "valueDisplay",
        type: "string",
        description: "数值展示方式",
        values: ["none", "inline", "tooltip"],
      },
      ...FORM_PROPERTIES,
      ...VISUAL_PROPERTIES,
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
        name: "name",
        type: "string",
        description: "字段名称，用于表单语义",
      },
      {
        name: "value",
        type: "string",
        required: true,
        description: "当前值，支持字符串或 { path } 数据绑定",
      },
      {
        name: "usageHint",
        type: "string",
        description: "日期时间输入类型",
        values: ["date", "time", "datetime"],
      },
      ...FORM_PROPERTIES,
      ...VISUAL_PROPERTIES,
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
 * 返回用于首轮 Prompt 的组件摘要。
 * 只暴露组件名称和一句话用途，不包含字段清单。
 */
export function getCatalogComponentSummaries(): Array<{
  component: string;
  description: string;
}> {
  return COMPONENT_DEFS.map((def) => ({
    component: def.component,
    description: def.description,
  }));
}

/**
 * 将组件摘要格式化为 Prompt 文本。
 */
export function formatCatalogComponentSummaries(): string {
  return getAllCatalogComponentNames()
    .map((name) => {
      const def = getComponentDef(name);
      return `- ${name}: ${def?.description ?? "Basic Catalog 组件"}`;
    })
    .join("\n");
}

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
    catalogId:
      "https://a2ui.org/specification/v0.9/catalogs/basic/catalog.json",
    version: "v0.9",
    components: getCatalogComponents(),
  };
}
