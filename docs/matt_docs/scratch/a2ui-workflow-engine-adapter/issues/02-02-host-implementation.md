# 02 - 平台 AgentEngineHost 实现

**构建内容：** 实现材料读取、能力调用、运行 token、contextUsed 审计、事件桥接和取消观察。

**状态：** planned

## 范围

- 实现材料读取、能力调用、运行 token、contextUsed 审计、事件桥接和取消观察。
- 遵守平台 Core 与 Engine Adapter 的双向隔离。
- 为公开行为补充与风险相称的测试。

## 验收标准

- [ ] 材料权限和版本权威。
- [ ] callId 幂等。
- [ ] 原生 payload 只作诊断。。

## 非目标

- 不把其他 scratch 的职责提前耦合进本 issue。
- 不引入具体引擎或平台业务类型到 SPI。

