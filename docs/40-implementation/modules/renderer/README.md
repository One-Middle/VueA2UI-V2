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
  render/
    build-render-node.ts
    dependency-collector.ts
    render-context.ts
    render-node.ts
    resolve-action-bindings.ts
    resolve-dynamic.ts
    resolve-model-bindings.ts
    resolve-props.ts
    resolve-slots.ts
    resolve-style.ts
    vue-renderer.ts
  vue/
    A2uiSurface.vue
    RenderRoot.ts
    __tests__/
  ui/
    basic/
      AudioPlayer.vue
      Button.vue
      Card.vue
      CheckBox.vue
      ChoicePicker.vue
      Column.vue
      Container.vue
      DateTimeInput.vue
      Divider.vue
      Grid.vue
      Icon.vue
      Image.vue
      List.vue
      Row.vue
      Slider.vue
      Spacer.vue
      Tabs.vue
      Text.vue
      TextField.vue
      Video.vue
  components/
    index.ts
    basic/
      AudioPlayerComponent.vue
      ButtonComponent.vue
      CardComponent.vue
      CheckBoxComponent.vue
      ChoicePickerComponent.vue
      ColumnComponent.vue
      ContainerComponent.vue
      DateTimeInputComponent.vue
      DividerComponent.vue
      GridComponent.vue
      IconComponent.vue
      ImageComponent.vue
      ListComponent.vue
      ModalComponent.vue
      RowComponent.vue
      SliderComponent.vue
      SpacerComponent.vue
      TabsComponent.vue
      TextComponent.vue
      TextFieldComponent.vue
      VideoComponent.vue
      visual-props.ts
      __tests__/
