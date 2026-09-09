# 03 - EngineBinding 与续跑状态绑定

**构建内容：** 持久化 engineId、pluginVersion、配置指纹和不透明 continuation；串行化 workflow turn。

**状态：** planned

## 范围

- 持久化 engineId、pluginVersion、配置指纹和不透明 continuation；串行化 workflow turn。
- 遵守平台 Core 与 Engine Adapter 的双向隔离。
- 为公开行为补充与风险相称的测试。

## 验收标准

- [ ] 跨引擎恢复被拒绝。
- [ ] 同 workflow 无并行 turn。
- [ ] 状态 TTL 可清理。。

## 非目标

- 不把其他 scratch 的职责提前耦合进本 issue。
- 不引入具体引擎或平台业务类型到 SPI。

