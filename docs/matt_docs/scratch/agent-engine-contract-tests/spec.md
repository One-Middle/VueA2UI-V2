# Agent 引擎 SPI 契约测试

## 目标

为所有 adapter 提供引擎无关的行为验证，确保“实现接口”同时意味着行为兼容。

## 范围

- 提供可复用 host fixture、事件收集器、材料目录、能力调用记录器和取消控制器。
- 验证核心 SPI 与 `workflow-v1` 能力档案。
- 分离离线契约测试和真实 SDK 集成测试。

## 必测行为

- manifest、配置 Schema、能力声明与实例生命周期。
- outputSchema 成功、失败和非法输出。
- contextCatalog、按需读取、contextUsed 的版本匹配。
- capability 调用、callId、失败与幂等关联。
- 语义事件顺序、原生 payload、唯一终止事件。
- deadline、maxEvents、maxContextBytes 和 AbortSignal。
- continuation 的归属、版本、过期和跨引擎拒绝。
- 临时错误的 retryable 分类。
- adapter 与平台业务类型之间的依赖隔离。

## 验收标准

- 第三方 adapter 可只依赖 SPI 运行测试。
- ReAct 与 Codex adapter 共用相同 workflow-v1 测试套件。
- 真实 Codex SDK 测试为显式 opt-in，不影响默认 CI。
