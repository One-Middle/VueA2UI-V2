# 03 — 实现 DOM RenderNode renderer 和 Basic UI 组件

**What to build:** 新增 `renderDomNode` 和 `ui/dom-basic` 组件 registry，把当前正式 Basic Catalog 的 Vue UI 行为迁移为纯 DOM API。

**Blocked by:** 02 — 实现 DOM Surface Host 和函数式 mount API.

**Status:** resolved

- [x] 新增 DOM Basic UI 组件接口类型，组件只接收 plain props、slots、emit、state 和 renderChildren helper。
- [x] 新增 `basicDomComponents` registry。
- [x] 新增 `renderDomNode(node, context)`，处理 fallback、组件查找、props、events、slots 和 cleanup。
- [x] DOM 组件不 import A2UI core/protocol modules。
- [x] `Text` DOM 组件保持文本 tag、class、style、maxLines/truncate 行为。
- [x] `Button` DOM 组件保持 label/icon/loading/disabled/fullWidth/class 行为并 emit `click`。
- [x] `TextField` DOM 组件支持 input/textarea、modelValue、`update:modelValue` 和表单辅助文案。
- [x] `CheckBox` DOM 组件支持 checked state、disabled、label 和 `update:modelValue`。
- [x] `ChoicePicker` DOM 组件支持 options、selected value 和 `update:modelValue`。
- [x] `Slider` DOM 组件支持 min/max/step/value display 和 `update:modelValue`。
- [x] `DateTimeInput` DOM 组件支持 date/time/datetime 输入模式和 `update:modelValue`。
- [x] `List` DOM 组件渲染 default slot、empty/loading/dividers/itemRole class。
- [x] `Tabs` DOM 组件使用 host stateStore 保存 activeKey，并只渲染当前 panel。
- [x] `Row`、`Column`、`Grid`、`Container`、`Card`、`Spacer`、`Divider` 保持 layout class 和 style 行为。
- [x] `Image` DOM 组件支持 load error state、fallback、caption、role、fit、aspectRatio。
- [x] `Icon`、`Video`、`AudioPlayer` DOM 组件迁移当前可用行为。
- [x] 所有正式 Basic Catalog 组件有对应 DOM renderer 覆盖测试。
