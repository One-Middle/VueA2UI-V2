# Renderer dataModel 响应式优化计划

## 1. 实施方案

本次改造以 `DataModel` 作为 Renderer 响应式事实源，使用 Vue 深响应式数据容器承载根数据；组件渲染时通过 `DataContext` 解析绝对路径和相对路径，并在递归渲染时传递当前 dataModel 作用域。

## 2. 阶段划分

1. 修复 `DataModel` 响应式核心：
   - 将内部状态从浅响应式改为深响应式。
   - 修复根节点为 `null`、`undefined` 或 primitive 时的深层路径自动创建。
   - 根节点替换时通知所有已注册路径订阅。

2. 补齐 `DataContext` 作用域能力：
   - 暴露只读 `basePath`。
   - 规整传入的 basePath，避免尾斜杠和相对路径拼接异常。
   - 保持绝对路径优先，相对路径基于当前作用域解析。

3. 串联 Vue 递归渲染：
   - `A2uiComponent` 接收可选 `basePath`。
   - Row、Column、Card、Button、Modal、Tabs、List 等递归渲染入口继续传递当前作用域。
   - 动态 `List` 为每个 item 生成独立 basePath。

4. 补充测试与文档：
   - 增加 `DataModel` 模型层响应式测试。
   - 增加真实 `A2uiSurface` DOM 回归测试。
   - 同步 Renderer 模块说明、Basic Catalog 能力矩阵和更新日志。

## 3. 验收标准

- `updateDataModel("/")` 替换根数据后，旧 `DataContext` 仍能读取新值。
- `updateDataModel("/form/name")` 这类深层路径更新后，绑定文本能刷新。
- `/items/0/title` 这类数组路径能自动创建中间数组和对象。
- 动态 `List` 模板组件内 `{ path: "title" }` 能读取当前 item 字段。
- `pnpm.cmd --filter @a2ui-platform/renderer test` 通过。
- `pnpm.cmd --filter @a2ui-platform/renderer typecheck` 通过。
- `pnpm.cmd --filter @a2ui-platform/renderer build` 通过。
