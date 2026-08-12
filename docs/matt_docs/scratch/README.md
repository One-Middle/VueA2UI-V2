# Scratch

本目录是 Matt 本地 Markdown tracker 在 CYZ 路径下的映射版本。

```text
.scratch/<feature-slug>/ -> docs/matt_docs/scratch/<feature-slug>/
```

## 布局

```text
scratch/
  <feature-slug>/
    spec.md
    issues/
      01-<slug>.md
      02-<slug>.md
```

## 规则

- 每个 feature 一个目录。
- `spec.md` 保存 `cyz-to-spec` 的输出。
- `issues/` 保存 `cyz-to-tickets` 的输出。
- Tickets 必须按阻塞优先顺序编号。
- 不要在这里复制产品、契约、设计或实现事实；链接到相关 docs 即可。
