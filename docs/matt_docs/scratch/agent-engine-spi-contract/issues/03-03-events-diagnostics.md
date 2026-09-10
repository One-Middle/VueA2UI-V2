# 03 - 事件、原生诊断与终止语义

**构建内容：** 定义带 sequence 的语义事件、可选 native 结构化 payload、engineDiagnostics 及唯一终止结果。

**状态：** planned

## 范围

- 定义带 sequence 的语义事件、可选 native 结构化 payload、engineDiagnostics 及唯一终止结果。
- 遵守平台 Core 与 Engine Adapter 的双向隔离。
- 为公开行为补充与风险相称的测试。

## 验收标准

- [ ] 事件顺序可验证。
- [ ] 原始 payload 保持 JSON 结构。
- [ ] 平台业务无需解析 native payload。。

## 非目标

- 不把其他 scratch 的职责提前耦合进本 issue。
- 不引入具体引擎或平台业务类型到 SPI。

