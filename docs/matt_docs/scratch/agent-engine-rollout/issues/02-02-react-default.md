# 02 - ReAct 默认路径与完整回归

**构建内容：** 将 ReAct adapter 设为初始默认，引擎绑定接入完整 workflow 回归。

**状态：** planned

## 范围

- 将 ReAct adapter 设为初始默认，引擎绑定接入完整 workflow 回归。
- 遵守平台 Core 与 Engine Adapter 的双向隔离。
- 为公开行为补充与风险相称的测试。

## 验收标准

- [ ] 确认、修订、候选、预览、提交和重试不回归。
- [ ] 用户无感。。

## 非目标

- 不把其他 scratch 的职责提前耦合进本 issue。
- 不引入具体引擎或平台业务类型到 SPI。

