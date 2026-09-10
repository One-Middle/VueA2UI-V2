# 04 - 完整 workflow 接管集成

**构建内容：** 实现澄清、plan、用户确认后恢复、candidate、自主校验修复、preview 和 context_insufficient 路径。

**状态：** planned

## 范围

- 实现澄清、plan、用户确认后恢复、candidate、自主校验修复、preview 和 context_insufficient 路径。
- 遵守平台 Core 与 Engine Adapter 的双向隔离。
- 为公开行为补充与风险相称的测试。

## 验收标准

- [ ] 保留两个确认 gate。
- [ ] 校验修复在同 turn 内。
- [ ] context_insufficient 等待用户补充文本，并启动新的同 task AgentRun。
- [ ] 真实集成测试可验证。。

## 非目标

- 不把其他 scratch 的职责提前耦合进本 issue。
- 不引入具体引擎或平台业务类型到 SPI。
