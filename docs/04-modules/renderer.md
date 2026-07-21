# Renderer 模块说明

## 1. 功能定位

`packages/renderer` 是 Vue3 A2UI v0.9 Renderer，负责消费合法 A2UI 消息，维护 surface/component/data model 状态，并用 Basic Catalog 渲染可交互 UI。

输入：后端已提交、前端转交的 A2UI server-to-client 消息。  
输出：渲染结果、用户交互 action、渲染或绑定 error。

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
- 处理数据绑定、动态 children、action context 和 fallback。
- 派发 action/error 给宿主前端。

不负责：

- 不调用后端 API。
- 不持久化会话。
- 不调用模型。
- 不决定 Agent 是否重试。
- 不把内部状态放入 Pinia。

## 4. 代码工程结构

```text
packages/renderer/src/
  catalog-registry.ts
  env.d.ts
  index.ts
  logger.ts
  styles.css
  core/
    catalog.ts
    component-context.ts
    component-model.ts
    data-context.ts
    data-model.ts
    message-processor.ts
    surface-model.ts
    surface-model.test.ts
  vue/
    A2uiComponent.vue
    A2uiSurface.vue
    context.ts
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
```

## 5. 文件职责说明

| 文件 / 目录 | 作用 |
| --- | --- |
| `src/index.ts` | 包导出入口，暴露 Renderer 核心模型、Vue 组件和注册能力。 |
| `src/catalog-registry.ts` | 注册 Basic Catalog 组件类型与 Vue 组件映射。 |
| `src/styles.css` | Renderer 基础样式。 |
| `src/logger.ts` | Renderer 日志辅助。 |
| `src/env.d.ts` | Vite / Vue 类型声明。 |
| `src/core/catalog.ts` | Catalog 类型、组件定义和注册表抽象。 |
| `src/core/message-processor.ts` | A2UI 消息处理入口，负责按消息类型更新 surface group。 |
| `src/core/surface-model.ts` | `SurfaceModel` 与 `SurfaceGroupModel`，管理 surface、组件集合和 data model。 |
| `src/core/surface-model.test.ts` | surface model 测试。 |
| `src/core/component-model.ts` | 组件模型，保存组件类型、props、children 引用等。 |
| `src/core/data-model.ts` | JSON Pointer 数据读写与订阅。 |
| `src/core/data-context.ts` | 组件渲染时的数据读取、写入和表达式解析上下文。 |
| `src/core/component-context.ts` | 组件渲染上下文，封装 action/error 派发能力。 |
| `src/vue/context.ts` | Vue provide/inject 上下文定义。 |
| `src/vue/A2uiSurface.vue` | 单个 surface 的 Vue 渲染入口。 |
| `src/vue/A2uiComponent.vue` | 递归渲染组件模型，并处理 unknown component fallback。 |
| `src/components/index.ts` | Basic 组件统一导出。 |
| `src/components/basic/*.vue` | 各 Basic Catalog 组件实现。 |
| `src/components/basic/visual-props.ts` | Basic 组件通用受控视觉属性解析。 |

## 6. 关键类 / 核心对象 / 关键文件

| 名称 | 位置 | 作用 | 为什么重要 |
| --- | --- | --- | --- |
| `MessageProcessor` | `src/core/message-processor.ts` | 按 A2UI 消息类型更新 surface group。 | Renderer 消费协议消息的入口。 |
| `SurfaceGroupModel` | `src/core/surface-model.ts` | 管理多个 surface、组件集合和 data model。 | Renderer 顶层运行时状态容器。 |
| `SurfaceModel` | `src/core/surface-model.ts` | 管理单个 surface 的 root、组件和数据。 | 单个 UI surface 的核心状态模型。 |
| `ComponentModel` | `src/core/component-model.ts` | 保存组件类型、props、children 引用等。 | 组件树渲染和更新的基础数据结构。 |
| `DataModel` | `src/core/data-model.ts` | 处理 JSON Pointer 数据读写与订阅。 | 支撑数据绑定和动态 UI 更新。 |
| `ComponentContext` | `src/core/component-context.ts` | 封装 action/error 派发和动态上下文。 | Basic 组件与宿主前端交互的边界。 |
| `A2uiComponent` | `src/vue/A2uiComponent.vue` | 递归渲染组件模型。 | 组件树从模型到 Vue 视图的核心入口。 |
| `catalog-registry` | `src/catalog-registry.ts` | 注册 Basic Catalog 类型与 Vue 组件映射。 | 新增或调整 Basic 组件时必须同步维护。 |

## 7. Basic 组件职责

