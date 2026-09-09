# 01 - Workflow 到通用请求投影

**构建内容：** 将现有 workflow task、事实、artifact 版本、输出约束和预算投影为 SPI request。

**状态：** planned

## 范围

- 将现有 workflow task、事实、artifact 版本、输出约束和预算投影为 SPI request。
- 遵守平台 Core 与 Engine Adapter 的双向隔离。
- 为公开行为补充与风险相称的测试。

## 验收标准

- [ ] 请求没有引擎类型。
- [ ] task 使用 outputSchema。
- [ ] contextCatalog 只含描述与版本。。

## 非目标

- 不把其他 scratch 的职责提前耦合进本 issue。
- 不引入具体引擎或平台业务类型到 SPI。

