# Renderer 模块说明

## 1. 功能定位

`packages/renderer` 是 Vue 3 A2UI v0.9 Renderer，负责消费后端已提交、前端转交的 A2UI server messages，维护 surface、component 和 dataModel 运行时状态，并用 Basic Catalog 渲染可交互 UI。

Renderer 是一个纯前端渲染运行时：它不调用后端、不访问数据库、不调用模型，也不决定 Agent 是否重试。

## 2. 技术栈

- 包路径：`packages/renderer`
- 框架：Vue 3
- 构建工具：Vite
- 语言：TypeScript
- 测试：Vitest、vue-tsc
- 依赖模块：`@a2ui-platform/shared`

## 3. 职责边界

负责：

- 处理 `createSurface`、`updateComponents`、`updateDataModel`、`deleteSurface`。
- 维护 `SurfaceGroupModel`、`SurfaceModel`、`ComponentModel`、`DataModel`。
- 渲染 Basic Catalog 组件。
- 解析 `{ path }` 动态绑定、相对路径上下文和动态 List item 作用域。
- 执行受限属性脚本和 `action.script`。
- 派发标准 A2UI action/error client message 给宿主前端。

不负责：

- 不调用后端 API。
- 不持久化会话。
- 不调用模型。
- 不校验 Agent 输出是否合法。
- 不执行 `action.functionCall`。
- 不把内部状态放入 Frontend Pinia。

## 4. 真实工程结构

```text
packages/renderer/src/
  catalog-registry.ts
  env.d.ts
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
    __tests__/
    js-runtime/
      ast-guard.ts
      create-js-runtime.ts
      errors.ts
      index.ts
      js-runtime.config.ts
      json.ts
      types.ts
      validation.ts
      implementations/
        function-js-runtime.ts
        ses-js-runtime.ts
  vue/
    A2uiComponent.vue
    A2uiSurface.vue
    context.ts
    __tests__/
  components/
    index.ts
    basic/
      AudioPlayerComponent.vue
      ButtonComponent.vue
      CardComponent.vue
      CheckBoxComponent.vue
      ChoicePickerComponent.vue
      ColumnComponent.vue
      DateTimeInputComponent.vue
      DividerComponent.vue
      IconComponent.vue
      ImageComponent.vue
      ListComponent.vue
      ModalComponent.vue
      RowComponent.vue
      SliderComponent.vue
      TabsComponent.vue
      TextComponent.vue
      TextFieldComponent.vue
      VideoComponent.vue
      visual-props.ts
      __tests__/
```

## 5. 关键文件职责

| 文件 / 目录 | 作用 |
| --- | --- |
| `src/index.ts` | 包导出入口，暴露核心模型、消息处理器、action 工具、JSRuntime API、Catalog 注册和 Vue 组件。 |
| `src/core/message-processor.ts` | A2UI server messages 消费入口，只接受 `version === "v0.9"`。 |
| `src/core/surface-model.ts` | `SurfaceGroupModel` 和 `SurfaceModel`，管理 surface、组件集合和 dataModel。 |
| `src/core/component-model.ts` | 保存组件类型、原始属性和 children 引用。 |
| `src/core/data-model.ts` | JSON Pointer 数据读写和订阅通知。 |
| `src/core/data-context.ts` | 渲染时数据读取、写入、相对路径解析和子作用域。 |
| `src/core/dynamic-value.ts` | 解析 `{ path }` 和脚本动态值。 |
| `src/core/action.ts` | 解析 `action.event`、`action.script`、`action.functionCall`，并创建标准 action message。 |
| `src/core/component-context.ts` | 组件渲染上下文，封装 action/error 派发和动态值解析能力。 |
| `src/core/js-runtime.ts` | JSRuntime 兼容导出。 |
| `src/core/js-runtime/` | 受限脚本运行时，包含 AST guard、JSON 校验、配置、SES 和 `new Function` 两种实现。 |
| `src/vue/A2uiSurface.vue` | 单个 surface 的 Vue 渲染入口。 |
| `src/vue/A2uiComponent.vue` | 递归渲染组件模型，处理 unknown component fallback 和 action/error 派发。 |
| `src/catalog-registry.ts` | 注册 Basic Catalog 组件类型到 Vue 组件映射。 |
| `src/components/basic/*.vue` | Basic Catalog 组件实现。 |
| `src/components/basic/visual-props.ts` | 通用受控视觉属性解析。 |

