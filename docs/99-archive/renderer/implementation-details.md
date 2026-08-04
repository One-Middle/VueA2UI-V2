# Renderer 模块实现详情

> 更新时间：2026-08-04  
> 代码范围：`packages/renderer` 当前工作区状态。  
> 文档定位：记录当前 Renderer 已实现能力、真实边界和主要缺陷；不定义协议合法性。字段是否合法仍以 shared 类型、Agent schema 和 A2UI 契约为准。

## 1. 模块概述

`packages/renderer` 是 Vue 3 A2UI v0.9 Renderer。它消费已校验的 A2UI server messages，维护 surface/component/dataModel 状态，并用 Basic Catalog 组件树渲染可交互 UI。

当前能力可以概括为：

- 已具备基础 UI 树渲染、数据绑定、局部脚本、受控视觉语义和 action/error 派发能力。
- 适合渲染表单、卡片、列表、指标面板、基础媒体展示、简单播放器和轻量交互 demo。
- 仍不是完整业务 UI pattern 渲染器；复杂直播电商卡、强视觉移动端页面、覆盖层和交互状态闭环还需要更高层语义组件。

Renderer 负责：

- 处理 `createSurface`、`updateComponents`、`updateDataModel`、`deleteSurface`。
- 管理 `SurfaceGroupModel`、`SurfaceModel`、`ComponentModel`、`DataModel`。
- 渲染 Basic Catalog 组件。
- 解析 `{ path }` 动态值和 `{ script }` 属性脚本。
- 处理动态 children 模板、表单写回、按钮 action 和 Renderer error 派发。

Renderer 不负责：

- 不调用后端 API。
- 不持久化会话状态。
- 不直接调用 Agent 或模型。
- 不执行 `action.functionCall`。
- 不消费任意 HTML、CSS、`className`、`innerHTML` 或 DOM 事件处理器。
- 不保证所有 Agent schema 放行字段都有完整视觉表现。

## 2. 文件结构

```text
packages/renderer/src/
  catalog-registry.ts
  index.ts
  logger.ts
  styles.css
  core/
    action.ts
    catalog.ts
    component-context.ts
    component-model.ts
    data-context.ts
    data-model.ts
    dynamic-value.ts
    js-runtime.ts
    message-processor.ts
    surface-model.ts
    js-runtime/
      ast-guard.ts
      create-js-runtime.ts
      errors.ts
      function-js-runtime.ts
      index.ts
      js-runtime.config.ts
      ses-js-runtime.ts
      types.ts
      validation.ts
  vue/
    A2uiSurface.vue
    A2uiComponent.vue
    context.ts
  components/
    index.ts
    basic/
      TextComponent.vue
      ImageComponent.vue
      IconComponent.vue
      VideoComponent.vue
      AudioPlayerComponent.vue
      DividerComponent.vue
      RowComponent.vue
      ColumnComponent.vue
      GridComponent.vue
      ContainerComponent.vue
      SpacerComponent.vue
      ListComponent.vue
      CardComponent.vue
      TabsComponent.vue
      ModalComponent.vue
      ButtonComponent.vue
      TextFieldComponent.vue
      CheckBoxComponent.vue
      ChoicePickerComponent.vue
      SliderComponent.vue
      DateTimeInputComponent.vue
      visual-props.ts
```

## 3. 消息处理能力

当前只接受 `version === "v0.9"` 的 server message。

| 消息 | 当前能力 | 边界 |
| --- | --- | --- |
| `createSurface` | 创建或获取 `SurfaceModel`，记录 `surfaceId` 和 `catalogId`。 | 不消费 theme、capabilities、metadata 等扩展字段。 |
| `updateDataModel` | 写入或替换 dataModel。`path` 为 `undefined` 或 `/` 时替换根数据；深层路径会自动创建中间对象或数组。 | 目标 surface 不存在时忽略并记录 warning。 |
| `updateComponents` | 按组件数组更新当前 surface 的组件集合。组件 `id` 和 `component` 类型不变时更新属性；类型变化时重建。 | 这是替换式增量：新数组里没有的旧组件会被删除。 |
| `deleteSurface` | 删除 surface，并清理组件和 dataModel 订阅。 | 删除后对应 `A2uiSurface` 显示 surface 缺失。 |

