import type {
  A2UIComponent,
  A2UIServerMessage,
  JsonObject,
} from "@a2ui-platform/shared";

export const CATALOG_ID =
  "https://a2ui.org/specification/v0.9/catalogs/basic/catalog.json";

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
    id: "vote",
    title: "Voting Card",
    subtitle: "投票卡片，覆盖动态 List、脚本 action 和状态绑定",
    icon: "V",
    accent: "#059669",
    capabilities: ["List 模板", "dataModel 写回", "Button.action.script", "事件派发"],
    messages: surface(
      {
        poll: {
          title: "下一阶段优先打磨什么？",
          summary: "团队投票会实时更新本地结果。",
          totalVotes: 842,
          selectedId: "",
          options: [
            { id: "bindings", label: "数据绑定体验", votes: 312, percent: 37, percentLabel: "37%" },
            { id: "visual", label: "视觉组件质感", votes: 286, percent: 34, percentLabel: "34%" },
            { id: "runtime", label: "JSRuntime 交互", votes: 168, percent: 20, percentLabel: "20%" },
            { id: "forms", label: "表单组件能力", votes: 76, percent: 9, percentLabel: "9%" },
          ],
        },
      },
      [
        { id: "root", component: "Card", child: "voteBody", variant: "elevated", style: { maxWidth: "390px", padding: "18px", borderRadius: "22px", shadow: "md", backgroundColor: "#ffffff" } },
        { id: "voteBody", component: "Column", children: ["voteBadge", "voteTitle", "voteSummary", "voteList", "voteFooter"], gap: "12px" },
        { id: "voteBadge", component: "Text", text: "ACTIVE POLL", usageHint: "caption", tone: "success", style: { padding: "4px 8px", borderRadius: "999px", backgroundColor: "#DCFCE7", fontWeight: 700, alignSelf: "start" } },
        { id: "voteTitle", component: "Text", text: { path: "/poll/title" }, usageHint: "h3", style: { lineHeight: 1.18 } },
        { id: "voteSummary", component: "Text", text: { path: "/poll/summary" }, usageHint: "caption", tone: "neutral" },
        { id: "voteList", component: "List", children: [{ path: "/poll/options", componentId: "voteOption" }] },
        { id: "voteOption", component: "Card", child: "voteOptionBody", variant: "plain", style: { padding: "8px 0", borderColor: "transparent", shadow: "none" } },
        { id: "voteOptionBody", component: "Column", children: ["voteOptionTop", "voteProgress"], gap: "7px" },
        { id: "voteOptionTop", component: "Row", children: ["voteButton", "votePercent"], alignment: "center", distribution: "spaceBetween", gap: "10px" },
        { id: "voteOptionLabel", component: "Text", text: { path: "label" }, usageHint: "body" },
        {
          id: "voteButton",
          component: "Button",
          child: "voteOptionLabel",
          variant: "ghost",
          fullWidth: false,
          style: { padding: "4px 0", color: "#111827", backgroundColor: "transparent" },
          action: {
            script: {
              code: "const id = String(context.optionId || ''); const options = dataModel.get('/poll/options') || []; const current = String(dataModel.get('/poll/selectedId') || ''); const nextOptions = options.map((item) => item.id === id && current !== id ? { ...item, votes: Number(item.votes || 0) + 1 } : item); const total = nextOptions.reduce((sum, item) => sum + Number(item.votes || 0), 0); const normalized = nextOptions.map((item) => ({ ...item, percent: Math.round((Number(item.votes || 0) / total) * 100), percentLabel: `${Math.round((Number(item.votes || 0) / total) * 100)}%` })); dataModel.set('/poll/options', normalized); dataModel.set('/poll/totalVotes', total); dataModel.set('/poll/selectedId', id); actions.emit('voteChanged', { optionId: id, totalVotes: total });",
              deps: ["/poll/options", "/poll/selectedId"],
              context: { optionId: { path: "id" } },
            },
          },
        },
        { id: "votePercent", component: "Text", text: { path: "percentLabel" }, usageHint: "caption", tone: "neutral", style: { fontWeight: 700 } },
        { id: "voteProgress", component: "Slider", min: 0, max: 100, step: 1, value: { path: "percent" }, showValue: false, disabled: true },
        { id: "voteFooter", component: "Text", text: { script: { code: "return `${dataModel.get('/poll/totalVotes') || 0} votes · Tap an option to update`; ", deps: ["/poll/totalVotes"], fallback: "Tap an option to update" } }, usageHint: "caption", tone: "neutral" },
      ],
    ),
  },
  {
    id: "course",
    title: "Course Card",
    subtitle: "课程卡片，覆盖列表模板、相对路径和信息层级",
    icon: "C",
    accent: "#2563eb",
    capabilities: ["动态 List", "相对路径", "Card 组合", "文本层级"],
    messages: surface(
      {
        school: {
          today: "周三",
          campus: "明理楼",
          courses: [
            { day: "周一", time: "08:00 - 09:30", name: "高等数学", room: "A201", teacher: "王老师", status: "已完成" },
            { day: "周三", time: "14:00 - 15:30", name: "C++ 程序设计", room: "实验楼 305", teacher: "李老师", status: "进行中" },
            { day: "周五", time: "10:00 - 11:30", name: "设计系统导论", room: "B108", teacher: "陈老师", status: "待开始" },
          ],
        },
      },
      [
        { id: "root", component: "Column", children: ["courseHero", "courseList"], gap: "14px", style: { maxWidth: "390px", padding: "4px" } },
        { id: "courseHero", component: "Card", child: "courseHeroBody", variant: "elevated", style: { padding: "18px", borderRadius: "22px", shadow: "md", backgroundColor: "#F8FBFF" } },
        { id: "courseHeroBody", component: "Column", children: ["courseKicker", "courseTitle", "courseSummary"], gap: "6px" },
        { id: "courseKicker", component: "Text", text: "TODAY SCHEDULE", usageHint: "caption", tone: "brand", style: { fontWeight: 800 } },
        { id: "courseTitle", component: "Text", text: "本周课程安排", usageHint: "h2" },
        { id: "courseSummary", component: "Text", text: { script: { code: "const courses = dataModel.get('/school/courses') || []; return `${dataModel.get('/school/today')} · ${courses.length} 门课程 · ${dataModel.get('/school/campus')}`;", deps: ["/school/today", "/school/courses", "/school/campus"], fallback: "课程概览" } }, usageHint: "caption", tone: "neutral" },
        { id: "courseList", component: "List", children: [{ path: "/school/courses", componentId: "courseItem" }] },
        { id: "courseItem", component: "Card", child: "courseItemBody", variant: "filled", style: { padding: "14px", borderRadius: "18px", backgroundColor: "#ffffff", shadow: "sm" } },
        { id: "courseItemBody", component: "Row", children: ["courseTimeBox", "courseInfo", "courseStatus"], gap: "12px", alignment: "center", distribution: "spaceBetween", wrap: false },
        { id: "courseTimeBox", component: "Column", children: ["courseDay", "courseTime"], gap: "2px", style: { minWidth: "82px" } },
        { id: "courseDay", component: "Text", text: { path: "day" }, usageHint: "caption", tone: "brand", style: { fontWeight: 800 } },
        { id: "courseTime", component: "Text", text: { path: "time" }, usageHint: "caption", tone: "neutral" },
        { id: "courseInfo", component: "Column", children: ["courseName", "courseRoom", "courseTeacher"], gap: "3px", style: { minWidth: "128px" } },
        { id: "courseName", component: "Text", text: { path: "name" }, usageHint: "h4", maxLines: 1 },
        { id: "courseRoom", component: "Text", text: { path: "room" }, usageHint: "caption", tone: "neutral" },
        { id: "courseTeacher", component: "Text", text: { path: "teacher" }, usageHint: "caption", tone: "neutral" },
        { id: "courseStatus", component: "Text", text: { path: "status" }, usageHint: "caption", tone: "success", style: { padding: "4px 8px", borderRadius: "999px", backgroundColor: "#ECFDF3", fontWeight: 700 } },
      ],
    ),
  },
  {
    id: "music",
    title: "Music Player",
    subtitle: "音乐播放器，覆盖媒体布局、Icon 脚本和本地状态",
    icon: "M",
    accent: "#0f766e",
    capabilities: ["Image 媒体", "Icon 属性脚本", "Slider 绑定", "本地播放状态"],
    messages: surface(
      {
        player: { isPlaying: false, progress: 32, isFavorite: false },
        song: { title: "Midnight Drive", artist: "Synthwave Dreams", coverUrl: "https://picsum.photos/seed/a2ui-music/640/640" },
      },
      [
        { id: "root", component: "Card", child: "musicBody", preset: "media", variant: "elevated", style: { maxWidth: "390px", padding: "14px", borderRadius: "24px", shadow: "md", backgroundColor: "#0F2A2E", color: "#ffffff" } },
        { id: "musicBody", component: "Column", children: ["cover", "musicInfoRow", "musicProgress", "musicControls"], gap: "14px" },
        { id: "cover", component: "Image", url: { path: "/song/coverUrl" }, alt: "Album cover", fit: "cover", aspectRatio: "1:1", style: { borderRadius: "18px" } },
        { id: "musicInfoRow", component: "Row", children: ["songText", "favButton"], alignment: "center", distribution: "spaceBetween", wrap: false },
        { id: "songText", component: "Column", children: ["songLabel", "songTitle", "songArtist"], gap: "3px" },
        { id: "songLabel", component: "Text", text: "NOW PLAYING", usageHint: "caption", style: { color: "#9FE7D2", fontWeight: 800 } },
        { id: "songTitle", component: "Text", text: { path: "/song/title" }, usageHint: "h3", style: { color: "#ffffff" }, maxLines: 1 },
        { id: "songArtist", component: "Text", text: { path: "/song/artist" }, usageHint: "caption", style: { color: "#C7D7D4" } },
        { id: "favIcon", component: "Icon", name: { script: { code: "return dataModel.get('/player/isFavorite') ? 'favorite' : 'favorite_border';", deps: ["/player/isFavorite"], fallback: "favorite_border" } }, tone: "danger" },
        { id: "favButton", component: "Button", child: "favIcon", variant: "ghost", preset: "buttonIcon", action: { script: { code: "const next = !Boolean(dataModel.get('/player/isFavorite')); dataModel.set('/player/isFavorite', next); actions.emit('favoriteChanged', { isFavorite: next });", deps: ["/player/isFavorite"] } } },
        { id: "musicProgress", component: "Slider", min: 0, max: 100, step: 1, value: { path: "/player/progress" }, showValue: false },
        { id: "musicControls", component: "Row", children: ["prevButton", "playButton", "nextButton"], alignment: "center", distribution: "spaceEvenly", wrap: false },
        { id: "prevIcon", component: "Icon", name: "skip_previous", size: "lg" },
        { id: "prevButton", component: "Button", child: "prevIcon", variant: "ghost", preset: "buttonIcon", action: { event: { name: "previousTrack", context: { title: { path: "/song/title" } } } } },
        { id: "playIcon", component: "Icon", name: { script: { code: "return dataModel.get('/player/isPlaying') ? 'pause' : 'play_arrow';", deps: ["/player/isPlaying"], fallback: "play_arrow" } }, size: "lg" },
        { id: "playButton", component: "Button", child: "playIcon", variant: "primary", size: "lg", preset: "buttonIcon", action: { script: { code: "const next = !Boolean(dataModel.get('/player/isPlaying')); dataModel.set('/player/isPlaying', next); actions.emit('playToggled', { isPlaying: next });", deps: ["/player/isPlaying"] } } },
        { id: "nextIcon", component: "Icon", name: "skip_next", size: "lg" },
        { id: "nextButton", component: "Button", child: "nextIcon", variant: "ghost", preset: "buttonIcon", action: { event: { name: "nextTrack", context: { title: { path: "/song/title" } } } } },
      ],
    ),
  },
  {
    id: "todo",
    title: "Todo List",
    subtitle: "待办清单，覆盖输入、复选框、脚本新增和批量清理",
    icon: "T",
    accent: "#0ea5e9",
    capabilities: ["TextField 写回", "CheckBox 写回", "List 模板", "批量脚本"],
    messages: surface(
      {
        todo: {
          draft: "补充 Slider 视觉回归",
          items: [
            { id: "task-1", title: "整理 Basic Catalog 能力矩阵", project: "Renderer", done: true, priority: "High" },
            { id: "task-2", title: "补齐表单组件截图测试", project: "QA", done: false, priority: "Medium" },
            { id: "task-3", title: "验证 JSRuntime 安全边界", project: "Runtime", done: false, priority: "High" },
          ],
        },
      },
      [
        { id: "root", component: "Card", child: "todoBody", variant: "elevated", style: { maxWidth: "390px", padding: "18px", borderRadius: "24px", shadow: "md", backgroundColor: "#ffffff" } },
        { id: "todoBody", component: "Column", children: ["todoHeader", "todoComposer", "todoList", "todoActions"], gap: "14px" },
        { id: "todoHeader", component: "Column", children: ["todoBadge", "todoTitle", "todoSummary"], gap: "6px" },
        { id: "todoBadge", component: "Text", text: "TODAY TASKS", usageHint: "caption", tone: "brand", style: { padding: "4px 8px", borderRadius: "999px", backgroundColor: "#E0F2FE", fontWeight: 800, alignSelf: "start" } },
        { id: "todoTitle", component: "Text", text: "Renderer 待办清单", usageHint: "h3" },
        { id: "todoSummary", component: "Text", text: { script: { code: "const items = dataModel.get('/todo/items') || []; const done = items.filter((item) => item.done).length; return `${done}/${items.length} completed · ${items.length - done} open`; ", deps: ["/todo/items"], fallback: "0/0 completed" } }, usageHint: "caption", tone: "neutral" },
        { id: "todoComposer", component: "Card", child: "todoComposerBody", variant: "filled", style: { padding: "12px", borderRadius: "18px", backgroundColor: "#F8FAFC" } },
        { id: "todoComposerBody", component: "Column", children: ["todoDraftField", "todoAddButton"], gap: "10px" },
        { id: "todoDraftField", component: "TextField", label: "新增任务", text: { path: "/todo/draft" }, usageHint: "shortText" },
        { id: "todoAddText", component: "Text", text: "添加到清单", style: { color: "#ffffff", fontWeight: 800 } },
        {
          id: "todoAddButton",
          component: "Button",
          child: "todoAddText",
          variant: "primary",
          fullWidth: true,
          action: {
            script: {
              code: "const title = String(dataModel.get('/todo/draft') || '').trim(); if (!title) { actions.emit('todoSkipped', { reason: 'empty' }); return; } const items = dataModel.get('/todo/items') || []; const next = [...items, { id: `task-${items.length + 1}`, title, project: 'Renderer Lab', done: false, priority: 'Normal' }]; dataModel.set('/todo/items', next); dataModel.set('/todo/draft', ''); actions.emit('todoAdded', { title, total: next.length });",
              deps: ["/todo/items", "/todo/draft"],
            },
          },
        },
        { id: "todoList", component: "List", children: [{ path: "/todo/items", componentId: "todoItem" }] },
        { id: "todoItem", component: "Card", child: "todoItemBody", variant: "filled", style: { padding: "12px", borderRadius: "18px", backgroundColor: "#FFFFFF", shadow: "sm" } },
        { id: "todoItemBody", component: "Row", children: ["todoCheck", "todoMeta", "todoPriority"], alignment: "center", distribution: "spaceBetween", gap: "10px", wrap: false },
        { id: "todoCheck", component: "CheckBox", label: { path: "title" }, value: { path: "done" } },
        { id: "todoMeta", component: "Column", children: ["todoProject", "todoState"], gap: "3px", style: { minWidth: "86px" } },
        { id: "todoProject", component: "Text", text: { path: "project" }, usageHint: "caption", tone: "neutral" },
        { id: "todoState", component: "Text", text: "复选框写回", usageHint: "caption", tone: "success", style: { fontWeight: 800 } },
        { id: "todoPriority", component: "Text", text: { path: "priority" }, usageHint: "caption", tone: "brand", style: { padding: "4px 8px", borderRadius: "999px", backgroundColor: "#EFF6FF", fontWeight: 800 } },
        { id: "todoActions", component: "Row", children: ["clearDoneButton", "todoOpenCount"], alignment: "center", distribution: "spaceBetween", wrap: false },
        { id: "clearDoneText", component: "Text", text: "清理已完成" },
        { id: "clearDoneButton", component: "Button", child: "clearDoneText", variant: "outline", size: "sm", action: { script: { code: "const items = dataModel.get('/todo/items') || []; const next = items.filter((item) => !item.done); dataModel.set('/todo/items', next); actions.emit('completedCleared', { removed: items.length - next.length, remaining: next.length });", deps: ["/todo/items"] } } },
        { id: "todoOpenCount", component: "Text", text: { script: { code: "const items = dataModel.get('/todo/items') || []; return `${items.filter((item) => !item.done).length} open`; ", deps: ["/todo/items"], fallback: "0 open" } }, usageHint: "caption", tone: "neutral" },
      ],
    ),
  },
  {
    id: "product",
    title: "Product Card",
    subtitle: "商品卡片，覆盖图片、价格指标和业务事件",
    icon: "P",
    accent: "#d97706",
    capabilities: ["Image", "价格指标", "Button.action.event", "视觉层级"],
    messages: surface(
      {
        product: {
          sku: "keyboard-lite",
          title: "FlowKey 轻量机械键盘",
          desc: "低噪轴体、热插拔、三模连接，适合编程与移动办公。",
          price: "¥399",
          rating: "4.8",
          image: "https://picsum.photos/seed/a2ui-keyboard/720/480",
        },
      },
      [
        { id: "root", component: "Card", child: "productBody", variant: "elevated", style: { maxWidth: "390px", padding: "14px", borderRadius: "24px", shadow: "md" } },
        { id: "productBody", component: "Column", children: ["productImage", "productMeta", "productTitle", "productDesc", "productBuyRow"], gap: "11px" },
        { id: "productImage", component: "Image", url: { path: "/product/image" }, alt: "Product", fit: "cover", aspectRatio: "16:10", style: { borderRadius: "18px" } },
        { id: "productMeta", component: "Row", children: ["productBadge", "productRating"], alignment: "center", distribution: "spaceBetween" },
        { id: "productBadge", component: "Text", text: "LIMITED DROP", usageHint: "caption", tone: "warning", style: { padding: "4px 8px", borderRadius: "999px", backgroundColor: "#FEF3C7", fontWeight: 800 } },
        { id: "productRating", component: "Text", text: { script: { code: "return `★ ${dataModel.get('/product/rating')}`;", deps: ["/product/rating"], fallback: "★ 4.8" } }, usageHint: "caption", tone: "neutral", style: { fontWeight: 700 } },
        { id: "productTitle", component: "Text", text: { path: "/product/title" }, usageHint: "h3", maxLines: 1 },
        { id: "productDesc", component: "Text", text: { path: "/product/desc" }, usageHint: "caption", tone: "neutral", maxLines: 2 },
        { id: "productBuyRow", component: "Row", children: ["productPrice", "productBuyButton"], alignment: "center", distribution: "spaceBetween", wrap: false },
        { id: "productPrice", component: "Text", text: { path: "/product/price" }, variant: "metric", tone: "brand" },
        { id: "productBuyText", component: "Text", text: "加入购物车", style: { color: "#ffffff", fontWeight: 700 } },
        { id: "productBuyButton", component: "Button", child: "productBuyText", variant: "primary", action: { event: { name: "addToCart", context: { sku: { path: "/product/sku" }, title: { path: "/product/title" } } } } },
      ],
    ),
  },
  {
    id: "metrics",
    title: "Metrics Board",
    subtitle: "数据看板，覆盖指标卡、派生文案和动态颜色",
    icon: "D",
    accent: "#7c3aed",
    capabilities: ["属性脚本", "Metric 文本", "响应式数据", "多卡片布局"],
    messages: surface(
      {
        metrics: {
          conversion: 0.183,
          orders: 1284,
          risk: 2,
          revenue: "¥86.4k",
        },
      },
      [
        { id: "root", component: "Column", children: ["metricsHeader", "metricsRow", "riskCard"], gap: "14px", style: { maxWidth: "390px", padding: "4px" } },
        { id: "metricsHeader", component: "Column", children: ["metricsTitle", "metricsSub"], gap: "4px" },
        { id: "metricsTitle", component: "Text", text: "今日经营概览", usageHint: "h2" },
        { id: "metricsSub", component: "Text", text: "关键指标会根据 dataModel 派生展示状态。", usageHint: "caption", tone: "neutral" },
        { id: "metricsRow", component: "Row", children: ["conversionCard", "ordersCard"], gap: "12px", alignment: "stretch", wrap: false },
        { id: "conversionCard", component: "Card", child: "conversionBody", variant: "filled", style: { padding: "16px", borderRadius: "18px", backgroundColor: "#ECFDF5", minWidth: "150px" } },
        { id: "conversionBody", component: "Column", children: ["conversionLabel", "conversionValue", "conversionHint"], gap: "5px" },
        { id: "conversionLabel", component: "Text", text: "转化率", usageHint: "caption", tone: "neutral" },
        { id: "conversionValue", component: "Text", text: { script: { code: "return `${Math.round(Number(dataModel.get('/metrics/conversion') || 0) * 1000) / 10}%`;", deps: ["/metrics/conversion"], fallback: "0%" } }, variant: "metric", tone: "brand" },
        { id: "conversionHint", component: "Text", text: { script: { code: "return Number(dataModel.get('/metrics/conversion') || 0) >= 0.18 ? '表现良好' : '需要关注';", deps: ["/metrics/conversion"], fallback: "暂无状态" } }, usageHint: "caption", tone: "success" },
        { id: "ordersCard", component: "Card", child: "ordersBody", variant: "filled", style: { padding: "16px", borderRadius: "18px", backgroundColor: "#F8FAFC", minWidth: "150px" } },
        { id: "ordersBody", component: "Column", children: ["ordersLabel", "ordersValue", "revenue"], gap: "5px" },
        { id: "ordersLabel", component: "Text", text: "订单数", usageHint: "caption", tone: "neutral" },
        { id: "ordersValue", component: "Text", text: { script: { code: "return String(dataModel.get('/metrics/orders') || 0);", deps: ["/metrics/orders"], fallback: "0" } }, variant: "metric" },
        { id: "revenue", component: "Text", text: { path: "/metrics/revenue" }, usageHint: "caption", tone: "neutral" },
        { id: "riskCard", component: "Card", child: "riskBody", variant: "elevated", style: { padding: "16px", borderRadius: "18px", shadow: "sm" } },
        { id: "riskBody", component: "Row", children: ["riskCopy", "riskButton"], alignment: "center", distribution: "spaceBetween", wrap: false },
        { id: "riskCopy", component: "Column", children: ["riskTitle", "riskHint"], gap: "4px" },
        { id: "riskTitle", component: "Text", text: "风险巡检", usageHint: "h4" },
        { id: "riskHint", component: "Text", text: { script: { code: "const risk = Number(dataModel.get('/metrics/risk') || 0); return risk <= 2 ? '当前风险较低' : '存在待处理风险';", deps: ["/metrics/risk"], fallback: "暂无风险数据" } }, usageHint: "caption", tone: "neutral" },
        { id: "riskButtonText", component: "Text", text: "查看", style: { color: "#ffffff", fontWeight: 700 } },
        { id: "riskButton", component: "Button", child: "riskButtonText", variant: "primary", action: { event: { name: "openRiskDetail", context: { risk: { path: "/metrics/risk" } } } } },
      ],
    ),
  },
];