## 6. 公共 API

当前 `src/index.ts` 导出：

- 核心模型：`DataModel`、`ComponentModel`、`SurfaceModel`、`SurfaceGroupModel`、`MessageProcessor`、`DataContext`。
- action 工具：`createActionMessage`、`resolveActionContext`、`resolveComponentAction`。
- JSRuntime：`initializeJsRuntime`、`isActionScriptDeclaration`、`isPropertyScriptValue`、`runActionScript`、`runPropertyScript`。
- 组件上下文：`ComponentContextImpl` 及相关类型。
- Catalog：`getCatalogComponent`、`getLoadedCatalogComponent`、`isCatalogComponent`、`catalogRegistry`、`registerBasicCatalog`。
- Vue 组件：`A2uiSurface`。

## 7. 消息处理流程

1. 宿主前端创建 `SurfaceGroupModel` 和 `MessageProcessor`。
2. 前端传入后端 committed A2UI messages。
3. `MessageProcessor` 跳过非 `v0.9` 消息。
4. `createSurface` 创建或复用 surface，并记录 `catalogId`。
5. `updateComponents` 增量更新组件集合；目标 surface 不存在时忽略并记录 warning。
6. `updateDataModel` 按 JSON Pointer 写入数据；目标 surface 不存在时忽略并记录 warning。
7. `deleteSurface` 删除指定 surface。
8. `A2uiSurface` 和 `A2uiComponent` 读取模型并渲染组件树。

## 8. 数据与交互能力

- `{ path: "/some/value" }` 会从当前 `DataContext` 读取 dataModel。
- `List` 可用 `{ path, componentId }` 遍历数组，并为每个 item 创建相对路径作用域。
- 表单类组件在绑定值为 `{ path }` 时可写回 dataModel。
- 属性脚本使用 `{ script: { code, deps, fallback } }`，只注入 `dataModel.get`。
- `action.script` 可读写当前 surface 的 dataModel，并通过 `actions.emit` 派发标准 action。
- 默认脚本执行路径是 `new Function` + AST guard；SES `Compartment` 实现保留在配置中可切换。
- `action.functionCall` 当前只识别、不执行、不派发。

## 9. Basic Catalog

当前已注册 18 个 Basic Catalog 组件：

`Text`、`Image`、`Icon`、`Video`、`AudioPlayer`、`Divider`、`Row`、`Column`、`List`、`Card`、`Tabs`、`Modal`、`Button`、`TextField`、`CheckBox`、`ChoicePicker`、`Slider`、`DateTimeInput`。

各组件字段消费状态、通用视觉属性支持范围和已知缺口维护在 [Renderer Basic Catalog 能力矩阵](./basic-catalog-capabilities.md)。

## 10. 测试与验收

- `pnpm --filter @a2ui-platform/renderer typecheck`
- `pnpm --filter @a2ui-platform/renderer test`
- 合法消息应稳定渲染。
- `updateDataModel` 根替换、深层路径更新和动态 List item 作用域应有回归测试。
- unknown component、missing child、绑定错误应有可见 fallback 或 error。
- `action.event` 应派发标准 A2UI client message。
- `action.script` 应受 JSRuntime 限制，且复用标准 action 派发链路。
- Renderer 内部状态不应进入 Frontend Pinia。

## 11. 维护规则

- 新增 Basic 组件时，同步更新 `catalog-registry.ts`、Agent schema、Shared 类型、A2UI 契约和能力矩阵。
- 修改消息处理逻辑时，同步更新 A2UI 契约和 Integration 文档。
- 修改脚本运行时能力时，同步更新 Agent schema、A2UI 契约、安全说明和相关测试。
- 修改通用视觉属性时，同步更新 `visual-props.ts`、`styles.css`、能力矩阵和组件测试。

## 12. 相关文档

- [A2UI v0.9 契约](../../../30-contracts/a2ui-v0.9.md)
- [Shared 类型契约](../../../30-contracts/shared-types.md)
- [Integration 模块说明](../integration/README.md)
- [Renderer Basic Catalog 能力矩阵](./basic-catalog-capabilities.md)


