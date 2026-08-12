# Matt-first 工作系统

`docs/matt_docs/` 是本仓库的 Agent 任务工作主系统。它 fork Matt skills 的工作方式，只调整文档落点；流程、语义和产物职责保持 Matt 原版设计。

注意：原 Matt skills 不会直接生成本目录的 `README.md` 和 `scratch/README.md`。这两个文件是本仓库的路径迁移说明；`agents/issue-tracker.md`、`agents/domain.md`、`agents/triage-labels.md` 对应 Matt setup skill 的三份配置文档。

## 职责

- 承载 Agent 任务工作流：grill、spec、tickets、triage、handoff 和本地 issue tracker。
- 维护领域词汇表 `CONTEXT.md`。
- 维护 Matt 风格 ADR：轻量记录重要、难回滚、有真实取舍的决策。
- 为 `cyz-*` skills 提供固定输入输出路径。

## 不负责

- 不复制产品需求、架构设计、契约或当前实现说明。
- 不替代 `10-product/`、`20-design/`、`30-contracts/`、`40-implementation/` 的开发者阅读材料。
- 不承载旧 `50-delivery/` 的历史交付记录；旧内容归档到 `90-notes/archive/delivery/`。

## 目录

```text
docs/matt_docs/
  README.md
  CONTEXT.md
  agents/
    issue-tracker.md
    domain.md
    triage-labels.md
  adr/
  scratch/
    <feature-slug>/
      spec.md
      issues/
        01-<slug>.md
```

## 使用规则

1. 新想法先用 `cyz-grill-with-docs` 澄清。
2. 规格用 `cyz-to-spec` 发布到 `scratch/<feature-slug>/spec.md`。
3. 可执行 tickets 用 `cyz-to-tickets` 发布到 `scratch/<feature-slug>/issues/`。
4. 领域术语只写入 `CONTEXT.md`。
5. 新 ADR 只写入 `adr/`；旧 `20-design/decisions/` 已迁移或停用。
6. 稳定产品、设计、契约和实现事实回填到对应 docs 分层。
