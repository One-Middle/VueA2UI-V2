# 08 — 补齐剩余普通 Basic UI 组件并接入 Vue renderer

**What to build:** 除 `Modal` 外的正式 Basic Catalog 组件全部可通过 `RenderNode -> VNode` 新链路渲染，旧 Basic 组件不参与新链路。

**Blocked by:** 04 — 创建普通 Vue Basic UI 组件库的第一条渲染闭环; 05 — 实现 RenderNode builder 的声明式组件闭环; 07 — 实现 List 和 Tabs 的统一 slot rule.

**Status:** resolved

- [x] 新普通组件库覆盖 `Text/Image/Icon/Video/AudioPlayer/Divider/Row/Column/Grid/Container/Spacer/List/Card/Tabs/Button/TextField/CheckBox/ChoicePicker/Slider/DateTimeInput`。
- [x] Vue renderer 能将 RenderNode props、events 和 slots 转为普通 Vue VNode。
- [x] 新链路不 import 旧 Basic 组件。
- [x] 组件视觉和交互行为与 legacy 支持组件保持等价，除非 spec 明确调整。
