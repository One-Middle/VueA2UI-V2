# 02 - 桥接上下文与能力调用

**构建内容：** 将 ReAct 的资源读取、工具调用和观察映射为 host.readContext 与 host.invokeCapability。

**状态：** planned

## 范围

- 将 ReAct 的资源读取、工具调用和观察映射为 host.readContext 与 host.invokeCapability。
- 遵守平台 Core 与 Engine Adapter 的双向隔离。
- 为公开行为补充与风险相称的测试。

## 验收标准

- [ ] 不再依赖平台 ToolRegistry 实现。
- [ ] contextUsed 和 callId 正确回传。。

## 非目标

- 不把其他 scratch 的职责提前耦合进本 issue。
- 不引入具体引擎或平台业务类型到 SPI。

