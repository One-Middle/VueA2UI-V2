# 03 - 通用 outcome 到 workflow 状态映射

**构建内容：** 校验 JSON outcome 并映射 clarification、plan、decision、candidate、context_insufficient、failure。

**状态：** planned

## 范围

- 校验 JSON outcome 并映射 clarification、plan、decision、candidate、context_insufficient、failure。
- 遵守平台 Core 与 Engine Adapter 的双向隔离。
- 为公开行为补充与风险相称的测试。

## 验收标准

- [ ] 保留 plan/candidate 确认 gate。
- [ ] context_insufficient 等待用户补充文本，并创建新的同 task AgentRun。
- [ ] A2UI 仍由平台最终校验。。

## 非目标

- 不把其他 scratch 的职责提前耦合进本 issue。
- 不引入具体引擎或平台业务类型到 SPI。
