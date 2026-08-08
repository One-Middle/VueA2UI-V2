/**
 * A2UI v0.9 基础生成 Skill 的运行时内建定义。
 *
 * 职责：
 * - 为 Agent Runtime 提供始终可用的 A2UI 生成能力 Skill
 * - 维护平台 A2UI 生成规则和按需披露 Reference 的权威内容
 * - 避免运行期读取本地 Markdown 文件
 *
 * 注意：
 * - 当前开发阶段，后端 Skill Resolver 统一决定本次 Agent run 启用哪些 Skill。
 * - platform-skills.ts 只向后端 Resolver 提供平台 Skill 定义。
 * - 本文件保存 A2UI 平台内置 Skill 的运行时内容。
 * - a2ui-v0.9-generation/SKILL.md 仅作为人类可读镜像，不作为运行时或同步源。
 *
 * 不负责：内置 Skill 数据库同步（见 registry.ts 和 backend sync 脚本）。
 */

import type { A2UIComponent, JsonObject, SkillReference } from "@a2ui-platform/shared";
import type { AgentContextSkill } from "../context/context-builder.js";

/** A2UI v0.9 基础生成 Skill 的固定 ID。 */
export const A2UI_GENERATION_SKILL_ID = "builtin:a2ui-v0.9-generation";

/** A2UI v0.9 基础生成 Skill 的固定名称。 */
export const A2UI_GENERATION_SKILL_NAME = "A2UI v0.9 组件消息生成";

/** A2UI v0.9 基础生成 Skill 的摘要描述。 */
export const A2UI_GENERATION_SKILL_DESCRIPTION =
  "用于生成、修改或修复合法 A2UI v0.9 server-to-client 组件消息；包含标准生成规则和高质量 good case references；当用户要求创建或修改 UI 时必须使用。";

const BASIC_CATALOG_ID =
  "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json";

const svgDataUri = (svg: string): string =>
  `data:image/svg+xml,${encodeURIComponent(svg)}`;

