# 01 - Codex SDK 能力验证

**构建内容：** 以 @openai/codex-sdk 锁定版本，验证 API Key、runStreamed、outputSchema、resumeThread、取消、session 卷与工作目录。

**状态：** planned

## 范围

- 以 @openai/codex-sdk 锁定版本，验证 API Key、runStreamed、outputSchema、resumeThread、取消、session 卷与工作目录。
- 遵守平台 Core 与 Engine Adapter 的双向隔离。
- 为公开行为补充与风险相称的测试。

## 验收标准

- [ ] 记录真实版本/API。
- [ ] 确认 CLI item 类型与取消行为。
- [ ] 失败不伪造已支持能力。。

## 非目标

- 不把其他 scratch 的职责提前耦合进本 issue。
- 不引入具体引擎或平台业务类型到 SPI。

