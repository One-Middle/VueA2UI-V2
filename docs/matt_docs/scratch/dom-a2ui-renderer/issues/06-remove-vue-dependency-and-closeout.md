# 06 — 移除 Vue 依赖并完成收尾

**What to build:** 删除 renderer package 中的 Vue renderer、Vue UI、Vue 构建依赖和相关文档漂移，确保纯 DOM renderer 成为唯一正式路径。

**Blocked by:** 01 — 去除 core model 的 Vue 响应式依赖; 02 — 实现 DOM Surface Host 和函数式 mount API; 03 — 实现 DOM RenderNode renderer 和 Basic UI 组件; 04 — 实现 Web Component wrapper; 05 — 迁移 frontend 和 renderer capability demo 到 DOM renderer.

**Status:** resolved

- [x] 删除 `packages/renderer/src/vue/*` 或确认无导出、无引用后移除。
- [x] 删除 `packages/renderer/src/render/vue-renderer.ts`。
- [x] 删除 `packages/renderer/src/ui/basic/*.vue`，DOM Basic UI 成为正式组件库。
- [x] 删除 renderer package 对 `vue` 的 dependency。
- [x] 删除 renderer package 对 `vue-tsc` 和 `@vitejs/plugin-vue` 的 devDependency。
- [x] 更新 renderer `package.json` scripts，使用普通 TypeScript typecheck/build。
- [x] 更新 renderer Vite config，移除 Vue plugin。
- [x] 更新 tsconfig，移除 Vue SFC 特定配置。
- [x] 更新 package exports，导出 DOM mount API、Web Component API、DOM Basic UI 和 styles。
- [x] 确认 `docs/10-product/prd.md` 已使用框架无关 Renderer 表述。
- [x] 确认 `docs/20-design/renderer/README.md` 已把 Renderer 定位为框架无关 DOM runtime。
- [x] 确认 `docs/20-design/frontend/README.md` 已说明 Frontend 可继续使用 Vue，但 Renderer 接管自己的 DOM 子树。
- [x] 确认 `docs/30-contracts/a2ui-v0.9.md` 已声明 A2UI 协议不绑定前端框架。
- [x] 更新 `docs/matt_docs/CONTEXT.md`，移除 Plain UI Component、RenderNode、RenderNode Slot 中的 Vue/VNode/slot 绑定措辞。
- [x] 更新 Renderer 模块文档，说明纯 DOM 架构、工程结构、公开 API、构建命令和事件派发策略。
- [x] 更新 Basic Catalog 能力矩阵，记录 DOM renderer 当前能力，移除 Vue 响应式、Vue style、Vue VNode 等实现表述。
- [x] 更新 Integration 模块文档，将 `A2uiSurface` Vue 集成改为 DOM mount API 或 Web Component 集成。
- [x] 更新 Frontend 模块文档，说明 frontend 可继续使用 Vue，但 preview 中的 renderer 子树由 DOM renderer 接管。
- [x] 检查 A2UI v0.9 契约，仅在源码路径或实现状态引用仍指向 Vue 文件时做最小同步；不重写协议结构。
- [x] 更新 changelog。
- [x] 跑 `pnpm --filter @a2ui-platform/renderer test`。
- [x] 跑 `pnpm --filter @a2ui-platform/renderer build` 或新的等价 typecheck/build。
- [x] 跑 renderer demo build。
- [x] 确认 `rg "from \"vue\"|from 'vue'|\\.vue" packages/renderer/src packages/renderer/package.json` 没有正式路径残留。
