# 01 - 核心类型与包边界

**构建内容：** 创建独立 `@a2ui-platform/agent-engine-spi` 包，定义 JSON 类型、插件、引擎、请求、选项和结果；禁止依赖平台或厂商包。

**状态：** planned

## 范围

- 创建独立 `@a2ui-platform/agent-engine-spi` 包，定义 JSON 类型、插件、引擎、请求、选项和结果；禁止依赖平台或厂商包。
- 遵守平台 Core 与 Engine Adapter 的双向隔离。
- 为公开行为补充与风险相称的测试。

## 验收标准

- [ ] SPI 包可独立构建。
- [ ] 公开 API 不含 A2UI、Workflow、Codex、ReAct 类型。。

## 非目标

- 不把其他 scratch 的职责提前耦合进本 issue。
- 不引入具体引擎或平台业务类型到 SPI。

