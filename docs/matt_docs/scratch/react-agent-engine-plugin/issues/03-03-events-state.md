# 03 - 语义事件、取消、预算与续跑

**构建内容：** 映射 ReAct trace 到 SPI 事件，贯穿取消和预算，定义 ReAct continuation。

**状态：** planned

## 范围

- 映射 ReAct trace 到 SPI 事件，贯穿取消和预算，定义 ReAct continuation。
- 遵守平台 Core 与 Engine Adapter 的双向隔离。
- 为公开行为补充与风险相称的测试。

## 验收标准

- [ ] 事件顺序通过契约。
- [ ] 预算耗尽分类正确。
- [ ] 恢复不会混用引擎状态。。

## 非目标

- 不把其他 scratch 的职责提前耦合进本 issue。
- 不引入具体引擎或平台业务类型到 SPI。

