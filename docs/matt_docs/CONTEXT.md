# Context

本文档是 Matt 风格 domain glossary，只记录领域词汇、概念边界和命名约定。

## Rules

- 不写实现细节。
- 不写 spec、ticket、计划或草稿。
- 不写架构决策；重要决策写入 `adr/`。
- 术语一旦澄清，应尽快更新到本文档。

## Terms

### A2UI

Agent 与 UI renderer 之间传递界面结构、数据模型和交互意图的协议。

### Renderer

负责消费 A2UI 消息并渲染可交互 UI 的前端运行层。

### Basic Catalog

A2UI renderer 支持的一组基础组件能力集合。
