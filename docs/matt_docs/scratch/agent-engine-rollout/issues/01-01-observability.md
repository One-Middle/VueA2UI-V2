# 01 - 统一可观测性与持久化策略

**构建内容：** 保存通用事件、contextUsed、diagnostics、原生摘要、失败完整 payload、预算和配置指纹。

**状态：** planned

## 范围

- 保存通用事件、contextUsed、diagnostics、原生摘要、失败完整 payload、预算和配置指纹。
- 遵守平台 Core 与 Engine Adapter 的双向隔离。
- 为公开行为补充与风险相称的测试。

## 验收标准

- [ ] 引擎无关查询可用。
- [ ] 业务不依赖 native payload。
- [ ] 敏感数据处理有边界。。

## 非目标

- 不把其他 scratch 的职责提前耦合进本 issue。
- 不引入具体引擎或平台业务类型到 SPI。

