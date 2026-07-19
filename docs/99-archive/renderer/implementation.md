# Frontend Renderer 模块实现说明 v0.1

## 1. 模块定位

`frontend/renderer` 是 Vue3 A2UI v0.9 Renderer。它负责消费已通过后端校验的 A2UI 消息，维护 surface 状态，渲染固定 Basic Catalog 组件，并派发 action/error。

## 2. 当前权威入口

- `docs/contracts/a2ui-v0.9.md`
- `docs/modules/renderer.md`
- `docs/archive/renderer/a2ui-protocol-notes.md`
- `docs/archive/renderer/a2ui-renderer-v0_9-guide.md`
- `docs/archive/renderer/basic-catalog-component-optimization.md`

## 3. 已确定技术选型

- 包路径：`packages/renderer`
- 框架：Vue 3
- 语言：TypeScript
- 测试：Vitest
- 协议：A2UI v0.9
- Catalog：MVP 固定 Basic Catalog

实现约束：

- Renderer 内部状态使用独立模型，不使用 Pinia。
- Renderer 不依赖 Naive UI 的业务状态。
- Renderer 可以使用普通 Vue 组件实现 Basic Catalog。
- Renderer 样式必须隔离，避免污染 `packages/frontend` 工作台样式。
- Renderer 不直接调用 backend API，只通过回调派发 action/error。

## 4. 职责边界

负责：

- A2UI v0.9 server-to-client 消息处理。
- `SurfaceGroupModel`、`SurfaceModel`、`ComponentModel`、`DataModel`。
- JSON Pointer 数据绑定。
- 动态 children 与 basePath。
- Basic Catalog Vue 组件。
- action/error 派发。
- fallback 和生命周期清理。

不负责：

- 不调用后端 API。
- 不持久化会话。
- 不调用 Agent。
- 不修复非法 A2UI。
- 不实现工作台 tabs。

## 5. 核心对象

- `MessageProcessor`
- `SurfaceGroupModel`
- `SurfaceModel`
- `SurfaceComponentsModel`
- `ComponentModel`
- `DataModel`
- `DataContext`
- `ComponentContext`
- `ComponentImplementation`
- `A2uiSurface`
- `A2uiComponent`

## 6. 消息支持

必须支持：

- `createSurface`
- `updateComponents`
- `updateDataModel`
- `deleteSurface`

必须派发：

- `action`
- `error`

## 7. MVP 组件范围

优先最小闭环：

- `Text`
- `Row`
- `Column`
- `Button`
- `TextField`

完整 MVP：

- `Image`
- `Icon`
- `Video`
- `AudioPlayer`
- `Divider`
- `List`
- `Card`
- `Tabs`
- `Modal`
- `CheckBox`
- `ChoicePicker`
- `Slider`
- `DateTimeInput`

## 8. 渲染样式与属性映射

- Renderer 包入口必须加载 `styles.css`，确保工作台预览区使用 Basic Catalog 样式，而不是浏览器默认纯文本样式。
- Basic Catalog 组件能力升级应遵守 `docs/frontend/renderer/basic-catalog-component-optimization.md` 中的受控样式协议：只消费白名单样式字段和预定义枚举，不接收任意 CSS、HTML、脚本或事件处理器字段。
- `Row` 和 `Column` 需要把 A2UI 协议值映射为合法 CSS flex 值：`start -> flex-start`、`end -> flex-end`、`spaceBetween -> space-between`、`spaceAround -> space-around`、`spaceEvenly -> space-evenly`。
- `Button.action` 按 Catalog 契约解析为 `{ name, context }`，点击时派发 `a2ui:action`。
- `TextField.usageHint` 使用 `shortText`、`longText`、`number`、`obscured`，分别映射到单行输入、多行输入、数字输入和密码输入。

## 9. 验收标准

- 能处理 create/update/delete surface。
- 能从 `root` 渲染组件树。
- 能渲染 Text/Row/Column/Button/TextField 最小闭环。
- 输入组件能写回 `DataModel`。
- Button 能派发 action。
- unknown component 不导致应用崩溃。
- missing child 可显示 fallback，并在 child 到达后更新。