渲染入口要求 surface 中存在 `id: "root"` 的组件，否则显示 `Root 组件未定义`。

## 4. 核心模型

### 4.1 状态链路

```text
A2UIServerMessage[]
  -> MessageProcessor
  -> SurfaceGroupModel
  -> SurfaceModel
  -> ComponentModel + DataModel
  -> A2uiSurface
  -> A2uiComponent
  -> Basic Catalog Vue Component
```

### 4.2 Surface

- `SurfaceGroupModel` 管理多个 surface。
- `SurfaceModel` 管理单个 surface 的 component map 和 dataModel。
- `A2uiSurface.vue` 只负责指定 surface 的 root 渲染和缺失 fallback。

### 4.3 Component

- `ComponentModel` 保存组件类型和原始 props。
- `children` 支持静态 child id：`"childId"`。
- `children` 支持动态模板：`{ "path": "/items", "componentId": "itemTemplate" }`。
- `child` 是单子组件引用，常用于 `Card`、`Button`、`Container`、`Modal` 等。
- 未注册组件类型会显示 fallback，不执行动态代码。

### 4.4 DataModel

`DataModel` 基于 JSON Pointer 读写：

- `get("/")` 读取根数据。
- `set("/")` 替换根数据。
- 深层 `set("/a/0/name")` 会自动创建中间对象或数组。
- 支持 RFC 6901 转义：`~0` 表示 `~`，`~1` 表示 `/`。
- `subscribe(path, callback)` 支持路径级订阅；根替换会通知所有订阅，深层写入会通知该路径和祖先路径。
- `delete(path)` 可删除路径值，但当前正式 A2UI server message 没有直接暴露 delete dataModel message。

## 5. 动态值与脚本能力

### 5.1 `{ path }` 动态绑定

组件属性如果是严格对象 `{ "path": "..." }`，Renderer 会按当前 `DataContext` 解析：

- `/` 开头表示绝对路径。
- 非 `/` 开头表示相对于当前 item/basePath 的相对路径。
- 动态 `List` 和 `Grid` 模板会给每个 item 创建独立 basePath。

注意：`DataContext.resolve` 在路径值不存在时会返回原始 path 字符串。这有利于 demo 兜底展示，但也意味着缺失路径不一定表现为空值。

### 5.2 属性脚本

组件属性可使用：

```json
{
  "script": {
    "code": "return `¥${dataModel.get('/price')}`;",
    "deps": ["/price"],
    "fallback": "¥0"
  }
}
```

当前规则：

- 属性脚本必须同步执行。
- `code` 最长 2000 字符。
- `deps` 必填，数量 1 到 32。
- 必须显式 `return` 或 `throw`。
- 不支持 `import`、`async`、`await`。
- 只注入 `dataModel.get`，不注入写能力、DOM、网络或定时器能力。
- 失败时使用 `fallback`，并派发 `a2ui:error`。

执行路径：

- JSRuntime 通过工厂创建。
- 当前默认实现是 `new Function` + AST guard。
- SES `Compartment` 实现仍保留，可通过 `js-runtime.config.ts` 切换。
- AST guard 会拦截 `window`、`document`、`globalThis`、`fetch`、`Function`、`eval`、`constructor`、`prototype`、`__proto__`、动态成员访问等高风险入口。

### 5.3 样式脚本

样式脚本只支持出现在受控 style 白名单字段上：

```json
{
  "style": {
    "color": {
      "script": {
        "code": "return dataModel.get('/ok') ? '#16a34a' : '#dc2626';",
        "deps": ["/ok"],
        "fallback": "#dc2626"
      }
    }
  }
}
```

不支持 `style.script` 返回完整样式对象。

## 6. Action 与交互能力

当前只有 `Button` 消费 `action`。

