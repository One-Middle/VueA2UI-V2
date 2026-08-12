# Issue tracker：CYZ 本地 Markdown

本仓库的 issues 和 specs 以 Markdown 文件形式存放在 `docs/matt_docs/scratch/`。

这是 Matt 本地 Markdown tracker，只改变了根路径：

```text
.scratch/ -> docs/matt_docs/scratch/
```

## 约定

- 每个 feature 一个目录：`docs/matt_docs/scratch/<feature-slug>/`。
- Spec 文件为 `docs/matt_docs/scratch/<feature-slug>/spec.md`。
- Implementation issues 每个 ticket 一个文件：`docs/matt_docs/scratch/<feature-slug>/issues/<NN>-<slug>.md`，从 `01` 开始编号。
- 不要发布单一合并版 tickets 文件。
- Triage 状态记录在每个 issue 文件顶部附近的 `Status:` 行。
- 评论和对话历史追加到文件底部的 `## Comments` 标题下。

## 当 skill 说“publish to the issue tracker”

在 `docs/matt_docs/scratch/<feature-slug>/` 下创建新文件；目录不存在时创建目录。

## 当 skill 说“fetch the relevant ticket”

读取被引用路径的文件。用户通常会直接传路径或 issue 编号。

## Wayfinding 操作

供未来 CYZ fork 的 `/wayfinder` 使用。Map 是一个文件，每个 child ticket 是一个独立文件。

- **Map**: `docs/matt_docs/scratch/<effort>/map.md`，正文包含 Notes / Decisions-so-far / Fog。
- **Child ticket**: `docs/matt_docs/scratch/<effort>/issues/NN-<slug>.md`，从 `01` 编号，正文写问题。
- **Type**: 用 `Type:` 行记录 `research`、`prototype`、`grilling` 或 `task`。
- **Status**: 用 `Status:` 行记录 `claimed` 或 `resolved`。
- **Blocking**: 在顶部附近用 `Blocked by: NN, NN` 记录依赖。
- **Frontier**: 扫描 `docs/matt_docs/scratch/<effort>/issues/`，寻找 open、unblocked、unclaimed 的文件；编号最小者优先。
- **Claim**: 开始工作前，把 `Status:` 设置为 `claimed` 并保存。
- **Resolve**: 在 `## Answer` 标题下追加答案，把 `Status:` 设置为 `resolved`，再向 `map.md` 追加 context pointer。
