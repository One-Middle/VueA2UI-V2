# 04 - 兼容运行时迁移

**构建内容：** 以 workflow bridge 维持 IAgentRuntime.runWorkflowTask，并让其内部调用 ReAct adapter。

**状态：** planned

## 范围

- 以 workflow bridge 维持 IAgentRuntime.runWorkflowTask，并让其内部调用 ReAct adapter。
- 遵守平台 Core 与 Engine Adapter 的双向隔离。
- 为公开行为补充与风险相称的测试。

## 验收标准

- [ ] 现有 workflow 测试通过。
- [ ] 服务层不依赖 ReAct 私有类型。。

## 非目标

- 不把其他 scratch 的职责提前耦合进本 issue。
- 不引入具体引擎或平台业务类型到 SPI。

