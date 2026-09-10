# 07 — 实现 List 和 Tabs 的统一 slot rule

**What to build:** `List` 和 `Tabs` 的 A2UI 特殊结构通过 Catalog slot rule 进入统一 `resolveSlots`，普通 UI 组件仍然不感知 A2UI。

**Blocked by:** 05 — 实现 RenderNode builder 的声明式组件闭环; 06 — 实现 dependency-collected tree rebuild.

**Status:** resolved

- [x] `List.children [{ path, componentId }]` 读取数组并展开为 `slots.default`。
- [x] List 每个 item 使用独立 `basePath` 构建子 RenderNode。
- [x] `Tabs.tabItems/tabs` 生成 `props.items` 和结构化 `slots.panels`。
- [x] Vue renderer 能通过 `UiTabs` scoped default slot 的 active key 渲染当前 panel。
- [x] 测试覆盖 List 动态新增、相对 path、Tabs panel 切换和 panel 内容对应关系。
