# 03 - workflow-v1 契约测试

**构建内容：** 测试按需上下文读取、contextUsed、capability、事件、预算、取消与续跑。

**状态：** planned

## 范围

- 测试按需上下文读取、contextUsed、capability、事件、预算、取消与续跑。
- 遵守平台 Core 与 Engine Adapter 的双向隔离。
- 为公开行为补充与风险相称的测试。

## 验收标准

- [ ] 材料版本正确。
- [ ] callId 关联正确。
- [ ] 取消后无新调用。
- [ ] 状态隔离正确。。

## 非目标

- 不把其他 scratch 的职责提前耦合进本 issue。
- 不引入具体引擎或平台业务类型到 SPI。

