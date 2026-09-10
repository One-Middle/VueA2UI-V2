# 04 - ReAct 与 Codex adapter 套件接入

**构建内容：** 将共同 suite 接到两个 adapter；分离离线测试和真实 Codex 集成测试。

**状态：** planned

## 范围

- 将共同 suite 接到两个 adapter；分离离线测试和真实 Codex 集成测试。
- 遵守平台 Core 与 Engine Adapter 的双向隔离。
- 为公开行为补充与风险相称的测试。

## 验收标准

- [ ] 默认 CI 不依赖 SDK 凭据。
- [ ] 真实 SDK 测试明确 opt-in。
- [ ] 两个 adapter 使用同一档案。。

## 非目标

- 不把其他 scratch 的职责提前耦合进本 issue。
- 不引入具体引擎或平台业务类型到 SPI。