| action | 当前状态 | 行为 |
| --- | --- | --- |
| `action.event` | 支持 | 点击后解析 `context`，派发 `window.CustomEvent("a2ui:action")`。 |
| `action.script` | 支持 | 点击后执行受限脚本，可读写 dataModel，并通过 `actions.emit` 派发标准 action。 |
| `action.functionCall` | 识别但不执行 | 当前不会调用函数、不会派发 action。 |
| 历史扁平 action | 不支持 | `{ action: { name, context } }` 不再兼容。 |

派发消息形状：

```json
{
  "version": "v0.9",
  "action": {
    "kind": "event",
    "name": "submit",
    "surfaceId": "main",
    "sourceComponentId": "submitButton",
    "timestamp": "2026-08-04T00:00:00.000Z",
    "context": {}
  }
}
```

错误通过 `window.CustomEvent("a2ui:error")` 派发。

## 7. 受控视觉能力

### 7.1 通用修饰字段

| 字段 | 行为 |
| --- | --- |
| `variant` | 生成 `a2ui-<block>--variant-<value>` class。 |
| `size` | 生成 `a2ui-<block>--size-<value>` class。 |
| `tone` | 生成 `a2ui-<block>--tone-<value>` class。 |
| `preset` | 生成 `a2ui-<block>--preset-<value>` class。 |

这些字段只生成 Renderer 自有 class，具体视觉取决于 `packages/renderer/src/styles.css` 是否定义对应规则。

### 7.2 `style` 白名单

当前直接透传字段：

- 尺寸：`width`、`height`、`minWidth`、`maxWidth`、`minHeight`、`maxHeight`
- 间距：`padding`、`margin`、`gap`
- 颜色与边框：`color`、`backgroundColor`、`borderColor`、`borderWidth`、`borderRadius`
- 文本：`fontSize`、`fontWeight`、`lineHeight`、`textAlign`
- 对齐：`alignSelf`、`justifySelf`
- 效果：`opacity`

派生字段：

- `paddingX` / `paddingY`
- `marginX` / `marginY`
- `shadow`：支持 `none`、`xs`、`sm`、`md`、`lg`，也允许字符串 fallback。

不支持：

- `position`、`zIndex`、`display`、`gridArea`、`backgroundImage`、`backdropFilter`、`objectPosition`、`flexShrink`、任意 CSS selector、`className`。

## 8. Basic Catalog 组件能力矩阵

当前注册组件共 21 个：

`Text`、`Image`、`Icon`、`Video`、`AudioPlayer`、`Divider`、`Row`、`Column`、`Grid`、`Container`、`Spacer`、`List`、`Card`、`Tabs`、`Modal`、`Button`、`TextField`、`CheckBox`、`ChoicePicker`、`Slider`、`DateTimeInput`。

