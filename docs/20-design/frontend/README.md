# Frontend 模块边界

`packages/frontend`

定位：平台工作台，承载用户会话、workflow 交互、预览、历史、skills、导入导出和 runtime 调试体验。

## 负责

- 工作台 UI、路由和前端状态。
- 用户输入、文件上传入口和会话操作入口。
- HTTP API 调用和 SSE 接收。
- 渲染 Agent Workflow timeline、主工作区产物和工具调用产生的特殊 UI block。
- 在会话流中展示 `clarification_form` 和 `decision_form` 对应的交互表单。
- 通过 Renderer 预览已校验 candidate A2UI。

## 不负责

- A2UI 协议渲染核心。
- Agent Runtime、模型调用和 A2UI 校验。
- 数据库访问和服务端事务。
- 直接消费 raw Agent Output。
- 自行推断 workflow gate 或替代后端做状态推进。

## 边界

- 通过 HTTP/SSE 与 `packages/backend` 交互。
- 通过 `packages/renderer` 承载 A2UI 预览。
- 通过 `packages/shared` 使用跨模块 DTO 和事件类型。
- 只渲染 API 输出中的稳定 DTO 和 parsed/validated artifacts。
- `decision_form` 是工具调用产生的特殊 UI block，不是普通 assistant message 旁边的按钮。
