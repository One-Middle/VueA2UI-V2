# 04 - Safety validation precision

**构建内容：** 收窄 `UNSAFE_CONTENT` 检查，避免 `on\w+\s*=` 对合法脚本变量片段产生误判。

**阻塞关系：** 可与 03 并行。

**Status:** completed

## Scope

- 拆分字符串内容检查、组件属性名检查和脚本代码检查。
- 普通字符串继续拒绝 `<script`、`innerHTML`、`javascript:` 等危险内容。
- 组件属性名拒绝 `onClick`、`onChange`、`onInput` 等浏览器事件字段。
- 脚本代码不再使用整段 `on\w+\s*=` 正则；依赖 JSRuntime / script guard 检查危险 API。
- 保持 `eval(` 等明确危险能力的拦截。

## Acceptance Criteria

- [x] 包含 `one =` 的合法 `action.script.code` 不触发 `UNSAFE_CONTENT`。
- [x] 顶层或组件字段 `onClick` 仍被拒绝。
- [x] HTML 片段中的 `onclick=` 仍被拒绝。
- [x] `innerHTML`、`javascript:`、`eval(` 仍被拒绝。
- [x] 单测覆盖误判和真实危险输入。

## Out Of Scope

- 不重写 Renderer JSRuntime 安全模型。
- 不放宽 DOM、window、document、fetch、网络、动态执行能力限制。
