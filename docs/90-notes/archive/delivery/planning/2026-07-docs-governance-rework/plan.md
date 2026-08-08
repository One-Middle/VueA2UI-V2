# 文档治理体系改造计划

## 1. 改造范围

- 重组 `docs/` 目录为编号分层。
- 新增 `00-meta/` 文档治理规则。
- 新增 `90-notes/` 阅读笔记区。
- 将 `06-planning/` 定义为平台改造计划区。
- 将仍描述当前事实的能力矩阵移出归档。
- 更新入口文档、内部链接和模块维护规则。

## 2. 目标结构

```text
docs/
  00-meta/
  01-product/
  02-architecture/
  03-contracts/
  04-modules/
  05-operations/
  06-planning/
  90-notes/
  99-archive/
```

## 3. 验收标准

- `docs/README.md` 能说明完整目录结构和权威规则。
- `00-meta/` 包含分类、维护和阅读路径。
- `06-planning/` 包含独立计划目录规则和当前改造计划。
- `90-notes/` 明确非权威定位和笔记模板。
- 当前权威文档不再链接到旧 `docs/archive/` 路径。

