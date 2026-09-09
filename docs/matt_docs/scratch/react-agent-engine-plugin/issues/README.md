# ReAct Agent 引擎 Adapter Issues

本目录包含基于已确认架构决策拆分的实现任务。

## 顺序

1. [抽取 SPI 无关的 ReAct 引擎循环](./01-01-extract-engine.md)
2. [桥接上下文与能力调用](./02-02-host-bridge.md)
3. [语义事件、取消、预算与续跑](./03-03-events-state.md)
4. [兼容运行时迁移](./04-04-runtime-compat.md)

## 完成定义

- 每个 issue 的验收标准均有代码、测试或集成验证证据。
- 平台 Core 与 Engine Adapter 保持双向隔离。
- workflow-v1 adapter 通过公共契约测试。

