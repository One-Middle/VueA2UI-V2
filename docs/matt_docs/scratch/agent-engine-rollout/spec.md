# Agent 引擎发布与回退

## 目标

以不破坏现有工作流的方式引入通用引擎体系，并允许通过后台配置选择完整 workflow 的实际 engine。

## 范围

- 保持 ReAct adapter 可用，作为初始默认和回退实现。
- 后台配置绑定 workflow 到实际 engineId、插件版本与不透明 config。
- 记录通用结果、contextUsed、语义事件、原始事件摘要和失败原始 payload。
- 对 transient/budget/cancelled/context_insufficient 等统一结果实施明确策略。

## 全量 Codex 接管策略

Codex 可以接管完整 workflow；保留 plan 与 candidate preview 的用户确认 gate。任一 task 的 `context_insufficient` 等待用户补充文本后启动新的同 task AgentRun；A2UI 校验修复在同一 Codex turn 内进行，达到预算后再返回失败。

## 回退规则

- 新 workflow 可切换至 ReAct adapter；已运行 workflow 固定原引擎绑定。
- 不转换跨引擎 continuation；回退通过新的通用 task retry 或人工重新开始。
- 原生引擎事件只用于诊断，业务决策仅基于通用 outcome 与平台权威校验。

## 验收标准

- 后台切换引擎不改变前端协议和用户确认流程。
- ReAct 与 Codex 使用相同 workflow-v1 契约。
- 发布记录包含 adapter 版本、配置指纹、运行预算、失败分类与回退证据。
