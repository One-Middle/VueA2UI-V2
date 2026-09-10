/**
 * Basic Catalog 单一事实源。
 *
 * 职责：
 * - 维护当前正式支持的 Basic Catalog 组件集合
 * - 描述字段 schema、字段语义和普通 Vue 组件 API 映射
 *
 * 不负责：Agent prompt 文本格式、Ajv 编译或 Renderer 运行时状态。
 * 注意：
 * - `Modal` 不属于新的正式 Catalog。
 * - 这里的字段语义只解释现有 A2UI 协议，不引入新的协议字段。
 */

import type {
  BasicCatalogComponentDefinition,
  BasicCatalogDefinition,
  CatalogFieldDefinition,
} from "./types";

export const BASIC_CATALOG_ID =
  "https://a2ui.org/specification/v0.9/catalogs/basic/catalog.json";

const VISUAL_FIELDS = [
  field("style", "visual", "controlledStyle", "受控样式对象", {
    targetProp: "style",
  }),
  enumField("variant", "visual", "视觉变体", [
    "primary",
    "secondary",
    "outline",
    "ghost",
    "filled",
    "plain",
    "elevated",
    "interactive",
    "underline",
    "pills",
    "segmented",
    "solid",
    "dashed",
    "dotted",
    "danger",
    "outlined",
  ]),
  enumField("size", "visual", "尺寸密度", ["sm", "md", "lg"]),
  enumField("tone", "visual", "语义色调", [
    "neutral",
    "brand",
    "success",
    "warning",
    "danger",
  ]),
  enumField("preset", "visual", "组件预定义样式", [
    "title",
    "subtitle",
    "body",
    "caption",
    "metric",
    "section",
    "toolbar",
    "grid",
    "form",
    "centered",
    "summary",
    "formPanel",
    "media",
    "avatar",
    "thumbnail",
    "hero",
    "logo",
    "inline",
    "badge",
    "buttonIcon",
    "status",
    "mediaCard",
    "heroMedia",
    "plain",
    "dense",
    "cardList",
  ]),
] as const;

const FORM_FIELDS = [
  field("description", "display", "string", "字段补充说明"),
  field("placeholder", "prop", "string", "输入占位提示"),
  field("disabled", "state", "boolean", "是否禁用"),
  field("required", "state", "boolean", "是否必填"),
  field("readonly", "state", "boolean", "是否只读"),
  enumField("validationState", "state", "字段校验状态", [
    "default",
    "success",
    "warning",
    "error",
  ]),
  field("helpText", "display", "string", "辅助说明文案"),
  field("errorText", "display", "string", "错误状态文案"),
  enumField("density", "visual", "字段密度", ["compact", "comfortable"]),
] as const;

const LAYOUT_FIELDS = [
  enumField("role", "visual", "布局语义角色", [
    "default",
    "toolbar",
    "formRow",
    "actions",
    "metadata",
    "mediaObject",
    "centered",
  ]),
  enumField("density", "visual", "布局密度", [
    "compact",
    "comfortable",
    "spacious",
  ]),
  enumField("divider", "visual", "子项之间的分隔策略", [
    "none",
    "between",
    "after",
  ]),
] as const;

