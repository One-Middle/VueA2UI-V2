# 04 — 实现 Web Component wrapper

**What to build:** 基于 `DomSurfaceHost` 提供 `<a2ui-surface>` custom element，支持 property 注入和 registry 注入 `SurfaceGroupModel`。

**Blocked by:** 02 — 实现 DOM Surface Host 和函数式 mount API; 03 — 实现 DOM RenderNode renderer 和 Basic UI 组件.

**Status:** resolved

- [x] 新增 `surface-group-registry.ts`，提供 register/get/unregister API。
- [x] 新增 `web-component.ts`，定义 `A2uiSurfaceElement`。
- [x] custom element 支持 `surface-id` attribute。
- [x] custom element 支持 `group` attribute，从 registry 查找 `SurfaceGroupModel`。
- [x] custom element 支持 `surfaceGroup` property，且 property 优先于 registry。
- [x] custom element 支持 `surfaceId` property，与 attribute 同步或等价生效。
- [x] `connectedCallback` 创建或刷新 `DomSurfaceHost`。
- [x] `disconnectedCallback` 调用 host `unmount()`。
- [x] attribute/property 变化后触发重挂载或更新。
- [x] 第一版默认 light DOM，不启用 Shadow DOM。
- [x] 导出 `defineA2uiSurfaceElement()`，避免重复 define custom element。
- [x] Web Component 测试覆盖 property 注入、registry 注入、surface-id 变化和 unmount 清理。
