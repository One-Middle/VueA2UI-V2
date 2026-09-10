# 04 - 预算、取消、续跑与失败协议

**构建内容：** 定义 AgentRunOptions、AbortSignal、预算耗尽、统一失败分类、retryable 和不透明 continuation。

**状态：** planned

## 范围

- 定义 AgentRunOptions、AbortSignal、预算耗尽、统一失败分类、retryable 和不透明 continuation。
- 遵守平台 Core 与 Engine Adapter 的双向隔离。
- 为公开行为补充与风险相称的测试。

## 验收标准

- [ ] 取消后不允许新 capability 调用。
- [ ] 跨引擎状态被拒绝。
- [ ] 预算与重试不依赖引擎类型。。

## 非目标

- 不把其他 scratch 的职责提前耦合进本 issue。
- 不引入具体引擎或平台业务类型到 SPI。

