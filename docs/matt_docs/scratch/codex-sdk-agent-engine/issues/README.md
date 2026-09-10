# Codex SDK Agent Adapter Issues

本目录包含基于已确认架构决策拆分的实现任务。

## 顺序

1. [Codex SDK 能力验证](./01-01-sdk-spike.md)
2. [私有 bridge 与 engine-host CLI](./02-02-adapter-host-cli.md)
3. [事件、结构化输出与续跑映射](./03-03-event-output-state.md)
4. [完整 workflow 接管集成](./04-04-full-workflow.md)

## 完成定义

- 每个 issue 的验收标准均有代码、测试或集成验证证据。
- 平台 Core 与 Engine Adapter 保持双向隔离。
- workflow-v1 adapter 通过公共契约测试。

