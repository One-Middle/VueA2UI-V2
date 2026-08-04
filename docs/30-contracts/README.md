# 契约

`30-contracts/` 是跨模块数据交互的最高真相源。

## 文件索引

- [API 契约](./api.md)
- [A2UI v0.9 契约](./a2ui-v0.9.md)
- [数据库契约](./db-schema.md)
- [Shared 类型契约](./shared-types.md)

## 维护规则

- 只要字段、事件、消息、表结构或 DTO 跨模块传递，就必须维护在本目录。
- 未实现内容必须独立标注为 planned，不得混入当前契约正文。
- 修改本目录后，同步更新受影响的 `40-implementation/` 文档。
