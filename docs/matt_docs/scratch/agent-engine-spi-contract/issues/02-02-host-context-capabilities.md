# 02 - 宿主、上下文与能力协议

**构建内容：** 定义 AgentEngineHost、contextCatalog、readContext、contextUsed、capabilityCatalog、invokeCapability 与 callId 关联。

**状态：** planned

## 范围

- 定义 AgentEngineHost、contextCatalog、readContext、contextUsed、capabilityCatalog、invokeCapability 与 callId 关联。
- 遵守平台 Core 与 Engine Adapter 的双向隔离。
- 为公开行为补充与风险相称的测试。

## 验收标准

- [ ] 支持分页/预算读取。
- [ ] 能力输入输出使用 JSON Schema。
- [ ] 平台传输实现不进入 SPI。。

## 非目标

- 不把其他 scratch 的职责提前耦合进本 issue。
- 不引入具体引擎或平台业务类型到 SPI。