const GOOD_CASE_ALBUM_COVER = svgDataUri(`
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

/** A2UI v0.9 基础生成 Skill 的完整 Markdown 内容。 */
export const A2UI_GENERATION_SKILL_CONTENT = [
  "# A2UI v0.9 组件消息生成",
  "",
  "当用户要求创建、修改或修复 UI/A2UI 组件消息时，必须遵循本 Skill。除非用户只是纯文字聊天，否则生成前必须先掌握本 Skill 的完整规则。",
  "",
  "## 1. 最终输出结构",
  "",
  "当你已经掌握所需 Skill Reference 和组件字段后，必须只输出严格 JSON 对象，不要使用 Markdown 代码块，不要输出 JSON 之外的解释文字。",
  "",
  "{",
  '  "assistantMessage": "先简要复述你对用户需求的理解，再说明生成或修改了什么",',
  '  "a2uiMessages": []',
  "}",
  "",
  "如果用户只是聊天、解释或询问，并没有要求创建或修改 UI，则 a2uiMessages 必须是空数组 []。",
  "",
  "## 2. 必须先请求的 Reference",
  "",
  "当用户要求创建、修改或修复 UI 时，生成前必须先请求本 Skill 下的 a2ui-generation-standards，不要只凭摘要生成 A2UI。",
  "",
  "如果用户需求涉及复杂 UI、列表/表单/媒体卡、业务面板、本地状态、筛选、收藏、播放、批量操作、强视觉主题或你需要质量标杆，继续请求 high-quality-a2ui-good-cases。",
  "",
  "## 3. Skill Reference 请求结构",
  "",
  "{",
  '  "assistantMessage": "需要查看相关参考资料后再生成。",',
  '  "skillReferenceRequest": {',
  '    "skill": "builtin:a2ui-v0.9-generation",',
  '    "references": ["a2ui-generation-standards"],',
  '    "reason": "需要遵循 A2UI 标准生成规则"',
  "  }",
  "}",
  "",
  'references 只能填写已启用 Skill 摘要中的 reference id 或 title，也可以填写 "*" 请求本 Skill 下全部 references。',
  "",
  "## 4. Skill 内容请求结构",
  "",
  "如果你需要遵循其他已启用 Skill 的完整规则，先输出 Skill 内容请求，不要凭摘要猜测完整规则。",
  "",
  "{",
  '  "assistantMessage": "需要查看相关 Skill 后再生成。",',
  '  "skillInfoRequest": {',
  '    "skills": ["skill-id-or-name"],',
  '    "reason": "需要遵循该 Skill 的生成规范"',
  "  }",
  "}",
  "",
  "skillInfoRequest.skills 只能填写已启用 Skill 摘要中的 id 或 name。优先使用 id。",
  "",
  "## 5. 组件详情请求结构",
  "",
  "如果你还不知道某些组件的可用字段、必填项或枚举值，先输出组件详情请求，不要猜字段。",
  "",
  "{",
  '  "assistantMessage": "需要查看组件详情后再生成。",',
  '  "componentInfoRequest": {',
  '    "components": ["Container", "Column", "Text", "Card"],',
  '    "reason": "需要布局、文本和卡片容器字段"',
  "  }",
  "}",
  "",
  "componentInfoRequest.components 只能填写 Basic Catalog 中存在的组件名称。",
  "",
  "## 6. 最小硬性规则",
  "",
  "- 最终 a2uiMessages 只能包含 A2UI v0.9 server-to-client 消息。",
  "- 新 UI 必须按 createSurface -> updateDataModel（如需要）-> updateComponents 的顺序输出。",
  `- createSurface.catalogId 使用 ${BASIC_CATALOG_ID}，surfaceId 固定使用 "main"。`,
  "- 每个组件对象必须包含 id 和 component；必须存在 id 为 root 的根组件。",
  "- A2UI 使用邻接表：child/children/tabItems.child 只能引用组件 id 字符串，不要嵌套组件对象。",
  "- 动态数据使用 JSON Pointer：{ \"path\": \"/some/data/path\" }；重复内容优先使用 dataModel 数组 + List 模板。",
  "- Button.action 只能使用 action.event 或 action.script；需要本地状态写回时才使用 action.script。",
  "- 受限 JSRuntime 不是浏览器 JavaScript，不能访问 DOM、window、document、fetch、网络、定时器、import、async/await、eval 或外部 API。",
  "- 禁止生成任意 HTML、CSS、className、innerHTML、onClick/onChange 等浏览器字段。",
  "- 正式提交前必须通过 validateA2UI；不要绕过校验或提交未校验草稿。",
].join("\n");

/** A2UI 标准生成规则 Reference。 */
const A2UI_GENERATION_STANDARDS_REFERENCE: SkillReference = {
  id: "a2ui-generation-standards",
  title: "A2UI 标准生成规则",
  description:
    "生成 UI 前必须请求；包含符合 Renderer 的完整消息结构、组件树、dataModel、List、表单、事件、JSRuntime、安全边界、bad case 和输出检查。",
  content: [
    "# A2UI 标准生成规则",
    "",
    "本 Reference 是生成、修改或修复 A2UI v0.9 UI 的标准规则。创建或修改 UI 前必须掌握本 Reference。",
    "",
    "## 1. 完整消息结构",
    "",
    "最终输出必须是严格 JSON 对象，形如：",
    "",
    "```json",
    "{",
    '  "assistantMessage": "先复述用户需求，再说明生成或修改了什么",',
    '  "a2uiMessages": [',
    '    { "version": "v0.9", "createSurface": { "surfaceId": "main", "catalogId": "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json" } },',
    '    { "version": "v0.9", "updateDataModel": { "surfaceId": "main", "path": "/", "value": {} } },',
    '    { "version": "v0.9", "updateComponents": { "surfaceId": "main", "components": [] } }',
    "  ]",
    "}",
    "```",
    "",
    "新 UI 必须先 createSurface，再 updateDataModel（如果 UI 使用动态数据、列表、状态或交互），最后 updateComponents。修改已有 UI 时，根据当前 snapshot 输出必要的增量消息；不要无意义删除重建。",
    "",
    "## 2. 组件树标准",
    "",
    "- 每个组件必须有稳定、可读、唯一的 id，必须有 component。",
    "- 必须存在 id 为 root 的根组件。",
    "- Container、Card、Column、Row、Grid、List 等容器只通过 child、children 或模板字段引用其他组件 id。",
    "- child 是单个字符串 id；children 是字符串 id 数组；不要把完整组件对象塞进 children。",
    "- Card 内有多个元素时，先创建 Column/Row，再让 Card.child 指向这个容器。",
    "- 重复内容不要写 row1、row2、row3；优先 dataModel 数组 + List 模板。",
    "- 复杂 UI 先拆信息架构：头部、摘要、主体、列表、操作区、状态区，而不是把所有文本压成同级 Row。",
    "",
    "## 3. dataModel 建模标准",
    "",
    "- 静态一次性文案可以直接写入组件字段。",
    "- 列表、筛选、收藏、播放状态、表单输入、进度、统计、选中项、批量操作结果必须进入 dataModel。",
    "- dataModel 的根路径使用业务域名聚合，例如 /player、/song、/finance、/todo。",
    "- List 模板内使用相对 path，如 { \"path\": \"title\" }；模板外使用绝对 path，如 { \"path\": \"/finance/headline\" }。",
    "- 需要从状态派生文案、图标、按钮 label 或统计值时，用属性 script；不要手动维护多份容易不一致的静态字段。",
    "",
    "## 4. 交互和 action 标准",
    "",
    "- 只需要通知宿主的操作，使用 action.event。",
    "- 需要点击后先修改本地 dataModel，再通知宿主的操作，使用 action.script。",
    "- action.script 只能执行短小、同步、确定性的逻辑；通过 dataModel.get 读取，通过 dataModel.set 写入 JSON-compatible 值，通过 actions.emit 派发事件。",
    "- List 模板中的按钮如需知道当前 item，使用 action.script.context 传入 { path: \"id\" } 等相对绑定。",
    "- 按钮不能只有视觉外观；可点击业务按钮必须有 action.event 或 action.script。",
    "",
    "## 5. JSRuntime 安全边界",
    "",
    "- 属性 script 必须显式 return，必须声明 deps，必须提供 fallback。",
    "- 属性 script 只能读取 dataModel，不要写入 dataModel。",
    "- Button.action.script 可以读取和写入 dataModel，但仍然不能访问 DOM、window、document、fetch、网络、定时器、import、async/await、eval、Function、Promise 或外部 API。",
    "- 不要生成 <script>、javascript:、HTML 字符串、onClick、onInput、onChange、innerHTML、className 或 css 字段。",
    "",
    "## 6. 视觉质量标准",
    "",
    "- 常见 UI 必须主动使用 Renderer 支持的语义和视觉字段，例如 role、density、variant、preset、intent、importance、shape、size、gap、padding、borderRadius、shadow、emphasis、usageHint、truncate。",
    "- 重要数值或行情使用 metric/role/status 等语义；次级信息使用 caption/muted；操作区使用 role=actions。",
    "- 媒体类 UI 要有 Image、标题、说明、进度或状态、主次操作。",
    "- 业务面板要有明确主题、摘要、指标或列表、筛选/操作、事件回传。",
    "- 工具类 UI 要有输入、列表状态、局部写回、批量操作和空状态。",
    "",
    "## 7. 常见 bad case",
    "",
    "### Bad Case A：平铺文本，没有结构",
    "",
    "```json",
    "{",
    '  "id": "root",',
    '  "component": "Column",',
    '  "children": ["t1", "t2", "t3"]',
    "}",
    "```",
    "",
    "问题：没有标题区、内容区、操作区，也没有 Card/List/Grid 等承载结构。即使能渲染，也不像完整 UI。",
    "",
    "### Bad Case B：重复内容不用 dataModel + List",
    "",
    "```json",
    "[",
    '  { "id": "row1", "component": "Row", "children": ["title1", "button1"] },',
    '  { "id": "row2", "component": "Row", "children": ["title2", "button2"] }',
    "]",
    "```",
    "",
    "问题：数据和结构耦合，无法筛选、批量操作或响应式更新。重复内容应进入 dataModel 数组，并用 List 模板渲染。",
    "",
    "### Bad Case C：按钮是假交互",
    "",
    "```json",
    "{ \"id\": \"saveButton\", \"component\": \"Button\", \"label\": \"收藏\" }",
    "```",
    "",
    "问题：按钮没有 action，用户点击不会产生业务事件，也不会写回本地状态。业务按钮必须使用 action.event 或 action.script。",
    "",
    "### Bad Case D：脚本越界",
    "",
    "```json",
    "{ \"script\": { \"code\": \"fetch('/api/save'); document.body.innerHTML = 'ok';\" } }",
    "```",
    "",
    "问题：JSRuntime 不是浏览器环境，禁止 fetch、document、DOM、网络和 HTML 注入。",
    "",
    "### Bad Case E：组件引用不合法",
    "",
    "```json",
    "{ \"id\": \"root\", \"component\": \"Card\", \"children\": [{ \"id\": \"title\", \"component\": \"Text\", \"text\": \"Hi\" }] }",
    "```",
    "",
    "问题：Card 应使用 child，不应使用 children；children 也不能嵌套完整组件对象。必须使用邻接表引用组件 id。",
    "",
    "## 8. 输出前检查",
    "",
    "- 是否已经请求并遵循 a2ui-generation-standards？",
    "- 复杂 UI 是否请求 high-quality-a2ui-good-cases 作为质量标杆？",
    "- 新 UI 是否包含 createSurface、必要的 updateDataModel 和 updateComponents？",
    "- catalogId、surfaceId、root 是否正确？",
    "- 所有 child/children/template 引用是否真实存在？",
    "- 重复数据是否使用 dataModel + List？",
    "- 交互按钮是否有 action.event 或 action.script？",
    "- action.script 是否只做同步本地读写和 actions.emit？",
    "- 是否避免 Catalog 外组件和浏览器字段？",
    "- 是否使用足够的语义、密度、视觉和状态字段，让 UI 不只是默认 Card/Row/Text？",
  ].join("\n"),
};

