# 04 - 后端依赖组装与默认策略

**构建内容：** 统一 backend 组装入口，注册 ReAct 与 Codex adapter，按后台配置选择。

**状态：** planned

## 范围

- 统一 backend 组装入口，注册 ReAct 与 Codex adapter，按后台配置选择。
- 遵守平台 Core 与 Engine Adapter 的双向隔离。
- 为公开行为补充与风险相称的测试。

## 验收标准

- [ ] 业务服务不直接创建具体引擎。
- [ ] 全局默认可切换。
- [ ] 用户无感。。

## 非目标

- 不把其他 scratch 的职责提前耦合进本 issue。
- 不引入具体引擎或平台业务类型到 SPI。

