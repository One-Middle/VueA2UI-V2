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

const albumCover = svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
  <defs>
    <linearGradient id="albumBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0f172a"/>
      <stop offset="0.48" stop-color="#0ea5e9"/>
      <stop offset="1" stop-color="#f97316"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="18"/>
    </filter>
  </defs>
  <rect width="640" height="640" rx="48" fill="url(#albumBg)"/>
  <circle cx="214" cy="206" r="92" fill="#f8fafc" opacity="0.24" filter="url(#soft)"/>
  <circle cx="430" cy="394" r="148" fill="#111827" opacity="0.45"/>
  <circle cx="430" cy="394" r="42" fill="#f8fafc" opacity="0.92"/>
  <path d="M188 424c92-132 172-188 264-168" fill="none" stroke="#f8fafc" stroke-width="22" stroke-linecap="round" opacity="0.88"/>
  <text x="70" y="558" fill="#f8fafc" font-family="Arial, sans-serif" font-size="42" font-weight="700">Northline</text>
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
        { id: "liveCard", component: "Card", child: "liveBody", role: "media", density: "compact", variant: "plain", style: { padding: 0, borderRadius: "20px", borderColor: "transparent", shadow: "md", backgroundColor: "#ffffff", overflow: "hidden" } },
        { id: "liveBody", component: "Column", children: ["heroImage", "liveStrip", "productShelf", "commerceActions"], gap: "0" },
        { id: "heroImage", component: "Image", url: { path: "/live/cover" }, alt: "Live kitchen", role: "hero", shape: "square", fit: "cover", aspectRatio: "16:13" },
        { id: "liveStrip", component: "Row", children: ["liveTitleGroup", "liveVisit"], role: "actions", distribution: "spaceBetween", alignment: "center", wrap: false, style: { padding: "10px 12px", backgroundColor: "#3d3b36", gap: "10px" } },
        { id: "liveTitleGroup", component: "Row", children: ["liveBadge", "liveTitle"], role: "metadata", alignment: "center", gap: "8px", wrap: false },
        { id: "liveBadge", component: "Text", text: { path: "/live/badge" }, usageHint: "caption", role: "discount", style: { padding: "2px 6px", borderRadius: "4px", backgroundColor: "#ff2f64", color: "#ffffff", fontWeight: 800 } },
        { id: "liveTitle", component: "Text", text: { path: "/live/title" }, usageHint: "body", truncate: true, style: { color: "#ffffff", fontWeight: 700, minWidth: "0" } },
        { id: "liveVisit", component: "Button", label: { path: "/live/cta" }, icon: "chevron_right", iconPosition: "right", importance: "quiet", shape: "pill", action: { event: { name: "openLiveRoom", context: { title: { path: "/live/title" } } } }, style: { color: "#ffffff", padding: "4px 0", minWidth: "64px" } },
        { id: "productShelf", component: "Row", children: ["productThumb", "productInfo"], role: "mediaObject", gap: "10px", alignment: "center", wrap: false, style: { padding: "10px 12px 6px" } },
        { id: "productThumb", component: "Image", url: { path: "/product/thumbnail" }, alt: "Product thumbnail", role: "thumbnail", shape: "rounded", fit: "cover", aspectRatio: "1:1", style: { width: "46px" } },
        { id: "productInfo", component: "Column", children: ["productTitleRow", "priceRow", "benefitRow"], gap: "4px", style: { minWidth: "0", flex: 1 } },
        { id: "productTitleRow", component: "Row", children: ["productBrand", "productTitle", "productDetail"], role: "metadata", alignment: "center", gap: "4px", wrap: false },
        { id: "productBrand", component: "Text", text: { path: "/product/brand" }, usageHint: "body", role: "discount", style: { fontWeight: 800 } },
        { id: "productTitle", component: "Text", text: { path: "/product/title" }, usageHint: "body", emphasis: "strong", truncate: true, style: { minWidth: "0" } },
        { id: "productDetail", component: "Text", text: { script: { code: "return `${dataModel.get('/product/detail')} ›`;", deps: ["/product/detail"], fallback: "详情 ›" } }, usageHint: "caption", emphasis: "muted", style: { minWidth: "38px" } },
        { id: "priceRow", component: "Row", children: ["productPrice", "productSubsidy", "productSales"], role: "metadata", alignment: "end", gap: "4px", wrap: false },
        { id: "productPrice", component: "Text", text: { path: "/product/price" }, role: "price", variant: "metric", tone: "warning", style: { fontSize: "22px" } },
        { id: "productSubsidy", component: "Text", text: { path: "/product/subsidy" }, role: "discount", usageHint: "caption" },
        { id: "productSales", component: "Text", text: { path: "/product/sales" }, usageHint: "caption", emphasis: "muted" },
        { id: "benefitRow", component: "Text", text: { path: "/product/benefit" }, usageHint: "caption", role: "discount", style: { textAlign: "right" } },
        { id: "commerceActions", component: "Row", children: ["socialStats", "cartButton", "buyButton"], role: "actions", alignment: "center", gap: "8px", wrap: false, style: { padding: "8px 12px 12px" } },
        { id: "socialStats", component: "Row", children: ["commentMetric", "starMetric"], role: "metadata", gap: "10px", wrap: false, style: { minWidth: "88px" } },
        { id: "commentMetric", component: "Column", children: ["commentIcon", "commentCount"], gap: "2px", style: { alignItems: "center" } },
        { id: "commentIcon", component: "Icon", icon: "chat_bubble", semantic: "comment", label: "comments", size: "md" },
        { id: "commentCount", component: "Text", text: { path: "/live/viewers" }, usageHint: "caption", emphasis: "muted" },
        { id: "starMetric", component: "Column", children: ["starIcon", "starCount"], gap: "2px", style: { alignItems: "center" } },
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
    id: "course",
    title: "Course Planner",
    subtitle: "课程表单，展示表单语义、segmented 选择器和状态脚本",
    icon: "C",
    accent: "#2563eb",
    capabilities: [
      "表单语义",
      "ChoicePicker.mode",
      "List.emptyText",
      "action.script",
      "状态写回",
    ],
    messages: surface(
      {
        school: {
          draft: {
            day: "周三",
            time: "16:00 - 17:30",
            name: "A2UI 组件实践",
            room: "B216",
            teacher: "赵老师",
          },
          courses: [
            { id: "course-1", day: "周一", time: "08:00 - 09:30", name: "高等数学", room: "A201", teacher: "王老师", status: "已完成" },
            { id: "course-2", day: "周三", time: "14:00 - 15:30", name: "C++ 程序设计", room: "实验楼 305", teacher: "李老师", status: "进行中" },
            { id: "course-3", day: "周五", time: "10:00 - 11:30", name: "设计系统导论", room: "B108", teacher: "陈老师", status: "待开始" },
          ],
        },
      },
      [
        { id: "root", component: "Container", child: "courseStack", width: "content", padding: "none" },
        { id: "courseStack", component: "Column", children: ["courseHero", "courseComposer", "courseList", "courseStats"], gap: "14px" },
        { id: "courseHero", component: "Card", child: "courseHeroBody", role: "summary", density: "spacious", variant: "elevated", header: "本周课程安排", subtitle: "表单输入会直接写回 dataModel" },
        { id: "courseHeroBody", component: "Grid", columns: 3, gap: "8px", children: ["courseTotal", "courseActive", "courseDone"] },
        { id: "courseTotal", component: "Text", text: { script: { code: "const courses = dataModel.get('/school/courses') || []; return `${courses.length} 门`; ", deps: ["/school/courses"], fallback: "0 门" } }, role: "price", usageHint: "h4" },
        { id: "courseActive", component: "Text", text: { script: { code: "const courses = dataModel.get('/school/courses') || []; return `${courses.filter((item) => item.status === '进行中').length} 进行中`; ", deps: ["/school/courses"], fallback: "0 进行中" } }, role: "status", emphasis: "warning", usageHint: "caption" },
        { id: "courseDone", component: "Text", text: { script: { code: "const courses = dataModel.get('/school/courses') || []; return `${courses.filter((item) => item.status === '已完成').length} 完成`; ", deps: ["/school/courses"], fallback: "0 完成" } }, role: "status", emphasis: "success", usageHint: "caption" },
        { id: "courseComposer", component: "Card", child: "courseComposerBody", role: "form", density: "compact", variant: "filled", header: "新增课程", subtitle: "试试修改课程名后点击添加" },
        { id: "courseComposerBody", component: "Column", children: ["courseNameField", "courseDayPicker", "courseRoomTeacherGrid", "courseAddButton"], gap: "10px" },
        { id: "courseNameField", component: "TextField", label: "课程名称", name: "courseName", text: { path: "/school/draft/name" }, usageHint: "shortText", placeholder: "请输入课程名称", helpText: "为空时不会添加课程。", validationState: "success", density: "compact" },
        { id: "courseDayPicker", component: "ChoicePicker", label: "星期", name: "day", mode: "segmented", options: [{ label: "周一", value: "周一" }, { label: "周二", value: "周二" }, { label: "周三", value: "周三" }, { label: "周四", value: "周四" }, { label: "周五", value: "周五" }], value: { path: "/school/draft/day" }, density: "compact" },
        { id: "courseRoomTeacherGrid", component: "Grid", columns: 2, gap: "8px", children: ["courseRoomField", "courseTeacherField"] },
        { id: "courseRoomField", component: "TextField", label: "教室", name: "room", text: { path: "/school/draft/room" }, usageHint: "shortText", density: "compact" },
        { id: "courseTeacherField", component: "TextField", label: "老师", name: "teacher", text: { path: "/school/draft/teacher" }, usageHint: "shortText", density: "compact" },
        {
          id: "courseAddButton",
          component: "Button",
          label: "添加课程",
          icon: "plus",
          intent: "primary",
          fullWidth: true,
          action: {
            script: {
              code: "const draft = dataModel.get('/school/draft') || {}; const name = String(draft.name || '').trim(); if (!name) { actions.emit('courseSkipped', { reason: 'emptyName' }); return; } const courses = dataModel.get('/school/courses') || []; const nextCourse = { id: `course-${courses.length + 1}`, day: String(draft.day || '周三'), time: String(draft.time || '待定'), name, room: String(draft.room || '待定教室'), teacher: String(draft.teacher || '待定老师'), status: '待开始' }; const next = [...courses, nextCourse]; dataModel.set('/school/courses', next); dataModel.set('/school/draft/name', ''); actions.emit('courseAdded', { id: nextCourse.id, name, total: next.length });",
              deps: ["/school/draft", "/school/courses"],
            },
          },
        },
        { id: "courseList", component: "List", children: [{ path: "/school/courses", componentId: "courseItem" }], emptyText: "暂无课程", itemRole: "card", dividers: false },
        { id: "courseItem", component: "Card", child: "courseItemBody", role: "summary", density: "compact", variant: "filled" },
        { id: "courseItemBody", component: "Row", children: ["courseInfo", "courseStatusActions"], role: "mediaObject", alignment: "center", distribution: "spaceBetween", gap: "10px", wrap: false },
        { id: "courseInfo", component: "Column", children: ["courseName", "courseMeta", "courseRoom", "courseTeacher"], gap: "3px" },
        { id: "courseName", component: "Text", text: { path: "name" }, usageHint: "h4", truncate: true },
        { id: "courseMeta", component: "Text", text: { path: "time" }, usageHint: "caption", emphasis: "muted" },
        { id: "courseRoom", component: "Text", text: { path: "room" }, usageHint: "caption", emphasis: "muted" },
        { id: "courseTeacher", component: "Text", text: { path: "teacher" }, usageHint: "caption", emphasis: "muted" },
        { id: "courseStatusActions", component: "Column", children: ["courseStatus", "courseStartButton", "courseDoneButton"], gap: "6px", alignment: "end" },
        { id: "courseStatus", component: "Text", text: { path: "status" }, role: "status", emphasis: "success", usageHint: "caption" },
        { id: "courseStartButton", component: "Button", label: "开始", intent: "secondary", size: "sm", action: { script: { code: "const id = String(context.courseId || ''); const courses = dataModel.get('/school/courses') || []; dataModel.set('/school/courses', courses.map((item) => item.id === id ? { ...item, status: '进行中' } : item)); actions.emit('courseStarted', { id });", deps: ["/school/courses"], context: { courseId: { path: "id" } } } } },
        { id: "courseDoneButton", component: "Button", label: "完成", importance: "quiet", size: "sm", action: { script: { code: "const id = String(context.courseId || ''); const courses = dataModel.get('/school/courses') || []; dataModel.set('/school/courses', courses.map((item) => item.id === id ? { ...item, status: '已完成' } : item)); actions.emit('courseCompleted', { id });", deps: ["/school/courses"], context: { courseId: { path: "id" } } } } },
        { id: "courseStats", component: "Text", text: "Tip: segmented picker、TextField、Button.script 都在这个 case 中联动。", usageHint: "caption", role: "emptyState" },
      ],
    ),
  },
  {
    id: "music",
    title: "Music Player",
    subtitle: "播放器，展示媒体角色、图标语义和本地状态切换",
    icon: "M",
    accent: "#0f766e",
    capabilities: [
      "Image.role",
      "Icon.semantic",
      "Slider.valueDisplay",
      "Button.shape",
      "action.script",
    ],
    messages: surface(
      {
        player: { isPlaying: false, progress: 32, isFavorite: false },
        song: {
          title: "Midnight Drive",
          artist: "Synthwave Dreams",
          coverUrl: albumCover,
        },
      },
      [
        { id: "root", component: "Container", child: "musicCard", width: "content", padding: "none" },
        { id: "musicCard", component: "Card", child: "musicBody", role: "media", density: "compact", preset: "media", variant: "elevated", style: { backgroundColor: "#0F2A2E", color: "#ffffff" } },
        { id: "musicBody", component: "Column", children: ["cover", "musicInfoRow", "musicProgress", "musicControls"], gap: "14px" },
        { id: "cover", component: "Image", url: { path: "/song/coverUrl" }, alt: "Album cover", role: "cover", shape: "rounded", fit: "cover", aspectRatio: "1:1", caption: "Live renderer state" },
        { id: "musicInfoRow", component: "Row", children: ["songText", "favButton"], role: "mediaObject", alignment: "center", distribution: "spaceBetween", wrap: false },
        { id: "songText", component: "Column", children: ["songLabel", "songTitle", "songArtist"], gap: "3px" },
        { id: "songLabel", component: "Text", text: "NOW PLAYING", usageHint: "caption", emphasis: "success" },
        { id: "songTitle", component: "Text", text: { path: "/song/title" }, usageHint: "h3", truncate: true, style: { color: "#ffffff" } },
        { id: "songArtist", component: "Text", text: { path: "/song/artist" }, usageHint: "caption", emphasis: "muted" },
        { id: "favIcon", component: "Icon", name: { script: { code: "return dataModel.get('/player/isFavorite') ? 'favorite' : 'favorite_border';", deps: ["/player/isFavorite"], fallback: "favorite_border" } }, semantic: "action", label: "收藏", status: "danger", tone: "danger" },
        { id: "favButton", component: "Button", child: "favIcon", importance: "quiet", shape: "circle", action: { script: { code: "const next = !Boolean(dataModel.get('/player/isFavorite')); dataModel.set('/player/isFavorite', next); actions.emit('favoriteChanged', { isFavorite: next });", deps: ["/player/isFavorite"] } } },
        { id: "musicProgress", component: "Slider", min: 0, max: 100, step: 1, value: { path: "/player/progress" }, valueDisplay: "none" },
        { id: "musicControls", component: "Row", children: ["prevButton", "playButton", "nextButton"], role: "actions", alignment: "center", distribution: "spaceEvenly", wrap: false },
        { id: "prevButton", component: "Button", icon: "skip_previous", iconPosition: "only", importance: "quiet", shape: "circle", action: { event: { name: "previousTrack", context: { title: { path: "/song/title" } } } } },
        { id: "playIcon", component: "Icon", name: { script: { code: "return dataModel.get('/player/isPlaying') ? 'pause' : 'play_arrow';", deps: ["/player/isPlaying"], fallback: "play_arrow" } }, semantic: "action", label: "播放切换", size: "lg" },
        { id: "playButton", component: "Button", child: "playIcon", intent: "primary", shape: "circle", importance: "prominent", size: "lg", action: { script: { code: "const next = !Boolean(dataModel.get('/player/isPlaying')); dataModel.set('/player/isPlaying', next); actions.emit('playToggled', { isPlaying: next });", deps: ["/player/isPlaying"] } } },
        { id: "nextButton", component: "Button", icon: "skip_next", iconPosition: "only", importance: "quiet", shape: "circle", action: { event: { name: "nextTrack", context: { title: { path: "/song/title" } } } } },
      ],
    ),
  },
  {
    id: "workboard",
    title: "Work Board",
    subtitle: "待办看板，展示 CheckBox、List 状态和批量脚本",
    icon: "W",
    accent: "#0ea5e9",
    capabilities: [
      "CheckBox 写回",
      "List.dividers",
      "Text.truncate",
      "Button.intent",
      "批量脚本",
    ],
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
        { id: "root", component: "Container", child: "todoCard", width: "content", padding: "none" },
        { id: "todoCard", component: "Card", child: "todoBody", role: "summary", density: "comfortable", variant: "elevated", header: "Renderer 待办清单", subtitle: "复选框和按钮脚本都会改写 dataModel" },
        { id: "todoBody", component: "Column", children: ["todoSummary", "todoComposer", "todoList", "todoActions"], gap: "14px" },
        { id: "todoSummary", component: "Text", text: { script: { code: "const items = dataModel.get('/todo/items') || []; const done = items.filter((item) => item.done).length; return `${done}/${items.length} completed · ${items.length - done} open`; ", deps: ["/todo/items"], fallback: "0/0 completed" } }, role: "status", emphasis: "success", usageHint: "caption" },
        { id: "todoComposer", component: "Grid", columns: "auto", minItemWidth: "180px", gap: "8px", children: ["todoDraftField", "todoAddButton"] },
        { id: "todoDraftField", component: "TextField", label: "新增任务", text: { path: "/todo/draft" }, usageHint: "shortText", placeholder: "输入任务标题", density: "compact", helpText: "添加后会清空输入框。" },
        {
          id: "todoAddButton",
          component: "Button",
          label: "添加",
          icon: "plus",
          intent: "primary",
          shape: "pill",
          action: {
            script: {
              code: "const title = String(dataModel.get('/todo/draft') || '').trim(); if (!title) { actions.emit('todoSkipped', { reason: 'empty' }); return; } const items = dataModel.get('/todo/items') || []; const next = [...items, { id: `task-${items.length + 1}`, title, project: 'Renderer Lab', done: false, priority: 'Normal' }]; dataModel.set('/todo/items', next); dataModel.set('/todo/draft', ''); actions.emit('todoAdded', { title, total: next.length });",
              deps: ["/todo/items", "/todo/draft"],
            },
          },
        },
        { id: "todoList", component: "List", children: [{ path: "/todo/items", componentId: "todoItem" }], emptyText: "暂无任务", itemRole: "card", dividers: true },
        { id: "todoItem", component: "Card", child: "todoItemBody", role: "summary", density: "compact", variant: "plain" },
        { id: "todoItemBody", component: "Row", children: ["todoCheck", "todoTitle", "todoMeta", "todoPriority"], role: "mediaObject", alignment: "center", distribution: "spaceBetween", gap: "10px", wrap: false },
        { id: "todoCheck", component: "CheckBox", value: { path: "done" }, density: "compact" },
        { id: "todoTitle", component: "Text", text: { path: "title" }, usageHint: "body", truncate: true, style: { minWidth: "86px" } },
        { id: "todoMeta", component: "Column", children: ["todoProject", "todoState"], gap: "3px" },
        { id: "todoProject", component: "Text", text: { path: "project" }, usageHint: "caption", emphasis: "muted" },
        { id: "todoState", component: "Text", text: "复选框写回", role: "status", emphasis: "success", usageHint: "caption" },
        { id: "todoPriority", component: "Text", text: { path: "priority" }, role: "status", emphasis: "warning", usageHint: "caption", truncate: true },
        { id: "todoActions", component: "Row", children: ["clearDoneButton", "todoOpenCount"], role: "actions", distribution: "spaceBetween", alignment: "center", wrap: false },
        { id: "clearDoneButton", component: "Button", label: "清理已完成", intent: "secondary", size: "sm", action: { script: { code: "const items = dataModel.get('/todo/items') || []; const next = items.filter((item) => !item.done); dataModel.set('/todo/items', next); actions.emit('completedCleared', { removed: items.length - next.length, remaining: next.length });", deps: ["/todo/items"] } } },
        { id: "todoOpenCount", component: "Text", text: { script: { code: "const items = dataModel.get('/todo/items') || []; return `${items.filter((item) => !item.done).length} open`; ", deps: ["/todo/items"], fallback: "0 open" } }, usageHint: "caption", emphasis: "muted" },
      ],
    ),
  },
  {
    id: "metrics",
    title: "Metrics Board",
    subtitle: "数据看板，展示 Grid 指标卡、派生文案和状态语义",
    icon: "D",
    accent: "#7c3aed",
    capabilities: [
      "Grid 指标",
      "Card.role=metric",
      "属性脚本",
      "Text.emphasis",
      "事件回传",
    ],
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
        { id: "root", component: "Container", child: "metricsStack", width: "content", padding: "none" },
        { id: "metricsStack", component: "Column", children: ["metricsHeader", "metricsGrid", "riskCard"], gap: "14px" },
        { id: "metricsHeader", component: "Card", child: "metricsHeaderBody", role: "summary", density: "compact", header: "今日经营概览", subtitle: "关键指标根据 dataModel 派生展示状态。" },
        { id: "metricsHeaderBody", component: "Text", text: "属性脚本、metric 卡片和事件回传都集中在这个示例。", usageHint: "caption", emphasis: "muted" },
        { id: "metricsGrid", component: "Grid", columns: 2, gap: "10px", children: ["conversionCard", "ordersCard"] },
        { id: "conversionCard", component: "Card", child: "conversionBody", role: "metric", density: "compact", variant: "filled", header: "转化率" },
        { id: "conversionBody", component: "Column", children: ["conversionValue", "conversionHint"], gap: "5px" },
        { id: "conversionValue", component: "Text", text: { script: { code: "return `${Math.round(Number(dataModel.get('/metrics/conversion') || 0) * 1000) / 10}%`;", deps: ["/metrics/conversion"], fallback: "0%" } }, role: "price", variant: "metric", tone: "brand" },
        { id: "conversionHint", component: "Text", text: { script: { code: "return Number(dataModel.get('/metrics/conversion') || 0) >= 0.18 ? '表现良好' : '需要关注';", deps: ["/metrics/conversion"], fallback: "暂无状态" } }, role: "status", emphasis: "success", usageHint: "caption" },
        { id: "ordersCard", component: "Card", child: "ordersBody", role: "metric", density: "compact", variant: "filled", header: "订单数" },
        { id: "ordersBody", component: "Column", children: ["ordersValue", "revenue"], gap: "5px" },
        { id: "ordersValue", component: "Text", text: { script: { code: "return String(dataModel.get('/metrics/orders') || 0);", deps: ["/metrics/orders"], fallback: "0" } }, role: "price", variant: "metric" },
        { id: "revenue", component: "Text", text: { path: "/metrics/revenue" }, usageHint: "caption", emphasis: "muted" },
        { id: "riskCard", component: "Card", child: "riskBody", role: "interactive", density: "comfortable", variant: "elevated", clickable: true, header: "风险巡检" },
        { id: "riskBody", component: "Row", children: ["riskCopy", "riskButton"], role: "actions", alignment: "center", distribution: "spaceBetween", wrap: false },
        { id: "riskCopy", component: "Text", text: { script: { code: "const risk = Number(dataModel.get('/metrics/risk') || 0); return risk <= 2 ? '当前风险较低' : '存在待处理风险';", deps: ["/metrics/risk"], fallback: "暂无风险数据" } }, role: "status", emphasis: "success", usageHint: "caption" },
        { id: "riskButton", component: "Button", label: "查看", icon: "search", intent: "primary", shape: "pill", action: { event: { name: "openRiskDetail", context: { risk: { path: "/metrics/risk" } } } } },
      ],
    ),
  },
];
