/**
 * Renderer 能力 demo 示例数据。
 *
 * 职责：
 * - 维护可直接回放的 A2UI v0.9 server messages。
 * - 用示例覆盖 Basic Catalog 的语义字段、布局组件、绑定和脚本能力。
 *
 * 不负责：
 * - 定义正式协议字段；正式字段以 shared 类型和 Agent schema 为准。
 * - 校验消息合法性；demo 只消费本地可信样例。
 *
 * 引用：
 * - @a2ui-platform/shared
 * 被引用：
 * - App.vue
 * 注意：
 * - 示例优先使用组件语义字段，避免通过 style 模拟业务含义。
 * - 保留 3 个高质量标杆 case：Live Commerce（亮色电商）、Work Board（清爽工具）、Finance Brief（黑金金融）。
 */

import type {
  A2UIComponent,
  A2UIServerMessage,
  JsonObject,
} from "@a2ui-platform/shared";

export const CATALOG_ID =
  "https://a2ui.org/specification/v0.9/catalogs/basic/catalog.json";

const svgDataUri = (svg: string): string =>
  `data:image/svg+xml,${encodeURIComponent(svg)}`;

const liveKitchenCover = svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 520">
  <defs>
    <linearGradient id="window" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#dff7d4"/>
      <stop offset="1" stop-color="#f8fafc"/>
    </linearGradient>
    <linearGradient id="counter" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#d7b47a"/>
      <stop offset="1" stop-color="#f4d99d"/>
    </linearGradient>
    <filter id="blur">
      <feGaussianBlur stdDeviation="18"/>
    </filter>
  </defs>
  <rect width="720" height="520" fill="#efe6d2"/>
  <rect x="420" y="24" width="164" height="216" rx="8" fill="url(#window)"/>
  <path d="M444 36v190M484 36v190M524 36v190M564 36v190M430 96h144M430 156h144" stroke="#b7d8a9" stroke-width="5" opacity="0.55"/>
  <rect x="32" y="70" width="214" height="142" rx="12" fill="#baa37f"/>
  <rect x="52" y="92" width="48" height="34" rx="4" fill="#f8fafc" opacity="0.65"/>
  <rect x="112" y="92" width="46" height="34" rx="4" fill="#f8fafc" opacity="0.58"/>
  <rect x="170" y="92" width="42" height="34" rx="4" fill="#f8fafc" opacity="0.5"/>
  <circle cx="286" cy="116" r="34" fill="#efe9dc" stroke="#9c8b70" stroke-width="5"/>
  <path d="M286 96v22l17 12" stroke="#766853" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M342 76h38v92h-38z" fill="#f2f6ef"/>
  <path d="M360 76v-38" stroke="#415349" stroke-width="7" stroke-linecap="round"/>
  <path d="M330 118c28-22 62-22 88 0" fill="#6d8472"/>
  <rect x="0" y="314" width="720" height="118" fill="url(#counter)"/>
  <rect x="0" y="432" width="720" height="88" fill="#7a6b54" opacity="0.78"/>
  <ellipse cx="362" cy="374" rx="250" ry="48" fill="#efe1bd" opacity="0.5" filter="url(#blur)"/>
  <path d="M320 170c48-24 104 4 108 62l6 100h-158l8-102c3-27 15-47 36-60z" fill="#f8fafc"/>
  <path d="M300 214c-38 36-56 78-50 126" stroke="#f8fafc" stroke-width="32" stroke-linecap="round"/>
  <path d="M428 224c36 30 52 64 56 106" stroke="#f8fafc" stroke-width="32" stroke-linecap="round"/>
  <circle cx="356" cy="142" r="42" fill="#e6b28a"/>
  <path d="M318 134c8-44 76-52 96-9-20 4-42 2-62-7-10 13-21 18-34 16z" fill="#172121"/>
  <path d="M334 178c18 14 42 14 58 0" stroke="#b98060" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M224 336c50-34 112-36 164 0" fill="#d4b87e"/>
  <circle cx="258" cy="320" r="18" fill="#6aa84f"/>
  <circle cx="290" cy="312" r="20" fill="#9ac36b"/>
  <circle cx="326" cy="320" r="18" fill="#6aa84f"/>
  <rect x="458" y="320" width="78" height="52" rx="10" fill="#f7f7f2" stroke="#c7bfa8" stroke-width="4"/>
  <rect x="538" y="322" width="72" height="46" rx="22" fill="#f2c2b8"/>
  <rect x="268" y="250" width="124" height="38" rx="10" transform="rotate(12 330 269)" fill="#ffffff"/>
  <rect x="276" y="255" width="50" height="28" rx="5" transform="rotate(12 301 269)" fill="#d71920"/>
  <rect x="332" y="262" width="46" height="12" rx="3" transform="rotate(12 355 268)" fill="#93c47d"/>
