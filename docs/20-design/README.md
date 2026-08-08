# 设计

`20-design/` 只维护模块功能、定位和边界，帮助开发者和 Agent 在开发前理解“每个模块负责什么、不负责什么、与谁交互”。

## 文件索引

- [模块边界](./module-boundaries.md)

## 职责

- 定义模块定位。
- 定义模块负责和不负责的范围。
- 定义模块之间的交互边界。
- 为开发前阅读提供轻量地图。

## 不负责

- 不记录任务推进、spec、tickets 或 handoff；这些内容进入 `../matt_docs/`。
- 不记录 ADR；新 ADR 进入 `../matt_docs/adr/`。
- 不记录 API、DB、A2UI 或 Shared Types 字段细节；这些内容进入 `../30-contracts/`。
- 不记录当前源码真实结构、运行链路或测试方式；这些内容进入 `../40-implementation/`。

## 维护规则

- 当模块长期职责、边界或上下游关系变化时，更新 [模块边界](./module-boundaries.md)。
- 如果只是当前实现细节变化，更新 `../40-implementation/`。
- 如果涉及跨模块数据形状变化，更新 `../30-contracts/`。

