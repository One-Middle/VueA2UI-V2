# 平台工作流 Agent Host Adapter Issues

本目录包含基于已确认架构决策拆分的实现任务。

## 顺序

1. [Workflow 到通用请求投影](./01-01-request-projection.md)
2. [平台 AgentEngineHost 实现](./02-02-host-implementation.md)
3. [通用 outcome 到 workflow 状态映射](./03-03-outcome-mapping.md)
4. [Workflow 服务与通用引擎集成](./04-04-service-integration.md)

## 完成定义

- 每个 issue 的验收标准均有代码、测试或集成验证证据。
- 平台 Core 与 Engine Adapter 保持双向隔离。
- workflow-v1 adapter 通过公共契约测试。