| 组件 | 当前能力 | 主要字段 | 主要边界 |
| --- | --- | --- | --- |
| `Text` | 文本展示、标题层级、多行截断、单行截断、语义强调。 | `text`、`usageHint`、`maxLines`、`decoration`、`role`、`emphasis`、`truncate`、通用视觉字段。 | 不支持富文本、Markdown、内联图标、局部 span 样式。 |
| `Image` | 图片展示、加载策略、裁剪、比例、形状、失败 fallback、caption。 | `url`、`alt`、`fit`、`aspectRatio`、`loading`、`role`、`shape`、`fallbackText`、`caption`、通用视觉字段。 | 无 skeleton、overlay、焦点位、渐变遮罩；`caption` 只支持字符串。 |
| `Icon` | Unicode/emoji fallback 图标展示、语义可访问性。 | `name`、兼容 `icon`、`semantic`、`label`、`status`、通用视觉字段。 | 没有真实图标库；未知图标名直接显示文本。 |
| `Video` | 原生视频播放。 | `url`。 | 不消费 `poster/autoplay/loop/muted/fit/aspectRatio`，无直播状态、overlay、封面降级。 |
| `AudioPlayer` | 原生音频播放。 | `url`。 | 不消费 `autoplay/loop/muted/density`，无自定义播放器 UI。 |
| `Divider` | 基础分隔线。 | 当前无额外字段。 | 不支持方向、厚度、颜色、label、间距语义。 |
| `Row` | 横向 flex 布局。 | `children`、`distribution`、`alignment`、`gap`、`wrap`、`role`、`density`、`divider`、通用视觉字段。 | 无命名 region、无压缩优先级、无 overlay/sticky 能力。 |
| `Column` | 纵向 flex 布局。 | `children`、`distribution`、`alignment`、`gap`、`wrap`、`role`、`density`、`divider`、通用视觉字段。 | 无复杂布局预设，`wrap` 默认与 Row 不同。 |
| `Grid` | 二维网格，支持静态 children 和动态模板 children。 | `children`、`columns`、`minItemWidth`、`gap`、通用视觉字段。 | 只支持简单 repeat 布局；无 grid area、row/column span、item key。 |
| `Container` | 页面/区块容器，提供受控宽度、内边距和水平对齐。 | `child`、`width`、`padding`、`align`、通用视觉字段。 | 只支持单 child；不是完整 page/layout 系统。 |
| `Spacer` | 受控空隙或弹性占位。 | `axis`、`size`、`flex`。 | 不接入通用 style；只支持预设尺寸。 |
| `List` | 静态列表和动态列表模板。 | `children`、`emptyText`、`loading`、`itemRole`、`dividers`。 | 无排序/过滤/分页、item key、selection 视觉闭环；loading 文案固定为“加载中...”。 |
| `Card` | 卡片容器，可带 header/subtitle/footer。 | `child`、兼容 `children`、`header/title`、`subtitle`、`footer`、`role`、`density`、`selected`、`clickable`、通用视觉字段。 | `clickable` 只有视觉/光标，不自动派发 action；无命名 slots。 |
| `Tabs` | 本地 tab 选择和内容切换。 | `tabItems`、兼容 `tabs`。 | 选中态只在组件本地，不写回 dataModel；样式和布局字段较少。 |
| `Modal` | 基础模态框和本地关闭。 | `child`。 | 缺少受控 `visible`、trigger、placement、size、关闭策略和 header/footer 区域。 |
| `Button` | 按钮文本/图标、禁用/加载、action 派发和脚本 action。 | `child`、`label`、`icon`、`iconPosition`、`intent`、`shape`、`importance`、`fullWidth`、`disabled`、`loading`、`action`、通用视觉字段。 | 无 ButtonGroup、无 loading spinner、无 confirm UI；`functionCall` 不执行。 |
| `TextField` | 文本输入、textarea、类型映射、双向写回、辅助/错误信息。 | `label`、`text`、`usageHint`、`inputMode`、`description`、`placeholder`、`helpText`、`errorText`、`validationState`、`density`、`disabled`、`required`、`readonly`、`prefix`、`suffix`。 | 未接入通用 style；无复杂 formatter/mask。 |
| `CheckBox` | 布尔输入、双向写回、描述/帮助/错误。 | `label`、`value`、`description`、`helpText`、`errorText`、`validationState`、`density`、`disabled`、`required`。 | 不支持 indeterminate、labelPosition、checkbox group。 |
| `ChoicePicker` | select 和 segmented/radio-like 按钮组，双向写回。 | `options`、`value`、`label`、`description`、`placeholder`、`helpText`、`errorText`、`validationState`、`density`、`mode`、`disabled`、`required`。 | 不支持多选、搜索、异步 options、复杂 option render。 |
| `Slider` | 数值滑块、双向写回、值显示、辅助/错误信息。 | `min`、`max`、`step`、`value`、`showValue`、`valueDisplay`、`valuePrefix`、`valueSuffix`、`label`、`helpText`、`errorText`、`validationState`、`density`、`disabled`、`required`、通用视觉字段。 | 无 marks/range 双滑块、formatter 回调。 |
| `DateTimeInput` | 日期/时间/日期时间输入，双向写回。 | `label`、`value`、`usageHint`、`description`、`placeholder`、`helpText`、`errorText`、`validationState`、`density`、`disabled`、`required`、`readonly`。 | 未接入通用 style；依赖浏览器原生控件。 |

