# Vue A2UI Agent Platform

本仓库是 A2UI Agent 平台的 monorepo，包含 frontend、backend、agent、renderer 和 shared 等包。

## Renderer Lab 测试页面

Renderer Lab 用于专门展示和验证 `packages/renderer` 的渲染能力，包括投票卡片、课程卡片、音乐播放器、Todo List、黑金金融资讯卡片、商品卡片和数据看板等 A2UI 示例。

在项目根目录运行：

```bash
pnpm.cmd --filter @a2ui-platform/renderer demo
```

启动后打开终端中显示的本地地址，通常是：

```text
http://127.0.0.1:5173
```

如果端口被占用，Vite 会自动切换到其他端口，请以终端输出为准。

## 更多文档

项目文档入口见 [docs/README.md](./docs/README.md)。