/** 构建 A2UI 高质量 Good Case Reference。 */
function buildHighQualityA2UIGoodCasesReference(): SkillReference {
  return {
  id: "high-quality-a2ui-good-cases",
  title: "高质量 A2UI Good Case",
  description:
    "复杂 UI 或需要质量标杆时请求；包含来自 renderer-capability-demo 的 Music Player、Finance Brief、Work Board 三个完整 good case，并说明为什么好。",
  content: [
    "# 高质量 A2UI Good Case",
    "",
    "本 Reference 收录完整、可审查的高质量 A2UI 标杆。Good Case 不是供照抄的小片段；它们用于建立质量判断：如何组织 dataModel、组件树、视觉层次、状态派生和事件回传。",
    "",
    "## Good Case 1: Music Player",
    "",
    "```json",
    JSON.stringify(buildA2UIMessages(MUSIC_PLAYER_DATA_MODEL, MUSIC_PLAYER_COMPONENTS), null, 2),
    "```",
    "",
    "为什么好：它把播放进度、播放状态和收藏状态放入 dataModel；封面、标题、作者、进度和控制区分层明确；Icon.name 和按钮 label 通过受限脚本从状态派生；收藏和播放按钮会写回本地状态并 actions.emit；上一首/下一首使用 action.event 只提交业务事件。",
    "",
    "## Good Case 2: Finance Brief",
    "",
    "```json",
    JSON.stringify(buildA2UIMessages(FINANCE_BRIEF_DATA_MODEL, FINANCE_BRIEF_COMPONENTS), null, 2),
    "```",
    "",
    "为什么好：它把金融资讯拆成 hero、指标网格、分类操作、新闻列表和页脚事件；筛选和收藏都写回 dataModel；List 模板渲染 visibleNews；列表项使用相对 path 和 context；主题视觉通过受控 style、role、density、variant、shape、intent 等字段表达。",
    "",
    "## Good Case 3: Work Board",
    "",
    "```json",
    JSON.stringify(buildA2UIMessages(WORK_BOARD_DATA_MODEL, WORK_BOARD_COMPONENTS), null, 2),
    "```",
    "",
    "为什么好：它把草稿输入和任务列表放入 dataModel；TextField 绑定可编辑 draft；List 模板渲染任务卡；CheckBox 写回 item 状态；新增和清理按钮使用 action.script 做本地数组更新并回传事件；顶部和底部统计通过属性 script 从列表派生。",
  ].join("\n"),
  };
}

