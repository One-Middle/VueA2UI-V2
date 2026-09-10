# 01 - 抽取 SPI 无关的 ReAct 引擎循环

**构建内容：** 将现有 ReAct 解析、观察、修复循环抽取为 adapter 内部实现；移除对 workflow/A2UI 输入的直接依赖。

**状态：** planned

## 范围

- 将现有 ReAct 解析、观察、修复循环抽取为 adapter 内部实现；移除对 workflow/A2UI 输入的直接依赖。
- 遵守平台 Core 与 Engine Adapter 的双向隔离。
- 为公开行为补充与风险相称的测试。

## 验收标准

- [ ] adapter 只接收 SPI request/host。
- [ ] 旧 runtime 行为可回归。。

## 非目标

- 不把其他 scratch 的职责提前耦合进本 issue。
- 不引入具体引擎或平台业务类型到 SPI。

