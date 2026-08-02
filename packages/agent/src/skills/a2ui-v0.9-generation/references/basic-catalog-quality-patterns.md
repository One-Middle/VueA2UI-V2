<!--
自动生成文件，请勿手动修改。
权威源：packages/agent/src/skills/*.ts
生成命令：pnpm --filter @a2ui-platform/agent skill:docs
-->

---
skill: "A2UI v0.9 组件消息生成"
id: "basic-catalog-quality-patterns"
title: "Basic Catalog 高质量组合模式"
description: "用于避免生成过于简陋的 Card/Row/Text 平铺结构，说明常见 UI 的组件组织方式。"
---

# Basic Catalog 高质量组合模式

生成 UI 时先做信息架构，再选择组件。不要把所有信息直接铺成若干 Row 和 Text。

## 推荐结构

- 卡片类 UI：Card 作为外层容器，内部使用 Column 拆出媒体区、标题区、内容区和操作区。
- 列表类 UI：重复数据优先进入 dataModel 数组，再使用 List 模板渲染，不要生成 row1、row2、row3。
- 看板类 UI：使用 Column 组织页面，Row 承载多个指标 Card，重要数字使用 metric/brand，说明文字使用 caption/neutral。
- 表单类 UI：字段按 Column 分组，按钮区单独放在底部 Row，错误和帮助信息放在字段附近。

## 视觉字段

常见 UI 必须主动使用受控视觉字段：gap、padding、borderRadius、variant、tone、size、preset、shadow。复杂视觉效果优先使用 variant/tone/preset，不要臆造 className、css、html 或浏览器事件字段。
