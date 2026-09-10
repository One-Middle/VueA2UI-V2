# 01 — 建立 Renderer workspace package 边界

**What to build:** 创建 `renderer-core`、`renderer-dom`、`renderer-vue`、`renderer-react` 四个 workspace package，并建立仅允许单向依赖的入口、构建和测试配置。

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] 创建四个 package 的 `package.json`、TypeScript、Vite/Vitest 配置和子路径公开入口。
- [x] 将共享协议解析代码归属到 `renderer-core`，并确保 Core 不依赖 DOM、Vue、React。
- [x] 将 DOM、Vue、React 分别设为对应 Adapter 的 peer/runtime dependency，避免跨 Adapter 依赖。
- [x] 保持 `packages/shared` 为 A2UI 类型和 Catalog 的唯一跨层依赖。
- [x] 更新 workspace 构建、类型检查和测试入口，使四包可独立执行。
- [x] 执行静态导入扫描，确认旧单包与跨 Adapter 路径未残留。
