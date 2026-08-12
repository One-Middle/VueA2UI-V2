# Domain Docs（领域文档）

说明 CYZ Matt skills 在探索代码库时应如何使用本仓库的领域文档。

## 探索前先读这些

- `docs/matt_docs/CONTEXT.md`
- `docs/matt_docs/adr/`：只读取与你即将处理区域相关的 ADR。

如果这些文件不存在，安静地继续。不要因为缺失而提醒用户，也不要提前建议创建它们。`cyz-domain-modeling` 会在术语或决策真正确认后，通过 `cyz-grill-with-docs` 懒创建这些文件。

## 文件结构

本仓库使用单一 context：

```text
docs/matt_docs/
  CONTEXT.md
  adr/
    0001-example-decision.md
```

## 使用 glossary 里的词汇

当你的输出要命名领域概念，例如 issue 标题、重构建议、假设、测试名称或 spec 时，使用 `docs/matt_docs/CONTEXT.md` 中定义的术语。

不要漂移到 glossary 明确避免的同义词。

如果你需要的概念还不在 glossary 中，先判断自己是不是在发明项目并未使用的语言；必要时把这个空缺提示给 `cyz-domain-modeling`。

## 标出 ADR 冲突

如果你的输出与已有 ADR 冲突，要明确指出，不要静默覆盖。
