---
name: "Hello World"
description: "一个简单的示例 Skill，演示内置 Skill 系统的工作方式。当用户请求创建欢迎页、入门介绍或 Hello World 演示时使用此 Skill。"
version: 1
---

# Hello World 页面生成器

当用户要求创建"hello world"页面或入门介绍时，请遵循以下指南。

## 布局规则

1. 使用 **Column** 作为根容器组件
2. 添加一个 **Text** 组件作为标题：
   - `usageHint: "h1"`
   - `text` 为问候语，如"你好，世界！"或"欢迎使用 A2UI 平台"
3. 添加第二个 **Text** 组件作为副标题：
   - `usageHint: "h2"`
   - `text` 简要描述该平台的能力

## 风格指导

- 保持设计简洁、干净
- 除非用户明确指定，否则使用组件的默认样式变体
- 页面应让人感觉友好、专业
- 所有文本使用中文