export const BASIC_CATALOG_DEFINITION = {
  catalogId: BASIC_CATALOG_ID,
  version: "v0.9",
  components: [
    component("Text", "文本显示组件，支持标题和正文样式", [
      field("text", "display", "stringOrBinding", "显示的文本内容", {
        required: true,
      }),
      enumField("usageHint", "visual", "文本样式提示", [
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "caption",
        "body",
      ]),
      field("maxLines", "visual", "number", "最大显示行数"),
      enumField("decoration", "visual", "文本装饰语义", [
        "none",
        "underline",
        "lineThrough",
        "overline",
      ]),
      enumField("emphasis", "visual", "文本强调语义", [
        "default",
        "muted",
        "strong",
        "danger",
        "success",
        "warning",
      ]),
      enumField("role", "visual", "文本业务角色", [
        "default",
        "price",
        "previousPrice",
        "discount",
        "status",
        "timestamp",
        "emptyState",
      ]),
      field("truncate", "visual", "boolean", "是否单行截断"),
      ...VISUAL_FIELDS,
    ]),
    component("Image", "图片显示组件", [
      field("url", "display", "stringOrBinding", "图片 URL", {
        required: true,
        targetProp: "src",
      }),
      field("alt", "display", "string", "替代文本"),
      enumField("fit", "visual", "图片适应方式", [
        "contain",
        "cover",
        "fill",
        "none",
        "scale-down",
      ]),
      field("aspectRatio", "visual", "string", "图片比例"),
      enumField("loading", "prop", "图片加载策略", ["lazy", "eager"]),
      enumField("role", "visual", "图片内容角色", [
        "image",
        "avatar",
        "thumbnail",
        "cover",
        "logo",
        "hero",
      ]),
      enumField("shape", "visual", "图片形状", ["square", "rounded", "circle"]),
      field("fallbackText", "display", "string", "图片加载失败兜底文本"),
      field("caption", "display", "stringOrBinding", "图片说明文案"),
      ...VISUAL_FIELDS,
    ]),
    component("Icon", "图标组件", [
      field("name", "display", "stringOrBinding", "图标名称", {
        required: true,
      }),
      field("icon", "display", "stringOrBinding", "兼容旧字段，建议改用 name"),
      enumField("semantic", "prop", "图标语义", [
        "decorative",
        "status",
        "action",
        "navigation",
      ]),
      field("label", "display", "string", "非装饰图标的可访问标签"),
      enumField("status", "visual", "状态图标语义", [
        "info",
        "success",
        "warning",
        "danger",
        "neutral",
      ]),
      ...VISUAL_FIELDS,
    ]),
    component("Video", "视频播放组件", [
      field("url", "display", "stringOrBinding", "视频 URL", {
        required: true,
        targetProp: "src",
      }),
      field("poster", "display", "stringOrBinding", "视频封面图 URL"),
      field("controls", "prop", "boolean", "是否显示播放控件"),
      field("autoplay", "prop", "boolean", "是否自动播放"),
      field("loop", "prop", "boolean", "是否循环播放"),
      field("muted", "prop", "boolean", "是否静音"),
      enumField("fit", "visual", "媒体适应方式", [
        "contain",
        "cover",
        "fill",
        "none",
        "scale-down",
      ]),
      field("aspectRatio", "visual", "string", "视频比例"),
      enumField("density", "visual", "播放器密度", ["compact", "comfortable"]),
      ...VISUAL_FIELDS,
    ]),
    component("AudioPlayer", "音频播放组件", [
      field("url", "display", "stringOrBinding", "音频 URL", {
        required: true,
        targetProp: "src",
      }),
      field("controls", "prop", "boolean", "是否显示播放控件"),
      field("autoplay", "prop", "boolean", "是否自动播放"),
      field("loop", "prop", "boolean", "是否循环播放"),
      field("muted", "prop", "boolean", "是否静音"),
      enumField("density", "visual", "播放器密度", ["compact", "comfortable"]),
      ...VISUAL_FIELDS,
    ]),
    component("Divider", "分割线组件", [
      enumField("orientation", "prop", "分割线方向", [
        "horizontal",
        "vertical",
      ]),
      field("thickness", "prop", "number", "线条粗细"),
      field("color", "prop", "string", "线条颜色"),
      field("spacing", "prop", "number", "上下或左右间距"),
      field("label", "display", "string", "分割线标签"),
      enumField("labelAlign", "visual", "标签对齐方式", [
        "start",
        "center",
        "end",
      ]),
      ...VISUAL_FIELDS,
    ]),
    component(
      "Row",
      "水平布局容器",
      [
        field("children", "slot", "staticOrDynamicChildren", "子组件 ID 列表", {
          required: true,
        }),
        enumField("distribution", "visual", "主轴分布方式", [
          "start",
          "center",
          "end",
          "spaceBetween",
          "spaceAround",
          "spaceEvenly",
        ]),
        enumField("alignment", "visual", "交叉轴对齐方式", [
          "start",
          "center",
          "end",
          "stretch",
        ]),
        field("gap", "visual", "string", "子组件间距"),
        field("wrap", "visual", "boolean", "是否允许换行"),
        ...LAYOUT_FIELDS,
        ...VISUAL_FIELDS,
      ],
      [{ mode: "componentList", source: "children", target: "default" }],
    ),
    component(
      "Column",
      "垂直布局容器",
      [
        field("children", "slot", "staticOrDynamicChildren", "子组件 ID 列表", {
          required: true,
        }),
        enumField("distribution", "visual", "主轴分布方式", [
          "start",
          "center",
          "end",
          "spaceBetween",
          "spaceAround",
          "spaceEvenly",
        ]),
        enumField("alignment", "visual", "交叉轴对齐方式", [
          "start",
          "center",
          "end",
          "stretch",
        ]),
        field("gap", "visual", "string", "子组件间距"),
        field("wrap", "visual", "boolean", "是否允许换行或未来扩展换列"),
        ...LAYOUT_FIELDS,
        ...VISUAL_FIELDS,
      ],
      [{ mode: "componentList", source: "children", target: "default" }],
    ),
    component(
      "Grid",
      "二维网格布局容器，适合卡片墙、表单栅格和仪表盘区域",
      [
        field("children", "slot", "staticOrDynamicChildren", "子组件 ID 列表", {
          required: true,
        }),
        field("columns", "visual", "gridColumns", "列数，数字或 auto"),
        field(
          "minItemWidth",
          "visual",
          "string",
          "auto 列布局时的最小单项宽度",
        ),
        field("gap", "visual", "string", "网格间距"),
        enumField("density", "visual", "网格密度", [
          "compact",
          "comfortable",
          "spacious",
        ]),
        ...VISUAL_FIELDS,
      ],
      [
        {
          mode: "repeatedComponent",
          source: "children",
          target: "default",
          pathField: "path",
          componentIdField: "componentId",
        },
        { mode: "componentList", source: "children", target: "default" },
      ],
    ),
    component(
      "Container",
      "页面区块容器，提供受控宽度、内边距和水平对齐",
      [
        field("child", "slot", "componentRef", "容器内的子组件 ID", {
          required: true,
        }),
        enumField("width", "visual", "容器宽度语义", [
          "narrow",
          "content",
          "wide",
          "full",
        ]),
        enumField("padding", "visual", "容器内边距语义", [
          "none",
          "sm",
          "md",
          "lg",
        ]),
        enumField("align", "visual", "容器水平对齐", ["start", "center"]),
        ...VISUAL_FIELDS,
      ],
      [{ mode: "component", source: "child", target: "default" }],
    ),
    component("Spacer", "受控空隙或弹性占位组件", [
      enumField("size", "visual", "空隙尺寸", ["xs", "sm", "md", "lg", "xl"]),
      enumField("axis", "visual", "空隙方向", ["horizontal", "vertical"]),
      field("flex", "visual", "boolean", "是否作为弹性占位撑开空间"),
    ]),
    component(
      "List",
      "列表容器，支持静态和动态子项",
      [
        field("children", "slot", "staticOrDynamicChildren", "子组件列表", {
          required: true,
        }),
        enumField("direction", "visual", "列表排列方向", [
          "vertical",
          "horizontal",
        ]),
        enumField("marker", "visual", "列表标记样式", [
          "none",
          "disc",
          "decimal",
          "check",
        ]),
        field("gap", "visual", "string", "列表项间距"),
        field("divided", "visual", "boolean", "列表项之间是否显示分割线"),
        field("wrap", "visual", "boolean", "横向列表是否换行"),
        field("emptyText", "display", "string", "空列表提示文案"),
        field("loading", "state", "boolean", "是否显示加载状态"),
        enumField("itemRole", "visual", "列表项语义角色", [
          "default",
          "menuItem",
          "option",
          "article",
          "media",
          "card",
        ]),
        enumField("selection", "prop", "选择模式声明", [
          "none",
          "single",
          "multiple",
        ]),
        field("dividers", "visual", "boolean", "是否显示列表项分隔线"),
        ...VISUAL_FIELDS,
      ],
      [
        {
          mode: "repeatedComponent",
          source: "children",
          target: "default",
          pathField: "path",
          componentIdField: "componentId",
        },
        { mode: "componentList", source: "children", target: "default" },
      ],
    ),
    component(
      "Card",
      "卡片容器",
      [
        field("child", "slot", "componentRef", "卡片的子组件 ID", {
          required: true,
        }),
        field("title", "display", "stringOrBinding", "简单卡片标题"),
        field("header", "display", "stringOrBinding", "卡片头部标题"),
        field("subtitle", "display", "stringOrBinding", "卡片副标题"),
        field("media", "slot", "componentRef", "卡片媒体区子组件 ID"),
        field("footer", "display", "stringOrBinding", "卡片底部说明文案"),
        enumField("role", "visual", "卡片语义角色", [
          "default",
          "summary",
          "metric",
          "media",
          "form",
          "interactive",
          "emptyState",
        ]),
        enumField("density", "visual", "卡片内容密度", [
          "compact",
          "comfortable",
          "spacious",
        ]),
        field("selected", "state", "boolean", "是否处于选中状态"),
        field("clickable", "state", "boolean", "是否表现为可点击卡片"),
        ...VISUAL_FIELDS,
      ],
      [
        { mode: "component", source: "media", target: "media" },
        { mode: "component", source: "child", target: "default" },
      ],
    ),
    component(
      "Tabs",
      "标签页容器",
      [
        field("tabItems", "slot", "tabItems", "标签页数组", { required: true }),
        enumField("align", "visual", "标签页头部对齐方式", [
          "start",
          "center",
          "end",
          "stretch",
        ]),
        field("fullWidth", "visual", "boolean", "标签是否撑满宽度"),
        ...VISUAL_FIELDS,
      ],
      [
        {
          mode: "tabPanels",
          source: "tabItems",
          target: "panels",
          titleField: "title",
          childField: "child",
        },
        {
          mode: "tabPanels",
          source: "tabs",
          target: "panels",
          titleField: "title",
          childField: "child",
        },
      ],
    ),
    component(
      "Button",
      "按钮组件，携带交互动作",
      [
        field("child", "slot", "componentRef", "按钮内容的子组件 ID"),
        field("label", "display", "stringOrBinding", "按钮文本"),
        field("icon", "display", "stringOrBinding", "按钮图标名称"),
        field("action", "action", "action", "按钮事件动作", {
          required: true,
          targetEvent: "click",
        }),
        field("fullWidth", "visual", "boolean", "是否撑满父容器宽度"),
        field("disabled", "state", "boolean", "是否禁用"),
        field("loading", "state", "boolean", "是否显示加载态"),
        enumField("iconPosition", "visual", "图标位置", [
          "left",
          "right",
          "only",
        ]),
        enumField("intent", "visual", "按钮业务意图", [
          "default",
          "primary",
          "secondary",
          "danger",
          "success",
          "warning",
        ]),
        enumField("shape", "visual", "按钮形状", [
          "rounded",
          "pill",
          "square",
          "circle",
        ]),
        enumField("importance", "visual", "按钮视觉重要程度", [
          "normal",
          "quiet",
          "prominent",
        ]),
        field("confirm", "prop", "object", "确认提示声明"),
        ...VISUAL_FIELDS,
      ],
      [{ mode: "component", source: "child", target: "default" }],
    ),
    component("TextField", "文本输入框", [
      field("label", "display", "string", "输入框标签", { required: true }),
      field("name", "prop", "string", "字段名称"),
      field("text", "model", "stringOrBinding", "输入框值", {
        required: true,
        targetProp: "modelValue",
        updateEvent: "update:modelValue",
      }),
      enumField("usageHint", "prop", "输入类型提示", [
        "shortText",
        "longText",
        "number",
        "obscured",
      ]),
      field("rows", "prop", "number", "多行输入行数"),
      field("minRows", "prop", "number", "多行输入最小行数"),
      enumField("inputMode", "prop", "输入键盘和数据类型提示", [
        "text",
        "email",
        "url",
        "tel",
        "numeric",
        "decimal",
      ]),
      field("prefix", "display", "string", "输入前缀"),
      field("suffix", "display", "string", "输入后缀"),
      field("clearable", "prop", "boolean", "是否声明为可清空输入"),
      ...FORM_FIELDS,
      ...VISUAL_FIELDS,
    ]),
    component("CheckBox", "复选框组件", [
      field("label", "display", "string", "复选框标签", { required: true }),
      field("name", "prop", "string", "字段名称"),
      field("value", "model", "booleanOrBinding", "复选框勾选状态", {
        required: true,
        targetProp: "modelValue",
        updateEvent: "update:modelValue",
      }),
      field("description", "display", "string", "复选框补充说明"),
      enumField("labelPosition", "visual", "标签位置", ["left", "right"]),
      ...FORM_FIELDS,
      ...VISUAL_FIELDS,
    ]),
    component("ChoicePicker", "下拉选择器", [
      field("label", "display", "string", "选择器标签", { required: true }),
      field("name", "prop", "string", "字段名称"),
      field("description", "display", "string", "补充说明"),
      field("options", "prop", "choiceOptions", "选项数组", { required: true }),
      field("value", "model", "choiceValueOrBinding", "当前选中值", {
        required: true,
        targetProp: "modelValue",
        updateEvent: "update:modelValue",
      }),
      enumField("mode", "visual", "选择器展示模式", [
        "select",
        "radio",
        "segmented",
      ]),
      field("multiple", "prop", "boolean", "是否声明为多选"),
      ...FORM_FIELDS,
      ...VISUAL_FIELDS,
    ]),
    component("Slider", "滑块组件", [
      field("label", "display", "string", "滑块标签", { required: true }),
      field("name", "prop", "string", "字段名称"),
      field("min", "prop", "numberOrBinding", "最小值", { required: true }),
      field("max", "prop", "numberOrBinding", "最大值", { required: true }),
      field("value", "model", "numberOrBinding", "当前值", {
        required: true,
        targetProp: "modelValue",
        updateEvent: "update:modelValue",
      }),
      field("step", "prop", "number", "步进值"),
      field("showValue", "prop", "boolean", "是否显示当前值"),
      field("valuePrefix", "display", "string", "数值前缀"),
      field("valueSuffix", "display", "string", "数值后缀"),
      enumField("valueDisplay", "visual", "数值展示方式", [
        "none",
        "inline",
        "tooltip",
      ]),
      field("marks", "prop", "sliderMarks", "刻度标记"),
      ...FORM_FIELDS,
      ...VISUAL_FIELDS,
    ]),
    component("DateTimeInput", "日期时间选择器", [
      field("label", "display", "string", "日期时间选择器标签", {
        required: true,
      }),
      field("name", "prop", "string", "字段名称"),
      field("value", "model", "stringOrBinding", "当前值", {
        required: true,
        targetProp: "modelValue",
        updateEvent: "update:modelValue",
      }),
      enumField("usageHint", "prop", "日期时间输入类型", [
        "date",
        "time",
        "datetime",
      ]),
      ...FORM_FIELDS,
      ...VISUAL_FIELDS,
    ]),
  ],
} as const satisfies BasicCatalogDefinition;

