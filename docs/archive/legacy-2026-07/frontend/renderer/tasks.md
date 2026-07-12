# Frontend Renderer 模块任务清单 v0.1

## 1. 模块边界

本任务清单只覆盖 Vue3 A2UI Renderer，不包含平台工作台、后端 API 或 Agent Runtime。

## 2. 依赖契约

必须遵守：

- `docs/frontend/renderer/a2ui-renderer-v0_9-guide.md`
- `docs/frontend/renderer/protocol/A2UI协议认识.md`
- `docs/product/agent-platform-design.md`
- `docs/development-start.md`

可并行前置条件：

- 可使用本地 mock A2UI messages。
- 不依赖真实 backend。

## 3. 任务列表

### TASK-REN-001：A2UI 类型与消息入口

- 目标：定义 A2UI v0.9 消息类型和 `MessageProcessor` 骨架。
- 依赖任务：无。
- 涉及文件区域：`packages/renderer/src/core/message-processor`、`packages/shared`。
- 实现要求：识别四类 server-to-client 消息。
- 验收标准：输入消息批次可分发到对应处理函数。
- 测试要求：四类消息分发测试。
- 不允许做什么：不渲染 UI。

### TASK-REN-002：DataModel

- 目标：实现 JSON Pointer 读写、删除和订阅。
- 依赖任务：无。
- 涉及文件区域：`packages/renderer/src/core/models`。
- 实现要求：支持 `/` 根路径和深层路径。
- 验收标准：set/get/delete 与通知行为正确。
- 测试要求：深层对象、数组路径、删除测试。
- 不允许做什么：不使用 ad hoc 字符串拼接替代 JSON Pointer 解析。

### TASK-REN-003：Surface 与 Component 模型

- 目标：实现 surface、component map 和更新事件。
- 依赖任务：TASK-REN-001、TASK-REN-002。
- 涉及文件区域：`packages/renderer/src/core/models`。
- 实现要求：支持 component 类型变化时重建。
- 验收标准：create/update/delete surface 和 components 可用。
- 测试要求：组件新增、更新、类型变化。
- 不允许做什么：不在模型层写 Vue 组件逻辑。

### TASK-REN-004：MessageProcessor 完整处理

- 目标：实现四类消息更新模型。
- 依赖任务：TASK-REN-003。
- 涉及文件区域：`packages/renderer/src/core/message-processor`。
- 实现要求：createSurface、updateComponents、updateDataModel、deleteSurface。
- 验收标准：消息处理后模型状态正确。
- 测试要求：协议消息处理测试。
- 不允许做什么：不接受 v0.8 消息。

### TASK-REN-005：DataContext 与 ComponentContext

- 目标：支持动态值、basePath、setter、buildChild、action。
- 依赖任务：TASK-REN-004。
- 涉及文件区域：`packages/renderer/src/core/data-context`、`packages/renderer/src/core/component-context`。
- 实现要求：相对路径继承父 context。
- 验收标准：动态列表 item basePath 正确。
- 测试要求：path binding、relative path、setter。
- 不允许做什么：不把全局字符串插值作为默认行为。

### TASK-REN-006：Vue 渲染入口

- 目标：实现 `A2uiSurface` 和递归渲染。
- 依赖任务：TASK-REN-005。
- 涉及文件区域：`packages/renderer/src/vue`。
- 实现要求：使用 Vue 3；固定从 `root` 开始；不使用 Pinia。
- 验收标准：可渲染 root Text。
- 测试要求：root 缺失 fallback。
- 不允许做什么：不在组件里直接改 backend 状态。

### TASK-REN-007：最小 Basic Catalog 组件

- 目标：实现 `Text`、`Row`、`Column`、`Button`、`TextField`。
- 依赖任务：TASK-REN-006。
- 涉及文件区域：`packages/renderer/src/components/basic`。
- 实现要求：Button 派发 action，TextField 写回 data model。
- 验收标准：表单最小样例可交互。
- 测试要求：渲染、输入、点击测试。
- 不允许做什么：不使用 HTML 字符串注入。

### TASK-REN-008：Fallback 与 error 派发

- 目标：处理 missing child、unknown component、action 解析失败。
- 依赖任务：TASK-REN-006。
- 涉及文件区域：`packages/renderer/src/core`、`packages/renderer/src/vue`。
- 实现要求：错误可见且可通过回调上报。
- 验收标准：异常消息不导致应用崩溃。
- 测试要求：unknown component、missing child。
- 不允许做什么：不吞掉错误。

### TASK-REN-009：动态列表

- 目标：支持 `children: { path, componentId }`。
- 依赖任务：TASK-REN-005、TASK-REN-006。
- 涉及文件区域：`packages/renderer/src/core`。
- 实现要求：为每个 item 传入正确 basePath。
- 验收标准：数组长度变化时渲染项数变化。
- 测试要求：新增/删除列表项。
- 不允许做什么：不复制模板组件状态到每个 item。

### TASK-REN-010：补齐 Basic Catalog

- 目标：实现剩余 Basic Catalog 组件。
- 依赖任务：TASK-REN-007。
- 涉及文件区域：`packages/renderer/src/components/basic`。
- 实现要求：覆盖 PRD 中列出的所有组件。
- 验收标准：每个组件至少有一个渲染样例。
- 测试要求：每个组件最小测试。
- 不允许做什么：不新增 Catalog 外组件。
