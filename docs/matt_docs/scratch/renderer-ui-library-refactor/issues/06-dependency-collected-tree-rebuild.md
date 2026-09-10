# 06 — 实现 dependency-collected tree rebuild

**What to build:** RenderNode 构建时收集真实 dataModel 依赖，surface 层根据依赖同步订阅，并在依赖变化时重建 RenderNode tree。

**Blocked by:** 05 — 实现 RenderNode builder 的声明式组件闭环.

**Status:** resolved

- [x] `{ path }` 动态引用、model binding、property script deps 和 List path 会进入 dependency collector。
- [x] dependencies 使用 Set 去重，并输出排序后的稳定 `string[]`。
- [x] build result 返回 RenderNode tree 和 dependencies。
- [x] surface 层使用 `watch` 同步 DataModel 订阅，`computed` 不执行订阅副作用。
- [x] 依赖变化会触发 RenderNode tree 重建，并在卸载时清理订阅。