```

`components/basic/*.vue` 和 `vue/A2uiComponent.vue` 是 legacy Basic 链路保留文件，用作历史参考和旧测试覆盖；新的 `A2uiSurface.vue` 不再通过它们递归渲染。

## 5. 关键文件职责

| 文件 / 目录                            | 作用                                                                                                            |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `src/index.ts`                         | 包导出入口，暴露核心模型、消息处理器、action 工具、JSRuntime API、新 Renderer 中间层、普通 UI 组件和 Vue 组件。 |
| `src/core/message-processor.ts`        | A2UI server messages 消费入口，只接受 `version === "v0.9"`。                                                    |
| `src/core/surface-model.ts`            | `SurfaceGroupModel` 和 `SurfaceModel`，管理 surface、组件集合和 dataModel。                                     |
| `src/core/component-model.ts`          | 保存组件类型、原始属性和 children 引用。                                                                        |
| `src/core/data-model.ts`               | JSON Pointer 数据读写和订阅通知。                                                                               |
| `src/core/data-context.ts`             | 渲染时数据读取、写入、相对路径解析和子作用域。                                                                  |
| `src/core/dynamic-value.ts`            | 解析 `{ path }` 和脚本动态值。                                                                                  |
| `src/core/action.ts`                   | 解析 `action.event`、`action.script`、`action.functionCall`，并创建标准 action message。                        |
| `src/core/component-context.ts`        | legacy Basic 组件渲染上下文；新链路不通过 provide/inject 向普通 UI 组件注入 A2UI context。                      |
| `src/core/js-runtime.ts`               | JSRuntime 兼容导出。                                                                                            |
| `src/core/js-runtime/`                 | 受限脚本运行时，包含 AST guard、JSON 校验、配置、SES 和 `new Function` 两种实现。                               |
| `src/render/render-node.ts`            | Renderer 内部渲染模型，保存普通组件类型、props、事件意图、slots、依赖调试 meta。                                |
| `src/render/build-render-node.ts`      | 将 `ComponentModel` 和 dataModel 作用域解析为 RenderNode tree。                                                 |
| `src/render/resolve-*.ts`              | 通用解析器：处理动态值、普通 props、model binding、action binding、slots 和受控 style。                         |
| `src/render/dependency-collector.ts`   | 收集 `{ path }`、属性脚本 deps、List path 等 dataModel 依赖，并输出排序去重后的订阅列表。                       |
| `src/render/vue-renderer.ts`           | 将 RenderNode 翻译为 Vue VNode，并把事件意图转换成普通 Vue event handler。                                      |
| `src/vue/A2uiSurface.vue`              | 单个 surface 的 Vue 渲染入口，构建 RenderNode tree、同步依赖订阅并挂载 RenderRoot。                             |
| `src/vue/RenderRoot.ts`                | RenderNode 到 Vue VNode 的轻量根组件。                                                                          |
| `src/ui/basic/*.vue`                   | 不感知 A2UI 的普通 Basic UI 组件，只接收普通 props、slot 和 Vue 事件。                                          |
| `src/catalog-registry.ts`              | legacy Basic 组件注册表。新渲染链路不依赖它。                                                                   |
| `src/components/basic/*.vue`           | legacy Basic 组件实现，保留作参考。                                                                             |
| `src/components/basic/visual-props.ts` | legacy 受控视觉属性解析；新链路使用 `src/render/resolve-style.ts`。                                             |

## 6. 公共 API

当前 `src/index.ts` 导出：

- 核心模型：`DataModel`、`ComponentModel`、`SurfaceModel`、`SurfaceGroupModel`、`MessageProcessor`、`DataContext`。
- action 工具：`createActionMessage`、`resolveActionContext`、`resolveComponentAction`。
- JSRuntime：`initializeJsRuntime`、`isActionScriptDeclaration`、`isPropertyScriptValue`、`runActionScript`、`runPropertyScript`。
- 组件上下文：`ComponentContextImpl` 及相关类型。
- Catalog：legacy `getCatalogComponent`、`getLoadedCatalogComponent`、`isCatalogComponent`、`catalogRegistry`、`registerBasicCatalog`。
- 新 Renderer 中间层：`buildRenderTree`、`buildRenderNode`、`RenderDependencyCollector`、`renderVueNode` 和 RenderNode 相关类型。
- 普通 Basic UI 组件：`ui/basic` 导出的 20 个正式组件。
- Vue 组件：`A2uiSurface`。

## 7. 消息处理流程

1. 宿主前端创建 `SurfaceGroupModel` 和 `MessageProcessor`。
2. 前端传入后端 committed A2UI messages。
3. `MessageProcessor` 跳过非 `v0.9` 消息。
4. `createSurface` 创建或复用 surface，并记录 `catalogId`。
5. `updateComponents` 增量更新组件集合；目标 surface 不存在时忽略并记录 warning。
6. `updateDataModel` 按 JSON Pointer 写入数据；目标 surface 不存在时忽略并记录 warning。
7. `deleteSurface` 删除指定 surface。
8. `A2uiSurface` 读取模型并构建 RenderNode tree。
9. `RenderRoot` 调用 `renderVueNode`，将 RenderNode tree 渲染为普通 Vue Basic UI 组件。

## 8. 数据与交互能力

- `{ path: "/some/value" }` 由 RenderNode builder 从当前 `DataContext` 读取 dataModel，并记录订阅依赖。
- `List` 可用 `{ path, componentId }` 遍历数组，并由 `resolveSlots` 为每个 item 创建相对路径作用域。
- 表单类组件在绑定值为 `{ path }` 时，由 `resolveModelBindings` 转为 `modelValue + update:modelValue`，Vue renderer 写回 dataModel。
- 属性脚本使用 `{ script: { code, deps, fallback } }`，只注入 `dataModel.get`；`deps` 和 `dataModel.get(path)` 都按当前 `DataContext` 解析路径。
- `action.script` 可读写当前 surface 的 dataModel，并通过 `actions.emit` 派发标准 action；`dataModel.get/set(path)` 同样支持当前组件作用域下的相对路径。
- 默认脚本执行路径是 `new Function` + AST guard；SES `Compartment` 实现保留在配置中可切换。
- `action.functionCall` 当前只识别、不执行、不派发。

## 9. Basic Catalog

当前正式 Basic Catalog 包含 20 个普通 UI 组件：

`Text`、`Image`、`Icon`、`Video`、`AudioPlayer`、`Divider`、`Row`、`Column`、`Grid`、`Container`、`Spacer`、`List`、`Card`、`Tabs`、`Button`、`TextField`、`CheckBox`、`ChoicePicker`、`Slider`、`DateTimeInput`。

`Modal` 不进入新的正式组件库和新 Renderer 链路；旧 `ModalComponent.vue` 文件保留为 legacy 参考。

各组件字段消费状态、通用视觉属性支持范围和已知缺口维护在 [Renderer Basic Catalog 能力矩阵](./basic-catalog-capabilities.md)。

## 10. 测试与验收

- `pnpm --filter @a2ui-platform/renderer typecheck`
- `pnpm --filter @a2ui-platform/renderer test`
- 合法消息应稳定渲染。
- `updateDataModel` 根替换、深层路径更新和动态 List item 作用域应有回归测试。
- List item 内属性脚本和 `action.script` 的相对 `dataModel.get/set`、相对 `deps` 应有回归测试。
- unknown component、missing child、绑定错误应有可见 fallback 或 error。
- `action.event` 应派发标准 A2UI client message。
- `action.script` 应受 JSRuntime 限制，且复用标准 action 派发链路。
- Renderer 内部状态不应进入 Frontend Pinia。

## 11. 维护规则

- 新增 Basic 组件时，同步更新 `packages/shared/src/basic-catalog/catalog-definition.ts`、普通 UI 组件、Renderer resolver 或 slot rule、A2UI 契约和能力矩阵。
- 修改消息处理逻辑时，同步更新 A2UI 契约和 Integration 文档。
- 修改脚本运行时能力时，同步更新 Agent schema、A2UI 契约、安全说明和相关测试。
- 修改通用视觉属性时，同步更新 `visual-props.ts`、`styles.css`、能力矩阵和组件测试。

## 12. 相关文档

- [A2UI v0.9 契约](../../../30-contracts/a2ui-v0.9.md)
- [Shared 类型契约](../../../30-contracts/shared-types.md)
- [Integration 模块说明](../integration/README.md)
- [Renderer Basic Catalog 能力矩阵](./basic-catalog-capabilities.md)