export const BASIC_CATALOG_COMPONENTS = BASIC_CATALOG_DEFINITION.components.map(
  (componentDef) => componentDef.component,
);

export type BasicCatalogComponent = (typeof BASIC_CATALOG_COMPONENTS)[number];

export function getBasicCatalogComponentDefinition(
  name: string,
): BasicCatalogComponentDefinition | undefined {
  return BASIC_CATALOG_DEFINITION.components.find(
    (componentDef) => componentDef.component === name,
  );
}

function component(
  name: string,
  description: string,
  fields: readonly CatalogFieldDefinition[],
  slots?: BasicCatalogComponentDefinition["slots"],
): BasicCatalogComponentDefinition {
  return {
    component: name,
    description,
    fields,
    ...(slots ? { slots } : {}),
  };
}

function field(
  name: string,
  role: CatalogFieldDefinition["role"],
  type: CatalogFieldDefinition["type"],
  description: string,
  options: Omit<
    CatalogFieldDefinition,
    "name" | "role" | "type" | "description"
  > = {},
): CatalogFieldDefinition {
  return {
    name,
    role,
    type,
    description,
    ...options,
  };
}

function enumField(
  name: string,
  role: CatalogFieldDefinition["role"],
  description: string,
  values: readonly string[],
  options: Omit<
    CatalogFieldDefinition,
    "name" | "role" | "type" | "description" | "values"
  > = {},
): CatalogFieldDefinition {
  return field(name, role, "string", description, { values, ...options });
}
