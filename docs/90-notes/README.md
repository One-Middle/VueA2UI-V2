# 阅读笔记入口

`90-notes/` 用于保存 AI 或人工生成的阅读辅助材料，包括代码导读、临时调研、实现总结、排查记录和历史归档。

本目录文档默认**不作为权威事实来源**。如果本文档与 `10-product/`、`20-design/`、`30-contracts/`、`40-implementation/` 冲突，以权威文档为准。

## 1. 推荐目录

```text
90-notes/
  module-reading/       # 面向某个模块的阅读导图
  code-walkthroughs/    # 代码链路导读
  investigations/       # 问题排查和调研记录
  ai-summaries/         # AI 生成的阶段性总结
  archive/              # 历史归档和旧设计材料
```

## 2. 笔记头部模板

```md
> 文档类型：阅读辅助
> 权威等级：非权威
> 生成时间：YYYY-MM-DD
> 依据来源：
> - path/to/source-1
> - path/to/source-2
>
> 冲突规则：若本文与权威文档冲突，以 `10-product/`、`20-design/`、`30-contracts/`、`40-implementation/` 中的文档为准。
```

## 3. 提升为权威文档

阅读笔记只有在用户明确要求且完成事实校验后，才能迁移到权威目录。迁移时必须删除重复事实、修正冲突内容，并更新相关入口链接。
