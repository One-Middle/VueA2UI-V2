# Agent 引擎 SPI 契约 Issues

本目录包含基于已确认架构决策拆分的实现任务。

## 顺序

1. [核心类型与包边界](./01-01-core-types.md)
2. [宿主、上下文与能力协议](./02-02-host-context-capabilities.md)
3. [事件、原生诊断与终止语义](./03-03-events-diagnostics.md)
4. [预算、取消、续跑与失败协议](./04-04-limits-state-errors.md)

## 完成定义

- 每个 issue 的验收标准均有代码、测试或集成验证证据。
- 平台 Core 与 Engine Adapter 保持双向隔离。
- workflow-v1 adapter 通过公共契约测试。

