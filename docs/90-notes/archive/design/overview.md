# 项目概览

## 1. 项目定位

本项目是一个全栈 Agent 无代码 A2UI 创作平台。用户通过对话或上传 `.txt` 文件描述 UI 需求，后端编排受控 Agent Runtime 生成 A2UI v0.9 消息；消息经 `validateA2UI` 校验通过后提交，前端 Vue3 Renderer 渲染为可交互 UI。

## 2. 核心目标

- 让产品和设计用户无需编写前端代码即可生成 UI 草稿。
- 用固定 Basic Catalog 和 A2UI Schema 约束模型输出。
- 保留会话、消息、A2UI events、surface snapshots 和 Agent run 记录。
- 支持连续多轮修改，并能回放当前 surface 状态。

## 3. 核心模块

- `packages/shared`：共享类型、API DTO、SSE event、Agent result、A2UI message 类型。
- `packages/renderer`：Vue3 A2UI Renderer，负责协议消息处理、surface 状态和 Basic Catalog 渲染。
- `packages/frontend`：平台工作台，负责会话、对话、预览、历史、skills、导入导出和 runtime 调试界面。
- `packages/backend`：Express API、Prisma、PostgreSQL、SSE、文件上传、Agent run 编排和提交事务。
- `packages/agent`：Agent Runtime、上下文构建、Prompt、模型调用、输出解析、A2UI 校验和修复循环。

## 4. 用户主流程

```text
用户输入或上传 .txt
  -> Frontend 工作台
  -> Backend 保存消息并创建 Agent run
  -> Agent 构建上下文并调用模型
  -> validateA2UI 校验草稿
  -> Backend 提交合法 A2UI events 与 snapshot
  -> SSE / API 返回结果
  -> Renderer 渲染 UI
```

## 5. MVP 范围

包含：

- 单用户工作台。
- 自然语言生成和修改 UI。
- `.txt` 文件作为 Agent 上下文。
- 文本型 skills。
- 固定 Basic Catalog。
- A2UI v0.9 消息校验、提交和渲染。
- 会话、消息、events、snapshots、Agent runs 持久化。
- 导出会话、A2UI JSONL 和当前 snapshot。

不包含：

- 登录、多用户和权限系统。
- 任意 HTML、JavaScript 或 CSS 生成。
- 自由拖拽画布编辑器。
- 外部 HTTP/API 工具。
- 任意本地路径读取。
- 用户自定义 Catalog。
- 多 Agent 编排框架。

## 6. 相关文档

- 产品需求：[../10-product/prd.md](../10-product/prd.md)
- 系统设计：[./system-design.md](./system-design.md)
- Matt-first 工作系统：[../matt_docs/README.md](../matt_docs/README.md)
- 历史交付归档：[../90-notes/archive/delivery/](../90-notes/archive/delivery/)