</svg>`);

const waterThumb = svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <rect width="160" height="160" rx="18" fill="#f8fafc"/>
  <rect x="26" y="70" width="82" height="56" rx="8" fill="#ffffff" stroke="#e5e7eb" stroke-width="4"/>
  <rect x="30" y="82" width="74" height="26" rx="4" fill="#d71920"/>
  <text x="39" y="101" fill="#ffffff" font-family="Arial, sans-serif" font-size="16" font-weight="700">山泉</text>
  <rect x="92" y="34" width="34" height="94" rx="9" fill="#e0f2fe" stroke="#93c5fd" stroke-width="4"/>
  <rect x="96" y="62" width="26" height="28" rx="4" fill="#d71920"/>
  <rect x="98" y="24" width="22" height="14" rx="4" fill="#ef4444"/>
  <circle cx="42" cy="55" r="14" fill="#22c55e"/>
  <circle cx="64" cy="48" r="18" fill="#84cc16"/>
</svg>`);

export interface DemoCase {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  accent: string;
  capabilities: string[];
  messages: A2UIServerMessage[];
}

const surface = (
  dataModel: JsonObject,
  components: A2UIComponent[],
): A2UIServerMessage[] => [
  {
    version: "v0.9",
    createSurface: {
      surfaceId: "main",
      catalogId: CATALOG_ID,
    },
  },
  {
    version: "v0.9",
    updateDataModel: {
      surfaceId: "main",
      path: "/",
      value: dataModel,
    },
  },
  {
    version: "v0.9",
    updateComponents: {
      surfaceId: "main",
      components,
    },
  },
];

