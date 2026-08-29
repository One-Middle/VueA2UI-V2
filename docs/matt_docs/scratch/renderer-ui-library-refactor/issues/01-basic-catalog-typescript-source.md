# 01 — 建立 Basic Catalog TypeScript 单一真源

**What to build:** Basic Catalog 组件集合、字段 schema、字段语义和字段到普通组件 props/events/slots 的映射有一个统一定义；`Modal` 不进入新正式 Catalog，但旧代码不被删除。

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] Catalog definition 使用 TypeScript object 表达当前正式支持的 Basic Catalog，不包含 `Modal`。
- [x] Catalog definition 能描述字段 schema、字段语义、model/action/slot 映射。
- [x] 现有组件清单仍可被 shared、agent、renderer 后续迁移代码引用。
- [x] 旧 `Modal` 实现文件保持不删除，只是不进入新正式 Catalog。