function buildA2UIMessages(dataModel: JsonObject, components: A2UIComponent[]) {
  return [
    {
      version: "v0.9",
      createSurface: {
        surfaceId: "main",
        catalogId: BASIC_CATALOG_ID,
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
}

// NOTE(skill): 以下 good case 来源于 renderer-capability-demo/src/cases.ts，字段和值保持原样。
const MUSIC_PLAYER_DATA_MODEL: JsonObject = {
  player: { isPlaying: false, progress: 32, isFavorite: false },
  song: {
    title: "Midnight Drive",
    artist: "Synthwave Dreams",
    coverUrl: GOOD_CASE_ALBUM_COVER,
  },
};

const MUSIC_PLAYER_COMPONENTS: A2UIComponent[] = [
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
];

const FINANCE_BRIEF_DATA_MODEL: JsonObject = {
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
};

const FINANCE_BRIEF_COMPONENTS: A2UIComponent[] = [
  { id: "root", component: "Container", child: "financeShell", width: "content", padding: "none" },
  { id: "financeShell", component: "Card", child: "financeBody", role: "summary", density: "compact", variant: "plain", style: { padding: "0", borderRadius: "24px", borderColor: "#2f2415", backgroundColor: "#080807", color: "#f8edcf", shadow: "lg" } },
  { id: "financeBody", component: "Column", children: ["financeHero", "financeIndexGrid", "financeCategoryRow", "financeNewsList", "financeFooter"], gap: "14px", style: { padding: "18px" } },
  { id: "financeHero", component: "Column", children: ["financeTopLine", "financeTitle", "financeSummary"], gap: "8px", style: { padding: "16px", borderRadius: "18px", backgroundColor: "#14100a", borderColor: "#3c2d18", borderWidth: "1px" } },
  { id: "financeTopLine", component: "Row", children: ["financeMarketLabel", "financeSelectedCategory", "financeSubscribeButton"], role: "actions", alignment: "center", distribution: "spaceBetween", gap: "8px", wrap: false },
  { id: "financeMarketLabel", component: "Text", text: "GLOBAL MARKETS", usageHint: "caption", style: { color: "#d7b46a", fontWeight: 900 } },
  { id: "financeSelectedCategory", component: "Text", text: { script: { code: "return `频道 · ${dataModel.get('/finance/selectedCategory') || '精选'}`;", deps: ["/finance/selectedCategory"], fallback: "频道 · 精选" } }, role: "status", usageHint: "caption", style: { color: "#f3d58b", padding: "3px 8px", borderRadius: "999px", backgroundColor: "#241a0c" } },
  { id: "financeSubscribeButton", component: "Button", label: { script: { code: "return dataModel.get('/finance/subscribed') ? '已订阅' : '订阅';", deps: ["/finance/subscribed"], fallback: "订阅" } }, importance: "quiet", shape: "pill", size: "sm", style: { color: "#f5d58a", borderColor: "#614719", backgroundColor: "#1d160c" }, action: { script: { code: "const next = !Boolean(dataModel.get('/finance/subscribed')); dataModel.set('/finance/subscribed', next); actions.emit('financeSubscriptionChanged', { subscribed: next });", deps: ["/finance/subscribed"] } } },
  { id: "financeTitle", component: "Text", text: { path: "/finance/headline" }, usageHint: "h2", style: { color: "#fff7df", fontWeight: 900 } },
  { id: "financeSummary", component: "Text", text: { path: "/finance/summary" }, usageHint: "body", style: { color: "#c8b98e", lineHeight: 1.7 } },
  { id: "financeIndexGrid", component: "Grid", columns: 3, gap: "8px", children: ["financeNasdaq", "financeSp", "financeGold"] },
  { id: "financeNasdaq", component: "Card", child: "financeNasdaqBody", role: "metric", density: "compact", variant: "filled", style: { backgroundColor: "#120f0a", borderColor: "#3a2b16", borderRadius: "16px" } },
  { id: "financeNasdaqBody", component: "Column", children: ["financeNasdaqName", "financeNasdaqValue", "financeNasdaqChange"], gap: "5px" },
  { id: "financeNasdaqName", component: "Text", text: "NASDAQ", usageHint: "caption", style: { color: "#b79a56", fontWeight: 800 } },
  { id: "financeNasdaqValue", component: "Text", text: "18,418", usageHint: "h4", style: { color: "#fff1c9", fontWeight: 900 } },
  { id: "financeNasdaqChange", component: "Text", text: "+0.82%", role: "status", emphasis: "success", usageHint: "caption" },
  { id: "financeSp", component: "Card", child: "financeSpBody", role: "metric", density: "compact", variant: "filled", style: { backgroundColor: "#120f0a", borderColor: "#3a2b16", borderRadius: "16px" } },
  { id: "financeSpBody", component: "Column", children: ["financeSpName", "financeSpValue", "financeSpChange"], gap: "5px" },
  { id: "financeSpName", component: "Text", text: "S&P 500", usageHint: "caption", style: { color: "#b79a56", fontWeight: 800 } },
  { id: "financeSpValue", component: "Text", text: "5,487", usageHint: "h4", style: { color: "#fff1c9", fontWeight: 900 } },
  { id: "financeSpChange", component: "Text", text: "+0.31%", role: "status", emphasis: "success", usageHint: "caption" },
  { id: "financeGold", component: "Card", child: "financeGoldBody", role: "metric", density: "compact", variant: "filled", style: { backgroundColor: "#120f0a", borderColor: "#3a2b16", borderRadius: "16px" } },
  { id: "financeGoldBody", component: "Column", children: ["financeGoldName", "financeGoldValue", "financeGoldChange"], gap: "5px" },
  { id: "financeGoldName", component: "Text", text: "Gold", usageHint: "caption", style: { color: "#b79a56", fontWeight: 800 } },
  { id: "financeGoldValue", component: "Text", text: "$2,384", usageHint: "h4", style: { color: "#fff1c9", fontWeight: 900 } },
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
  { id: "financeNewsCategory", component: "Text", text: { path: "category" }, usageHint: "caption", style: { color: "#e1c16e", fontWeight: 900 } },
  { id: "financeNewsImpact", component: "Text", text: { path: "impact" }, role: "status", emphasis: "warning", usageHint: "caption" },
  { id: "financeNewsTitle", component: "Text", text: { path: "title" }, usageHint: "body", truncate: true, style: { color: "#fff7df", fontWeight: 800, minWidth: "0" } },
  { id: "financeNewsSource", component: "Text", text: { path: "meta" }, usageHint: "caption", style: { color: "#8f8263" } },
  { id: "financeNewsActions", component: "Column", children: ["financeSaveButton", "financeOpenButton"], gap: "6px", alignment: "end" },
  { id: "financeSaveButton", component: "Button", label: { path: "savedLabel" }, size: "sm", shape: "pill", importance: "quiet", style: { color: "#f5d58a", backgroundColor: "#1d160c", borderColor: "#4b3715" }, action: { script: { code: "const id = String(context.newsId || ''); const news = dataModel.get('/finance/news') || []; const visibleNews = dataModel.get('/finance/visibleNews') || []; const toggle = (item) => { if (item.id !== id) return item; const saved = !item.saved; return { ...item, saved, savedLabel: saved ? '已藏' : '收藏' }; }; const nextNews = news.map(toggle); const nextVisible = visibleNews.map(toggle); const saved = Boolean(nextVisible.find((item) => item.id === id)?.saved); dataModel.set('/finance/news', nextNews); dataModel.set('/finance/visibleNews', nextVisible); actions.emit('financeNewsSaved', { id, saved });", deps: ["/finance/news", "/finance/visibleNews"], context: { newsId: { path: "id" } } } } },
  { id: "financeOpenButton", component: "Button", label: "详情", size: "sm", intent: "warning", shape: "pill", action: { event: { name: "openFinanceNews", context: { id: { path: "id" }, title: { path: "title" }, category: { path: "category" } } } } },
  { id: "financeFooter", component: "Button", label: "查看行情日历", icon: "calendar_today", intent: "warning", shape: "rounded", fullWidth: true, action: { event: { name: "openMarketCalendar", context: { category: { path: "/finance/selectedCategory" }, subscribed: { path: "/finance/subscribed" } } } } },
];

const WORK_BOARD_DATA_MODEL: JsonObject = {
  todo: {
    draft: "补充 Slider 视觉回归",
    items: [
      { id: "task-1", title: "整理 Basic Catalog 能力矩阵", project: "Renderer", done: true, priority: "High" },
      { id: "task-2", title: "补齐表单组件截图测试", project: "QA", done: false, priority: "Medium" },
      { id: "task-3", title: "验证 JSRuntime 安全边界", project: "Runtime", done: false, priority: "High" },
    ],
  },
};

const WORK_BOARD_COMPONENTS: A2UIComponent[] = [
  { id: "root", component: "Container", child: "todoCard", width: "content", padding: "none" },
  { id: "todoCard", component: "Card", child: "todoBody", role: "summary", density: "comfortable", variant: "elevated", header: "Renderer 待办清单", subtitle: "复选框和按钮脚本都会改写 dataModel" },
  { id: "todoBody", component: "Column", children: ["todoSummary", "todoComposer", "todoList", "todoActions"], gap: "14px" },
  { id: "todoSummary", component: "Text", text: { script: { code: "const items = dataModel.get('/todo/items') || []; const done = items.filter((item) => item.done).length; return `${done}/${items.length} completed · ${items.length - done} open`; ", deps: ["/todo/items"], fallback: "0/0 completed" } }, role: "status", emphasis: "success", usageHint: "caption" },
  { id: "todoComposer", component: "Grid", columns: "auto", minItemWidth: "180px", gap: "8px", children: ["todoDraftField", "todoAddButton"] },
  { id: "todoDraftField", component: "TextField", label: "新增任务", text: { path: "/todo/draft" }, usageHint: "shortText", placeholder: "输入任务标题", density: "compact", helpText: "添加后会清空输入框。" },
  { id: "todoAddButton", component: "Button", label: "添加", icon: "plus", intent: "primary", shape: "pill", action: { script: { code: "const title = String(dataModel.get('/todo/draft') || '').trim(); if (!title) { actions.emit('todoSkipped', { reason: 'empty' }); return; } const items = dataModel.get('/todo/items') || []; const next = [...items, { id: `task-${items.length + 1}`, title, project: 'Renderer Lab', done: false, priority: 'Normal' }]; dataModel.set('/todo/items', next); dataModel.set('/todo/draft', ''); actions.emit('todoAdded', { title, total: next.length });", deps: ["/todo/items", "/todo/draft"] } } },
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
];

/** A2UI v0.9 基础生成 Skill 的参考资料。 */
export const A2UI_GENERATION_SKILL_REFERENCES: SkillReference[] = [
  A2UI_GENERATION_STANDARDS_REFERENCE,
  buildHighQualityA2UIGoodCasesReference(),
];

/** A2UI v0.9 基础生成 Skill 的运行时对象。 */
export const A2UI_GENERATION_SKILL: AgentContextSkill = {
  id: A2UI_GENERATION_SKILL_ID,
  name: A2UI_GENERATION_SKILL_NAME,
  description: A2UI_GENERATION_SKILL_DESCRIPTION,
  content: A2UI_GENERATION_SKILL_CONTENT,
  references: A2UI_GENERATION_SKILL_REFERENCES,
};
