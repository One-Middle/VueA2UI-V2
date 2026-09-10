# Agent 引擎发布与回退 Issues

本目录包含基于已确认架构决策拆分的实现任务。

## 顺序

1. [统一可观测性与持久化策略](./01-01-observability.md)
2. [ReAct 默认路径与完整回归](./02-02-react-default.md)
3. [Codex 完整 workflow 启用](./03-03-codex-enable.md)
4. [回退与运维交接](./04-04-rollback-handoff.md)

## 完成定义

- 每个 issue 的验收标准均有代码、测试或集成验证证据。
- 平台 Core 与 Engine Adapter 保持双向隔离。
- workflow-v1 adapter 通过公共契约测试。