| 组件文件 | 作用 |
| --- | --- |
| `TextComponent.vue` | 文本展示。 |
| `ImageComponent.vue` | 图片展示。 |
| `IconComponent.vue` | 图标展示。 |
| `VideoComponent.vue` | 视频展示。 |
| `AudioPlayerComponent.vue` | 音频播放。 |
| `RowComponent.vue` | 横向布局容器。 |
| `ColumnComponent.vue` | 纵向布局容器。 |
| `ListComponent.vue` | 列表渲染。 |
| `CardComponent.vue` | 卡片容器。 |
| `TabsComponent.vue` | 标签页容器。 |
| `ModalComponent.vue` | 模态弹窗。 |
| `ButtonComponent.vue` | 按钮与 action 派发。 |
| `TextFieldComponent.vue` | 文本输入和数据绑定。 |
| `CheckBoxComponent.vue` | 布尔输入和数据绑定。 |
| `ChoicePickerComponent.vue` | 单选/多选输入。 |
| `SliderComponent.vue` | 数值滑块输入。 |
| `DateTimeInputComponent.vue` | 日期时间输入。 |
| `DividerComponent.vue` | 分隔线。 |

## 8. 核心流程

消息处理：

1. 宿主前端创建 `SurfaceGroupModel` 与 `MessageProcessor`。
2. 前端传入已校验 A2UI 消息批次。
3. `MessageProcessor` 根据消息类型更新 surface、components 或 data model。
4. `A2uiSurface` 读取当前 surface。
5. `A2uiComponent` 从 root 开始递归渲染组件。

用户交互：

1. Basic 组件触发 action 或数据写回。
2. `ComponentContext` 解析动态上下文、属性脚本和 action 上下文。
3. Renderer 派发 action/error 给宿主前端，或执行受限 `action.script` 后再通过注入的 `actions.emit` 派发事件。
4. 前端调用后端 Renderer 回传 API。

Action 格式说明：

- A2UI 契约目标以官网式 `Button.action.event` 为准，详见 [A2UI v0.9 契约](../03-contracts/a2ui-v0.9.md)。
- Renderer 回传 action 时生成标准 A2UI client message，并在 `action.kind` 中标记 `"event"`。
- Renderer 支持受限 `action.script`，脚本可读写当前 surface 的 `dataModel`，并通过 `actions.emit` 复用标准 action 派发链路。
- `action.functionCall` 作为未来能力保留在 shared 类型和文档中，但当前 Renderer 暂不执行，Agent schema 也不放行。
- Renderer 当前只派发 `action.event` 或由 `action.script` 显式 emit 的事件；旧版扁平 `{ name, context }` 不再兼容。

属性脚本说明：

- Renderer 支持 `{ script: { code, deps, fallback } }` 属性脚本，用于只读计算属性值。
- 属性脚本通过 SES `Compartment` 同步执行，只注入 `dataModel.get`。
- `deps` 必填，Renderer 会注册最小订阅并在依赖路径变化后触发组件属性重新计算。
- 第一版只支持 `style.<白名单字段>.script`，不支持 `style.script` 返回完整样式对象。

## 9. 依赖契约

- A2UI：[../03-contracts/a2ui-v0.9.md](../03-contracts/a2ui-v0.9.md)
- Shared 类型：[../03-contracts/shared-types.md](../03-contracts/shared-types.md)
- 集成说明：[./integration.md](./integration.md)
- Renderer Basic Catalog 能力矩阵：[./renderer-basic-catalog-capabilities.md](./renderer-basic-catalog-capabilities.md)

## 10. 测试与验收

- `pnpm --filter @a2ui-platform/renderer typecheck`
- `pnpm --filter @a2ui-platform/renderer test`
- 合法消息可稳定渲染。
- unknown component、missing child、绑定错误有可见 fallback 或 error。
- Renderer 状态不进入 Pinia。

## 11. 维护规则

- 新增 Basic 组件时，同步更新 `catalog-registry.ts`、Agent schema、shared 类型和 `docs/03-contracts/a2ui-v0.9.md`。
- 修改消息处理逻辑时，同步更新 A2UI 契约和集成说明。

## 12. Basic Catalog 能力说明

Renderer 对 Basic Catalog 字段的实际消费状态维护在 [Renderer Basic Catalog 能力矩阵](./renderer-basic-catalog-capabilities.md)。

本文档只维护模块定位、工程结构、核心流程和维护规则，不重复列出每个组件的字段能力，避免与能力矩阵产生冲突。

## 13. 详细档案索引

更细的历史设计和协议说明维护在 `docs/99-archive/renderer/`：

- [Renderer 实施说明](../99-archive/renderer/implementation.md)
- [Renderer 实现细节](../99-archive/renderer/implementation-details.md)
- [A2UI Renderer v0.9 指南](../99-archive/renderer/a2ui-renderer-v0_9-guide.md)
- [A2UI 协议认识](../99-archive/renderer/a2ui-protocol-notes.md)
- [Basic Catalog 组件优化](../99-archive/renderer/basic-catalog-component-optimization.md)
