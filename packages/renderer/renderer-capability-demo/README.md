# Renderer Lab — A2UI v0.9 能力展示测试台

基于真实 `MessageProcessor` + `SurfaceGroupModel` 驱动的 A2UI 渲染器能力演示应用，覆盖 Basic Catalog 的语义组件、数据绑定、脚本执行和事件回传。

## 快速启动

项目使用 **pnpm workspace** 管理，demo 复用父包 `@a2ui-platform/renderer` 的依赖和脚本。

### 开发模式（HMR）

```bash
# 在仓库根目录执行
pnpm --filter @a2ui-platform/renderer demo
```

或者在 `packages/renderer/` 目录下直接执行：

```bash
cd packages/renderer
pnpm demo
```

Vite 开发服务器默认监听 `http://127.0.0.1:5173`，修改源码自动热更新。

### 构建预览

```bash
# 根目录
pnpm --filter @a2ui-platform/renderer demo:build

# 或进入 packages/renderer 目录
pnpm demo:build
```

产物输出到 `packages/renderer/renderer-capability-demo/dist/`，之后用任意静态服务预览：

```bash
npx vite preview --outDir packages/renderer/renderer-capability-demo/dist
```

## 前置条件

- **Node.js** `>= 18`
- **pnpm** `>= 9`（项目 `packageManager` 字段指定为 `pnpm@9.0.0`）
- 首次使用需安装依赖：

  ```bash
  pnpm install
  ```

  > `@a2ui-platform/shared` 是 workspace 内部依赖，pnpm 会自动链接，无需手动构建。

## 示例页面

| 页面 | 说明 | 覆盖能力 |
|------|------|----------|
| **Live Commerce** | 直播商品卡，展示媒体封面、商品货架和双购买 CTA | Container、Image.role、Text.role、Button.intent、action.event |
| **Course Planner** | 课程表单，展示表单语义、segmented 选择器和状态脚本 | 表单语义、ChoicePicker.mode、List.emptyText、action.script、状态写回 |
| **Music Player** | 播放器，展示媒体角色、图标语义和本地状态切换 | Image.role、Icon.semantic、Slider.valueDisplay、Button.shape、action.script |
| **Work Board** | 待办看板，展示 CheckBox、List 状态和批量脚本 | CheckBox 写回、List.dividers、Text.truncate、Button.intent、批量脚本 |
| **Finance Brief** | 黑金金融资讯卡，展示筛选、收藏、行情和事件回传 | 黑金视觉、分类筛选、List 模板、收藏写回、行情事件 |
| **Metrics Board** | 数据看板，展示 Grid 指标卡、派生文案和状态语义 | Grid 指标、Card.role=metric、属性脚本、Text.emphasis、事件回传 |

## 目录结构

```
renderer-capability-demo/
├── index.html        # Vite 入口 HTML
├── vite.config.ts    # 独立的 Vite 配置，别名指向 ../src
├── tsconfig.json     # 继承父包 tsconfig，仅类型检查不产出
├── src/
│   ├── main.ts       # Vue 应用挂载入口
│   ├── App.vue       # 测试台主界面：页面切换、手机框预览、事件面板
│   ├── cases.ts      # 预置 A2UI 示例消息（6 个场景的完整 dataModel + components）
│   └── styles.css    # 测试台样式
└── dist/             # 构建产物（gitignore）
```

## 工作方式

1. **页面切换**：左侧边栏选择示例，右侧手机框实时渲染对应 A2UI 页面。
2. **事件面板**：右下角实时展示 renderer 抛出的 `action`、`error` 和 `system` 事件。
3. **数据检查**：右侧面板可查看当前 `dataModel` 状态和原始 A2UI Messages。
4. **能力矩阵**：展示 Basic Catalog 已覆盖 / 待实现的能力项。

## 注意

- 本目录仅用于 renderer 能力测试，不参与正式包导出。
- 示例消息为本地可信数据，不走后端 Agent，适合快速回归和视觉验收。
- 修改 `cases.ts` 即可添加新场景，无需改动 App.vue 结构。
