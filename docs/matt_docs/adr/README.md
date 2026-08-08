# ADR

本目录用于记录 Matt 风格 ADR。ADR 只记录重要、难回滚、令人意外且有真实取舍的决策。

## Format

新 ADR 使用顺序编号，文件名格式为 `0001-slug.md`、`0002-slug.md`。

```md
# <Short title>

<1-3 句：说明背景、决定和原因。>
```

可选章节只在确实有价值时添加：`Status`、`Considered Options`、`Consequences`。

## When to write

同时满足以下条件时才写 ADR：

1. 决策难以回滚。
2. 未来读者如果没有上下文会感到意外。
3. 决策来自真实取舍，而不是显然唯一的做法。