## 9. 当前可实现的典型 UI

现在 Renderer 可以比较稳定地实现：

- 商品卡、课程卡、音乐播放卡、待办列表、指标看板等卡片式 UI。
- 表单填写和本地 dataModel 写回。
- 动态列表或动态网格模板。
- 基于 dataModel 的派生文本、状态文案和动态样式字段。
- 按钮事件回传和简单本地脚本状态更新。
- 受控视觉层级：价格、旧价格、折扣、状态、强调、密度、按钮意图、图片角色等。

## 10. 目前能力缺陷

### 10.1 仍偏基础组件渲染器

Renderer 能渲染基础 UI 树，但还缺少直播电商卡、商品货架、价格组、媒体卡、操作栏等复合业务组件。复杂 UI 只能由 `Card/Row/Column/Text/Image/Button` 拼装，节点多、结构啰嗦，且效果不稳定。

### 10.2 缺少 region / slot 抽象

多数容器只有 `child` 或 `children`。复杂 UI 需要命名区域，例如 `media`、`overlay`、`header`、`body`、`footer`、`actions`、`badge`。当前只能顺序排版，难以自然表达覆盖、贴边、吸底和分区。

### 10.3 布局模型不够强

`Row/Column/Grid` 能做常规排列，但缺少：

- overlay 覆盖层。
- sticky actions。
- safe-area。
- 子项压缩优先级。
- `objectPosition` / crop focus。
- grid span / area。
- 响应式断点语义。

### 10.4 视觉 token / variant 系统不足

当前很多复杂视觉仍依赖局部 `style`，例如电商橙红按钮、直播 badge、深色媒体条。更理想的是提供语义 token 或组件 variant，例如 `commerce.buyNow`、`badge.live`、`surface.mediaOverlay`。

### 10.5 媒体能力偏弱

`Video` 和 `AudioPlayer` 只是原生控件包装。缺少 poster、封面、overlay、播放状态绑定、直播状态、播放器控制组和错误 fallback。

### 10.6 交互状态闭环不足

Renderer 可以派发 action，但缺少：

- action loading 自动联动。
- optimistic UI。
- success/error toast。
- confirm dialog。
- action result 回写约定。
- disabled reason。

### 10.7 表单能力仍是基础级

表单组件已有帮助、错误、密度、禁用和 required，但还缺少完整表单容器、字段组、校验规则、提交状态、联动校验和复杂输入类型。

### 10.8 style 白名单存在天然边界

受控 style 是正确边界，但它会限制像素级复刻能力。若无限扩充 CSS 白名单，A2UI 会退化成 HTML/CSS 协议，破坏跨端一致性、安全性和 Renderer 可控性。

## 11. 建议演进顺序

建议优先补语义组件，而不是继续扩普通 CSS 白名单：

1. Region / Slot 基础能力：为复合组件提供命名区域。
2. Overlay / MediaFrame：解决图片/视频上的 badge、渐变遮罩、底部条和 caption。
3. ActionBar / ButtonGroup：解决双 CTA、等宽粘连、主次操作和吸底操作区。
4. PriceCluster：表达价格、货币符号、小数、补贴价、销量、权益文案。
5. ProductShelfItem / CommerceCard：承载直播电商、商品货架和详情入口。
6. 设计 token / variant：把 `commerce.buyNow`、`badge.live`、`text.price` 这类业务视觉转成受控 token。
7. Action 状态协议：补 loading、success、error、confirm、toast 等交互闭环。

## 12. 测试与验收

当前 Renderer 变更应至少运行：

```bash
pnpm --filter @a2ui-platform/renderer test
pnpm --filter @a2ui-platform/renderer typecheck
pnpm --filter @a2ui-platform/renderer demo:build
```

涉及 Agent schema 或 shared 类型时，还应运行：

```bash
pnpm --filter @a2ui-platform/agent test -- validate-a2ui
pnpm --filter @a2ui-platform/agent typecheck
pnpm --filter @a2ui-platform/shared typecheck
```
