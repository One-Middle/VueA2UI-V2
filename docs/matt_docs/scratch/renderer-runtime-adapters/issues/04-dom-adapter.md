# 04 — 改造 DOM Adapter

**What to build:** 将现有 DOM Surface Host、DOM Basic UI、函数 mount API 和 Web Component 改造为只消费 `SurfaceRuntime` 的 DOM Adapter。

**Blocked by:** 03 — Runtime 事件与组件本地状态。

**Status:** resolved

- [x] 将 `renderDomNode` 改为只根据 RenderPlan 和 DOM registry 生成原生节点。
- [x] DOM 组件通过 AdapterEvent 回传用户交互，不直接写入 DataModel 或执行动作。
- [x] DOM mount API 接收或创建对应 SurfaceRuntime，并正确订阅/释放它。
- [x] 保留第一版整 surface `replaceChildren` 更新、焦点恢复和 cleanup 行为。
- [x] 保留 light DOM Web Component、property/registry 注入及 property 优先级。
- [x] 将 Runtime action/error 回调映射为容器 CustomEvent，并保留可选 window 镜像。
- [x] 为 DOM Adapter 的挂载、更新、卸载、事件和焦点恢复添加测试。