export const demoCases: DemoCase[] = [
  {
    id: "semantic-store",
    title: "Live Commerce",
    subtitle: "直播商品卡，展示媒体封面、商品货架和双购买 CTA",
    icon: "S",
    accent: "#f97316",
    capabilities: [
      "Container",
      "Image.role",
      "Text.role",
      "Button.intent",
      "action.event",
    ],
    messages: surface(
      {
        live: {
          badge: "直播中",
          title: "农夫山泉 好礼相送",
          cta: "去逛逛",
          viewers: "3000+",
          likes: "1444",
          cover: liveKitchenCover,
        },
        product: {
          sku: "spring-water-5l-4",
          brand: "天猫",
          title: "农夫山泉旗舰店红盖5l*4桶饮用水",
          detail: "详情",
          price: "¥31.9",
          subsidy: "补贴价",
          sales: "已售3万+",
          benefit: "淘宝秒杀 直降9.6元",
          thumbnail: waterThumb,
        },
      },
      [
        { id: "root", component: "Container", child: "liveCard", width: "content", padding: "none" },
        { id: "liveCard", component: "Card", child: "liveBody", role: "media", density: "compact", variant: "plain", style: { padding: "0", borderRadius: "20px", borderColor: "transparent", shadow: "md", backgroundColor: "#ffffff", overflow: "hidden" } },
        { id: "liveBody", component: "Column", children: ["heroImage", "liveStrip", "productShelf", "commerceActions"], gap: "0" },
        { id: "heroImage", component: "Image", url: { path: "/live/cover" }, alt: "Live kitchen", role: "hero", shape: "square", fit: "cover", aspectRatio: "16:13" },
        { id: "liveStrip", component: "Row", children: ["liveTitleGroup", "liveVisit"], role: "actions", distribution: "spaceBetween", alignment: "center", wrap: false, style: { padding: "10px 12px", backgroundColor: "#3d3b36", gap: "10px" } },
        { id: "liveTitleGroup", component: "Row", children: ["liveBadge", "liveTitle"], role: "metadata", alignment: "center", gap: "8px", wrap: false },
        { id: "liveBadge", component: "Text", text: { path: "/live/badge" }, usageHint: "caption", role: "discount", style: { padding: "2px 6px", borderRadius: "4px", backgroundColor: "#ff2f64", color: "#ffffff", fontWeight: "800" } },
        { id: "liveTitle", component: "Text", text: { path: "/live/title" }, usageHint: "body", truncate: true, style: { color: "#ffffff", fontWeight: "700", minWidth: "0" } },
        { id: "liveVisit", component: "Button", label: { path: "/live/cta" }, icon: "chevron_right", iconPosition: "right", importance: "quiet", shape: "pill", action: { event: { name: "openLiveRoom", context: { title: { path: "/live/title" } } } }, style: { color: "#ffffff", padding: "4px 0", minWidth: "64px" } },
        { id: "productShelf", component: "Row", children: ["productThumb", "productInfo"], role: "mediaObject", gap: "10px", alignment: "center", wrap: false, style: { padding: "10px 12px 6px" } },
        { id: "productThumb", component: "Image", url: { path: "/product/thumbnail" }, alt: "Product thumbnail", role: "thumbnail", shape: "rounded", fit: "cover", aspectRatio: "1:1", style: { width: "46px" } },
        { id: "productInfo", component: "Column", children: ["productTitleRow", "priceRow", "benefitRow"], gap: "4px", style: { minWidth: "0", flex: 1 } },
        { id: "productTitleRow", component: "Row", children: ["productBrand", "productTitle", "productDetail"], role: "metadata", alignment: "center", gap: "4px", wrap: false },
        { id: "productBrand", component: "Text", text: { path: "/product/brand" }, usageHint: "body", role: "discount", style: { fontWeight: "800" } },
        { id: "productTitle", component: "Text", text: { path: "/product/title" }, usageHint: "body", emphasis: "strong", truncate: true, style: { minWidth: "0" } },
        { id: "productDetail", component: "Text", text: { script: { code: "return `${dataModel.get('/product/detail')} ›`;", deps: ["/product/detail"], fallback: "详情 ›" } }, usageHint: "caption", emphasis: "muted", style: { minWidth: "38px" } },
        { id: "priceRow", component: "Row", children: ["productPrice", "productSubsidy", "productSales"], role: "metadata", alignment: "end", gap: "4px", wrap: false },
        { id: "productPrice", component: "Text", text: { path: "/product/price" }, role: "price", variant: "metric", tone: "warning", style: { fontSize: "22px" } },
        { id: "productSubsidy", component: "Text", text: { path: "/product/subsidy" }, role: "discount", usageHint: "caption" },
        { id: "productSales", component: "Text", text: { path: "/product/sales" }, usageHint: "caption", emphasis: "muted" },
        { id: "benefitRow", component: "Text", text: { path: "/product/benefit" }, usageHint: "caption", role: "discount", style: { textAlign: "right" } },
        { id: "commerceActions", component: "Row", children: ["socialStats", "cartButton", "buyButton"], role: "actions", alignment: "center", gap: "8px", wrap: false, style: { padding: "8px 12px 12px" } },
        { id: "socialStats", component: "Row", children: ["commentMetric", "starMetric"], role: "metadata", gap: "10px", wrap: false, style: { minWidth: "88px" } },
        { id: "commentMetric", component: "Column", children: ["commentIcon", "commentCount"], gap: "2px", alignment: "center" },
        { id: "commentIcon", component: "Icon", icon: "chat_bubble", semantic: "comment", label: "comments", size: "md" },
        { id: "commentCount", component: "Text", text: { path: "/live/viewers" }, usageHint: "caption", emphasis: "muted" },
        { id: "starMetric", component: "Column", children: ["starIcon", "starCount"], gap: "2px", alignment: "center" },
        { id: "starIcon", component: "Icon", icon: "star", semantic: "favorite", label: "favorites", size: "md" },
        { id: "starCount", component: "Text", text: { path: "/live/likes" }, usageHint: "caption", emphasis: "muted" },
        {
          id: "cartButton",
          component: "Button",
          label: "加入购物车",
          intent: "warning",
          shape: "rounded",
          importance: "prominent",
          fullWidth: true,
          action: {
            event: {
              name: "addToCart",
              context: {
                sku: { path: "/product/sku" },
                title: { path: "/product/title" },
              },
            },
          },
        },
        {
          id: "buyButton",
          component: "Button",
          label: "立即购买",
          intent: "danger",
          shape: "rounded",
          importance: "prominent",
          fullWidth: true,
          style: { backgroundColor: "#ff5a1f" },
          action: {
            event: {
              name: "buyNow",
              context: {
                sku: { path: "/product/sku" },
                price: { path: "/product/price" },
                title: { path: "/product/title" },
              },
            },
          },
        },
      ],
    ),
  },
  {
    id: "workboard",
    title: "Work Board",
    subtitle: "清爽工具面板，展示品牌色点缀、统计指标和任务列表",
    icon: "W",
    accent: "#7c3aed",
    capabilities: [
      "Grid 指标卡",
      "CheckBox 写回",
      "List.dividers",
      "品牌色 style",
      "批量脚本",
    ],
    messages: surface(
      {
        todo: {
          draft: "",
          items: [
            { id: "task-1", title: "整理 Basic Catalog 能力矩阵", project: "Renderer", done: true },
            { id: "task-2", title: "补齐表单组件截图测试", project: "QA", done: false },
            { id: "task-3", title: "验证 JSRuntime 安全边界", project: "Runtime", done: false },
            { id: "task-4", title: "补充视觉设计指南 Reference", project: "Skill", done: true },
          ],
        },
      },
      [
        { id: "root", component: "Container", child: "todoCard", width: "content", padding: "none" },
        { id: "todoCard", component: "Card", child: "todoBody", role: "summary", density: "comfortable", variant: "elevated", header: "Renderer 待办清单", subtitle: "复选框和按钮脚本都会改写 dataModel", style: { backgroundColor: "#ffffff", borderRadius: "12px", shadow: "sm" } },
        { id: "todoBody", component: "Column", children: ["statsGrid", "todoComposer", "todoList", "todoActions"], gap: "14px" },
        { id: "statsGrid", component: "Grid", columns: 3, gap: "10px", children: ["statTotal", "statActive", "statDone"] },
        { id: "statTotal", component: "Card", child: "statTotalBody", role: "metric", density: "compact", variant: "filled", style: { backgroundColor: "#f5f3ff", borderColor: "#ddd6fe", borderRadius: "10px" } },
        { id: "statTotalBody", component: "Column", children: ["statTotalLabel", "statTotalValue"], gap: "4px" },
        { id: "statTotalLabel", component: "Text", text: "总计", usageHint: "caption", emphasis: "muted" },
        { id: "statTotalValue", component: "Text", text: { script: { code: "const items = dataModel.get('/todo/items') || []; return String(items.length);", deps: ["/todo/items"], fallback: "0" } }, role: "price", variant: "metric", usageHint: "h4", style: { color: "#7c3aed", fontWeight: "800" } },
        { id: "statActive", component: "Card", child: "statActiveBody", role: "metric", density: "compact", variant: "filled", style: { backgroundColor: "#fffbeb", borderColor: "#fde68a", borderRadius: "10px" } },
        { id: "statActiveBody", component: "Column", children: ["statActiveLabel", "statActiveValue"], gap: "4px" },
        { id: "statActiveLabel", component: "Text", text: "进行中", usageHint: "caption", emphasis: "muted" },
        { id: "statActiveValue", component: "Text", text: { script: { code: "const items = dataModel.get('/todo/items') || []; return String(items.filter((item) => !item.done).length);", deps: ["/todo/items"], fallback: "0" } }, role: "price", variant: "metric", usageHint: "h4", style: { color: "#d97706", fontWeight: "800" } },
        { id: "statDone", component: "Card", child: "statDoneBody", role: "metric", density: "compact", variant: "filled", style: { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0", borderRadius: "10px" } },
        { id: "statDoneBody", component: "Column", children: ["statDoneLabel", "statDoneValue"], gap: "4px" },
        { id: "statDoneLabel", component: "Text", text: "已完成", usageHint: "caption", emphasis: "muted" },
        { id: "statDoneValue", component: "Text", text: { script: { code: "const items = dataModel.get('/todo/items') || []; return String(items.filter((item) => item.done).length);", deps: ["/todo/items"], fallback: "0" } }, role: "price", variant: "metric", usageHint: "h4", style: { color: "#16a34a", fontWeight: "800" } },
        { id: "todoComposer", component: "Row", children: ["todoDraftField", "todoAddButton"], role: "actions", distribution: "spaceBetween", alignment: "center", gap: "8px", wrap: false },
        { id: "todoDraftField", component: "TextField", label: "新增任务", text: { path: "/todo/draft" }, usageHint: "shortText", placeholder: "输入任务标题", density: "compact", helpText: "添加后会清空输入框。" },
        {
          id: "todoAddButton",
          component: "Button",
          label: "添加",
          icon: "plus",
          intent: "primary",
          shape: "pill",
          style: { backgroundColor: "#7c3aed" },
          action: {
            script: {
              code: "const title = String(dataModel.get('/todo/draft') || '').trim(); if (!title) { actions.emit('todoSkipped', { reason: 'empty' }); return; } const items = dataModel.get('/todo/items') || []; const next = [...items, { id: `task-${items.length + 1}`, title, project: 'Renderer Lab', done: false }]; dataModel.set('/todo/items', next); dataModel.set('/todo/draft', ''); actions.emit('todoAdded', { title, total: next.length });",
              deps: ["/todo/items", "/todo/draft"],
            },
          },
        },
        { id: "todoList", component: "List", children: [{ path: "/todo/items", componentId: "todoItem" }], emptyText: "暂无任务，用上方输入框添加", itemRole: "card", dividers: true },
        { id: "todoItem", component: "Card", child: "todoItemBody", role: "summary", density: "compact", variant: "plain", style: { backgroundColor: "#ffffff", borderRadius: "8px" } },
        { id: "todoItemBody", component: "Row", children: ["todoCheck", "todoTitle", "todoMeta", "todoToggleButton"], role: "mediaObject", alignment: "center", distribution: "spaceBetween", gap: "10px", wrap: false },
        { id: "todoCheck", component: "CheckBox", value: { path: "done" }, density: "compact" },
        { id: "todoTitle", component: "Text", text: { path: "title" }, usageHint: "body", truncate: true, style: { minWidth: "0", flex: 1 } },
        { id: "todoMeta", component: "Column", children: ["todoProject", "todoStatus"], gap: "2px", alignment: "end" },
        { id: "todoProject", component: "Text", text: { path: "project" }, usageHint: "caption", emphasis: "muted" },
        { id: "todoStatus", component: "Text", text: { script: { code: "return dataModel.get('done') ? '已完成' : '进行中';", deps: ["done"], fallback: "进行中" } }, role: "status", emphasis: "success", usageHint: "caption" },
        { id: "todoToggleButton", component: "Button", label: { script: { code: "return dataModel.get('done') ? '已完成' : '完成';", deps: ["done"], fallback: "完成" } }, intent: "secondary", importance: "quiet", size: "sm", shape: "rounded", action: { script: { code: "const id = String(context.itemId || ''); const items = dataModel.get('/todo/items') || []; dataModel.set('/todo/items', items.map((item) => item.id === id ? { ...item, done: !item.done } : item)); actions.emit('todoToggled', { id, done: !Boolean(items.find((item) => item.id === id)?.done) });", deps: ["/todo/items"], context: { itemId: { path: "id" } } } } },
        { id: "todoActions", component: "Row", children: ["clearDoneButton", "todoSummary"], role: "actions", distribution: "spaceBetween", alignment: "center", wrap: false, style: { paddingTop: "8px", borderTop: "solid 1px #e5e7eb" } },
        { id: "clearDoneButton", component: "Button", label: "清理已完成", intent: "secondary", size: "sm", shape: "rounded", action: { script: { code: "const items = dataModel.get('/todo/items') || []; const next = items.filter((item) => !item.done); dataModel.set('/todo/items', next); actions.emit('completedCleared', { removed: items.length - next.length, remaining: next.length });", deps: ["/todo/items"] } } },
        { id: "todoSummary", component: "Text", text: { script: { code: "const items = dataModel.get('/todo/items') || []; const done = items.filter((item) => item.done).length; return `${done}/${items.length} 已完成 · ${items.length - done} 待办`;", deps: ["/todo/items"], fallback: "0/0 已完成" } }, usageHint: "caption", emphasis: "muted" },
      ],
    ),
  },
  {
    id: "finance-brief",
    title: "Finance Brief",
    subtitle: "黑金金融资讯卡，展示筛选、收藏、行情和事件回传",
    icon: "F",
    accent: "#b8862f",
    capabilities: [
      "黑金视觉",
      "分类筛选",
      "List 模板",
      "收藏写回",
      "行情事件",
    ],
    messages: surface(
      {
        finance: {
          selectedCategory: "精选",
          subscribed: false,
          headline: "Market Pulse",
          summary: "美股期货小幅走高，黄金维持高位震荡，机构继续关注本周通胀数据。",
          indices: [
            { id: "idx-1", name: "NASDAQ", value: "18,418.26", change: "+0.82%", tone: "success" },
            { id: "idx-2", name: "S&P 500", value: "5,487.03", change: "+0.31%", tone: "success" },
            { id: "idx-3", name: "Gold", value: "$2,384.6", change: "-0.14%", tone: "danger" },
          ],
          news: [
            { id: "news-1", category: "精选", title: "大型科技股盘前走强，AI 资本开支预期继续升温", source: "Bloom Desk", time: "08:45", saved: true, savedLabel: "已藏", impact: "影响 高", meta: "Bloom Desk · 08:45" },
            { id: "news-2", category: "美股", title: "芯片板块延续反弹，分析师上调云端需求预测", source: "Wallline", time: "09:10", saved: false, savedLabel: "收藏", impact: "影响 中", meta: "Wallline · 09:10" },
            { id: "news-3", category: "加密", title: "BTC 现货 ETF 资金连续三日净流入", source: "Chain Note", time: "09:28", saved: false, savedLabel: "收藏", impact: "影响 中", meta: "Chain Note · 09:28" },
            { id: "news-4", category: "宏观", title: "美元指数回落，交易员等待 CPI 修正信号", source: "Macro Lens", time: "10:05", saved: false, savedLabel: "收藏", impact: "影响 高", meta: "Macro Lens · 10:05" },
          ],
          visibleNews: [
            { id: "news-1", category: "精选", title: "大型科技股盘前走强，AI 资本开支预期继续升温", source: "Bloom Desk", time: "08:45", saved: true, savedLabel: "已藏", impact: "影响 高", meta: "Bloom Desk · 08:45" },
            { id: "news-2", category: "美股", title: "芯片板块延续反弹，分析师上调云端需求预测", source: "Wallline", time: "09:10", saved: false, savedLabel: "收藏", impact: "影响 中", meta: "Wallline · 09:10" },
            { id: "news-3", category: "加密", title: "BTC 现货 ETF 资金连续三日净流入", source: "Chain Note", time: "09:28", saved: false, savedLabel: "收藏", impact: "影响 中", meta: "Chain Note · 09:28" },
            { id: "news-4", category: "宏观", title: "美元指数回落，交易员等待 CPI 修正信号", source: "Macro Lens", time: "10:05", saved: false, savedLabel: "收藏", impact: "影响 高", meta: "Macro Lens · 10:05" },
          ],
        },
      },
      [
        { id: "root", component: "Container", child: "financeShell", width: "content", padding: "none" },
        { id: "financeShell", component: "Card", child: "financeBody", role: "summary", density: "compact", variant: "plain", style: { padding: "0", borderRadius: "24px", borderColor: "#2f2415", backgroundColor: "#080807", color: "#f8edcf", shadow: "lg" } },
        { id: "financeBody", component: "Column", children: ["financeHero", "financeIndexGrid", "financeCategoryRow", "financeNewsList", "financeFooter"], gap: "14px", style: { padding: "18px" } },
        { id: "financeHero", component: "Column", children: ["financeTopLine", "financeTitle", "financeSummary"], gap: "8px", style: { padding: "16px", borderRadius: "18px", backgroundColor: "#14100a", borderColor: "#3c2d18", borderWidth: "1px" } },
        { id: "financeTopLine", component: "Row", children: ["financeMarketLabel", "financeSelectedCategory", "financeSubscribeButton"], role: "actions", alignment: "center", distribution: "spaceBetween", gap: "8px", wrap: false },
        { id: "financeMarketLabel", component: "Text", text: "GLOBAL MARKETS", usageHint: "caption", style: { color: "#d7b46a", fontWeight: "900" } },
        { id: "financeSelectedCategory", component: "Text", text: { script: { code: "return `频道 · ${dataModel.get('/finance/selectedCategory') || '精选'}`;", deps: ["/finance/selectedCategory"], fallback: "频道 · 精选" } }, role: "status", usageHint: "caption", style: { color: "#f3d58b", padding: "3px 8px", borderRadius: "999px", backgroundColor: "#241a0c" } },
        {
          id: "financeSubscribeButton",
          component: "Button",
          label: { script: { code: "return dataModel.get('/finance/subscribed') ? '已订阅' : '订阅';", deps: ["/finance/subscribed"], fallback: "订阅" } },
          importance: "quiet",
          shape: "pill",
          size: "sm",
          style: { color: "#f5d58a", borderColor: "#614719", backgroundColor: "#1d160c" },
          action: {
            script: {
              code: "const next = !Boolean(dataModel.get('/finance/subscribed')); dataModel.set('/finance/subscribed', next); actions.emit('financeSubscriptionChanged', { subscribed: next });",
              deps: ["/finance/subscribed"],
            },
          },
        },
        { id: "financeTitle", component: "Text", text: { path: "/finance/headline" }, usageHint: "h2", style: { color: "#fff7df", fontWeight: "900" } },
        { id: "financeSummary", component: "Text", text: { path: "/finance/summary" }, usageHint: "body", style: { color: "#c8b98e", lineHeight: "1.7" } },
        { id: "financeIndexGrid", component: "Grid", columns: 3, gap: "8px", children: ["financeNasdaq", "financeSp", "financeGold"] },
        { id: "financeNasdaq", component: "Card", child: "financeNasdaqBody", role: "metric", density: "compact", variant: "filled", style: { backgroundColor: "#120f0a", borderColor: "#3a2b16", borderRadius: "16px" } },
        { id: "financeNasdaqBody", component: "Column", children: ["financeNasdaqName", "financeNasdaqValue", "financeNasdaqChange"], gap: "5px" },
        { id: "financeNasdaqName", component: "Text", text: "NASDAQ", usageHint: "caption", style: { color: "#b79a56", fontWeight: "800" } },
        { id: "financeNasdaqValue", component: "Text", text: "18,418", usageHint: "h4", style: { color: "#fff1c9", fontWeight: "900" } },
        { id: "financeNasdaqChange", component: "Text", text: "+0.82%", role: "status", emphasis: "success", usageHint: "caption" },
        { id: "financeSp", component: "Card", child: "financeSpBody", role: "metric", density: "compact", variant: "filled", style: { backgroundColor: "#120f0a", borderColor: "#3a2b16", borderRadius: "16px" } },
        { id: "financeSpBody", component: "Column", children: ["financeSpName", "financeSpValue", "financeSpChange"], gap: "5px" },
        { id: "financeSpName", component: "Text", text: "S&P 500", usageHint: "caption", style: { color: "#b79a56", fontWeight: "800" } },
        { id: "financeSpValue", component: "Text", text: "5,487", usageHint: "h4", style: { color: "#fff1c9", fontWeight: "900" } },
        { id: "financeSpChange", component: "Text", text: "+0.31%", role: "status", emphasis: "success", usageHint: "caption" },
        { id: "financeGold", component: "Card", child: "financeGoldBody", role: "metric", density: "compact", variant: "filled", style: { backgroundColor: "#120f0a", borderColor: "#3a2b16", borderRadius: "16px" } },
        { id: "financeGoldBody", component: "Column", children: ["financeGoldName", "financeGoldValue", "financeGoldChange"], gap: "5px" },
        { id: "financeGoldName", component: "Text", text: "Gold", usageHint: "caption", style: { color: "#b79a56", fontWeight: "800" } },
        { id: "financeGoldValue", component: "Text", text: "$2,384", usageHint: "h4", style: { color: "#fff1c9", fontWeight: "900" } },
        { id: "financeGoldChange", component: "Text", text: "-0.14%", role: "status", emphasis: "danger", usageHint: "caption" },
        { id: "financeCategoryRow", component: "Row", children: ["financeAllButton", "financeStockButton", "financeCryptoButton", "financeMacroButton"], role: "actions", gap: "8px", wrap: true },
        { id: "financeAllButton", component: "Button", label: "精选", shape: "pill", size: "sm", intent: "warning", action: { script: { code: "const news = dataModel.get('/finance/news') || []; dataModel.set('/finance/selectedCategory', '精选'); dataModel.set('/finance/visibleNews', news); actions.emit('financeCategoryChanged', { category: '精选', count: news.length });", deps: ["/finance/news"] } } },
        { id: "financeStockButton", component: "Button", label: "美股", shape: "pill", size: "sm", importance: "quiet", style: { color: "#d7b46a", backgroundColor: "#16120a", borderColor: "#3c2d18" }, action: { script: { code: "const news = dataModel.get('/finance/news') || []; const next = news.filter((item) => item.category === '美股'); dataModel.set('/finance/selectedCategory', '美股'); dataModel.set('/finance/visibleNews', next); actions.emit('financeCategoryChanged', { category: '美股', count: next.length });", deps: ["/finance/news"] } } },
        { id: "financeCryptoButton", component: "Button", label: "加密", shape: "pill", size: "sm", importance: "quiet", style: { color: "#d7b46a", backgroundColor: "#16120a", borderColor: "#3c2d18" }, action: { script: { code: "const news = dataModel.get('/finance/news') || []; const next = news.filter((item) => item.category === '加密'); dataModel.set('/finance/selectedCategory', '加密'); dataModel.set('/finance/visibleNews', next); actions.emit('financeCategoryChanged', { category: '加密', count: next.length });", deps: ["/finance/news"] } } },
        { id: "financeMacroButton", component: "Button", label: "宏观", shape: "pill", size: "sm", importance: "quiet", style: { color: "#d7b46a", backgroundColor: "#16120a", borderColor: "#3c2d18" }, action: { script: { code: "const news = dataModel.get('/finance/news') || []; const next = news.filter((item) => item.category === '宏观'); dataModel.set('/finance/selectedCategory', '宏观'); dataModel.set('/finance/visibleNews', next); actions.emit('financeCategoryChanged', { category: '宏观', count: next.length });", deps: ["/finance/news"] } } },
        { id: "financeNewsList", component: "List", children: [{ path: "/finance/visibleNews", componentId: "financeNewsItem" }], emptyText: "暂无资讯", itemRole: "card", dividers: false },
        { id: "financeNewsItem", component: "Card", child: "financeNewsItemBody", role: "interactive", density: "compact", variant: "filled", style: { backgroundColor: "#12100c", borderColor: "#332713", borderRadius: "18px" } },
        { id: "financeNewsItemBody", component: "Row", children: ["financeNewsCopy", "financeNewsActions"], role: "mediaObject", alignment: "center", distribution: "spaceBetween", gap: "10px", wrap: false },
        { id: "financeNewsCopy", component: "Column", children: ["financeNewsMeta", "financeNewsTitle", "financeNewsSource"], gap: "5px", style: { minWidth: "0" } },
        { id: "financeNewsMeta", component: "Row", children: ["financeNewsCategory", "financeNewsImpact"], role: "metadata", gap: "6px", wrap: false },
        { id: "financeNewsCategory", component: "Text", text: { path: "category" }, usageHint: "caption", style: { color: "#e1c16e", fontWeight: "900" } },
        { id: "financeNewsImpact", component: "Text", text: { path: "impact" }, role: "status", emphasis: "warning", usageHint: "caption" },
        { id: "financeNewsTitle", component: "Text", text: { path: "title" }, usageHint: "body", truncate: true, style: { color: "#fff7df", fontWeight: "800", minWidth: "0" } },
        { id: "financeNewsSource", component: "Text", text: { path: "meta" }, usageHint: "caption", style: { color: "#8f8263" } },
        { id: "financeNewsActions", component: "Column", children: ["financeSaveButton", "financeOpenButton"], gap: "6px", alignment: "end" },
        {
          id: "financeSaveButton",
          component: "Button",
          label: { path: "savedLabel" },
          size: "sm",
          shape: "pill",
          importance: "quiet",
          style: { color: "#f5d58a", backgroundColor: "#1d160c", borderColor: "#4b3715" },
          action: {
            script: {
              code: "const id = String(context.newsId || ''); const news = dataModel.get('/finance/news') || []; const visibleNews = dataModel.get('/finance/visibleNews') || []; const toggle = (item) => { if (item.id !== id) return item; const saved = !item.saved; return { ...item, saved, savedLabel: saved ? '已藏' : '收藏' }; }; const nextNews = news.map(toggle); const nextVisible = visibleNews.map(toggle); const saved = Boolean(nextVisible.find((item) => item.id === id)?.saved); dataModel.set('/finance/news', nextNews); dataModel.set('/finance/visibleNews', nextVisible); actions.emit('financeNewsSaved', { id, saved });",
              deps: ["/finance/news", "/finance/visibleNews"],
              context: { newsId: { path: "id" } },
            },
          },
        },
        { id: "financeOpenButton", component: "Button", label: "详情", size: "sm", intent: "warning", shape: "pill", action: { event: { name: "openFinanceNews", context: { id: { path: "id" }, title: { path: "title" }, category: { path: "category" } } } } },
        { id: "financeFooter", component: "Button", label: "查看行情日历", icon: "calendar_today", intent: "warning", shape: "rounded", fullWidth: true, action: { event: { name: "openMarketCalendar", context: { category: { path: "/finance/selectedCategory" }, subscribed: { path: "/finance/subscribed" } } } } },
      ],
    ),
  },
];
