# 03 - Codex 完整 workflow 启用

**构建内容：** 通过后台配置启用 Codex adapter，验证 session 卷、隔离目录、CLI bridge 与全链路事件。

**状态：** planned

## 范围

- 通过后台配置启用 Codex adapter，验证 session 卷、隔离目录、CLI bridge 与全链路事件。
- 遵守平台 Core 与 Engine Adapter 的双向隔离。
- 为公开行为补充与风险相称的测试。

## 验收标准

- [ ] Codex 可完整接管 workflow。
- [ ] SDK 故障按统一失败策略处理。
- [ ] 无跨引擎状态转换。。

## 非目标

- 不把其他 scratch 的职责提前耦合进本 issue。
- 不引入具体引擎或平台业务类型到 SPI。

