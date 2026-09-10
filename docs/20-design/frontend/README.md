# Frontend 模块边界

`packages/frontend`

定位：平台工作台，承载用户会话、workflow 交互、预览、历史、skills、导入导出和 runtime 调试体验。

## 模块功能

前端将后端的稳定 DTO、workflow artifact 和引擎语义事件组织为可操作的工作台：用户输入、澄清和确认均以明确的 workflow action 提交；A2UI 候选则在隔离的 Renderer 容器内预览。前端不解释 Agent 私有 trace，也不自行推进业务状态。

## 负责

- 工作台 UI、路由和前端状态。
- 用户输入、文件上传入口和会话操作入口。
- HTTP API 调用和 SSE 接收。
- 渲染 Agent Workflow timeline、主工作区产物和工具调用产生的特殊 UI block。
- 在会话流中展示 `clarification_form` 和 `decision_form` 对应的交互表单，并通过 `workflow/actions` 提交澄清、决策、重试或取消。
- 当用户在 `failed_retryable` workflow 后追加普通消息时，接收后端返回的 workflow 摘要并更新本地运行态；是否允许恢复由 Backend 决定。
- 将普通续跑消息作为独立用户气泡展示，并把后续 workflow 生成片段锚定在该消息之后，避免生成状态出现在触发消息上方。
- 消费引擎无关的 Agent 语义事件，实时展示运行进度、上下文读取、capability 与原生工具摘要。
- 通过 Renderer 预览已校验 candidate A2UI；Frontend 选择合适的 Renderer Adapter 承载预览，但不解释 A2UI 协议、动态绑定或交互语义。
- 维护 SSE 生命周期状态，消费 `connected`、`heartbeat`、workflow 和 agent run 事件。
- SSE 重连成功后执行 Session Resync，重新拉取 messages、workflows、agent runs、A2UI events、snapshots 和 session detail，以后端事实源修复断线期间漏掉的事件。
- 用户切换会话时只断开当前 SSE 监听并重置当前前端状态，不向后端表达取消运行。
- 在 workflow `interrupted` 时停止生成动画，展示“已停止，可继续”的恢复提示，并把用户的非空普通消息交给后端继续原 workflow 阶段。

## 不负责

- A2UI 协议渲染核心。
- Agent Engine SPI、adapter 私有模型调用、CLI、thread 或 A2UI 校验。
- 数据库访问和服务端事务。
- 直接消费 raw Agent Output。
- 自行推断 workflow gate 或替代后端做状态推进。
- 把普通追加消息自行解释为 workflow action；前端只转发输入并消费后端返回的稳定状态。
- 把 SSE 当作事实源或自行补放断线期间事件。
- 在用户切换会话、刷新页面或 SSE 断开时取消后端 Agent。

## 边界

- 通过 HTTP/SSE 与 `packages/backend` 交互。
- 通过 Renderer packages 承载 A2UI 预览；Frontend 可使用 Vue Adapter，也可将 DOM Adapter 挂载到独立容器，Renderer Core 始终以框架无关 Runtime 的边界接入。
- 通过 `packages/shared` 使用跨模块 DTO 和事件类型。
- 只渲染 API 输出中的稳定 DTO 和 parsed/validated artifacts。
- `decision_form` 是工具调用产生的特殊 UI block，不是普通 assistant message 旁边的按钮。
- `streamStatus` 只描述 SSE 连接生命周期；`sessionHydrationStatus` 描述会话状态同步结果。重连后如果 Session Resync 失败，SSE 仍可保持 connected，但会话同步状态进入 error。
- Session Resync 必须使用会话 ID、`_sessionRevision` 和 in-flight token 防止旧会话响应或过期同步结果污染当前状态。

## 技术栈与依赖

- Vue 3：工作台视图与交互组件。
- Vite：开发服务器和构建。
- Pinia：会话、工作区、Renderer 与 SSE 生命周期状态。
- Vue Router：页面与会话路由。
- Naive UI：通用业务控件。
- `packages/shared`：使用 API DTO 与 SSE 事件；`packages/renderer`：承载 A2UI 预览。

## 核心实现

| 对象 | 主要职责 |
| --- | --- |
| `router.ts` | 定义工作台路由、参数和页面切换边界。 |
| `workspace` store | 管理当前会话、消息、workflow、hydration 与用户 action。 |
| `renderer` store | 管理预览 surface、Renderer 生命周期与宿主事件。 |
| `PreviewPanel.vue` | 提供候选 A2UI 的预览宿主，并通过选定 Adapter 消费 Renderer Runtime。 |
| 会话 / workflow API client | 调用稳定 HTTP DTO，发起消息、确认、重试和取消。 |
| SSE client | 订阅语义事件并触发 Session Resync，避免以事件流替代事实源。 |

## 主要协作链路

```text
用户交互
  -> Vue 组件 / Pinia store
  -> Backend HTTP（消息或 WorkflowAction）
  -> SSE 语义事件 + Session Resync
  -> 解析后的 artifact / DTO
  -> PreviewPanel -> Renderer mount runtime
```
