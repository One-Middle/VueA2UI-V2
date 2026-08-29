# 03 — 让 validateA2UI 使用派生 Catalog schema

**What to build:** A2UI 校验仍保持现有协议行为，但组件和字段合法性来自 Basic Catalog Definition 派生的 JSON Schema；`Modal` 在新 Catalog 下不能通过校验。

**Blocked by:** 01 — 建立 Basic Catalog TypeScript 单一真源.

**Status:** resolved

- [x] Catalog JSON Schema 从 TypeScript Catalog definition 派生或导出，避免人工维护第二份组件字段事实源。
- [x] `validateA2UI` 使用派生 schema 校验组件名称和字段。
- [x] 仍支持现有动态值、属性脚本和 action 协议语义。
- [x] 测试覆盖支持组件通过校验、`Modal` 被拒绝、未知字段被拒绝。
