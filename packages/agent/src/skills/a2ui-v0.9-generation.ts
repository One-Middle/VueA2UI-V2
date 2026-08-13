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

// NOTE(skill): 以下 SVG 与 renderer-capability-demo/src/cases.ts 保持同步。
const LIVE_COMMERCE_COVER = svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 520">
  <defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dff7d4"/><stop offset="1" stop-color="#f8fafc"/></linearGradient><linearGradient id="c" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d7b47a"/><stop offset="1" stop-color="#f4d99d"/></linearGradient><filter id="b"><feGaussianBlur stdDeviation="18"/></filter></defs>
  <rect width="720" height="520" fill="#efe6d2"/>
  <rect x="420" y="24" width="164" height="216" rx="8" fill="url(#w)"/>
  <path d="M444 36v190M484 36v190M524 36v190M564 36v190M430 96h144M430 156h144" stroke="#b7d8a9" stroke-width="5" opacity="0.55"/>
  <rect x="32" y="70" width="214" height="142" rx="12" fill="#baa37f"/>
  <rect x="52" y="92" width="48" height="34" rx="4" fill="#f8fafc" opacity="0.65"/>
  <rect x="112" y="92" width="46" height="34" rx="4" fill="#f8fafc" opacity="0.58"/>
  <rect x="170" y="92" width="42" height="34" rx="4" fill="#f8fafc" opacity="0.5"/>
  <circle cx="286" cy="116" r="34" fill="#efe9dc" stroke="#9c8b70" stroke-width="5"/>
  <path d="M286 96v22l17 12" stroke="#766853" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M342 76h38v92h-38z" fill="#f2f6ef"/><path d="M360 76v-38" stroke="#415349" stroke-width="7" stroke-linecap="round"/>
  <path d="M330 118c28-22 62-22 88 0" fill="#6d8472"/>
  <rect x="0" y="314" width="720" height="118" fill="url(#c)"/>
  <rect x="0" y="432" width="720" height="88" fill="#7a6b54" opacity="0.78"/>
  <ellipse cx="362" cy="374" rx="250" ry="48" fill="#efe1bd" opacity="0.5" filter="url(#b)"/>
  <path d="M320 170c48-24 104 4 108 62l6 100h-158l8-102c3-27 15-47 36-60z" fill="#f8fafc"/>
  <path d="M300 214c-38 36-56 78-50 126" stroke="#f8fafc" stroke-width="32" stroke-linecap="round"/>
  <path d="M428 224c36 30 52 64 56 106" stroke="#f8fafc" stroke-width="32" stroke-linecap="round"/>
  <circle cx="356" cy="142" r="42" fill="#e6b28a"/>
  <path d="M318 134c8-44 76-52 96-9-20 4-42 2-62-7-10 13-21 18-34 16z" fill="#172121"/>
  <path d="M334 178c18 14 42 14 58 0" stroke="#b98060" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M224 336c50-34 112-36 164 0" fill="#d4b87e"/>
  <circle cx="258" cy="320" r="18" fill="#6aa84f"/><circle cx="290" cy="312" r="20" fill="#9ac36b"/><circle cx="326" cy="320" r="18" fill="#6aa84f"/>
  <rect x="458" y="320" width="78" height="52" rx="10" fill="#f7f7f2" stroke="#c7bfa8" stroke-width="4"/>
  <rect x="538" y="322" width="72" height="46" rx="22" fill="#f2c2b8"/>
  <rect x="268" y="250" width="124" height="38" rx="10" transform="rotate(12 330 269)" fill="#ffffff"/>
  <rect x="276" y="255" width="50" height="28" rx="5" transform="rotate(12 301 269)" fill="#d71920"/>
  <rect x="332" y="262" width="46" height="12" rx="3" transform="rotate(12 355 268)" fill="#93c47d"/>
</svg>`);

const WATER_THUMB = svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <rect width="160" height="160" rx="18" fill="#f8fafc"/>
  <rect x="26" y="70" width="82" height="56" rx="8" fill="#ffffff" stroke="#e5e7eb" stroke-width="4"/>
  <rect x="30" y="82" width="74" height="26" rx="4" fill="#d71920"/>
  <text x="39" y="101" fill="#ffffff" font-family="Arial, sans-serif" font-size="16" font-weight="700">山泉</text>
  <rect x="92" y="34" width="34" height="94" rx="9" fill="#e0f2fe" stroke="#93c5fd" stroke-width="4"/>
  <rect x="96" y="62" width="26" height="28" rx="4" fill="#d71920"/>
  <rect x="98" y="24" width="22" height="14" rx="4" fill="#ef4444"/>
  <circle cx="42" cy="55" r="14" fill="#22c55e"/><circle cx="64" cy="48" r="18" fill="#84cc16"/>
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
    "## 6. 语义优先，style 覆盖",
    "",
    "Renderer 有两套方式控制组件视觉，必须区分使用：",
    "",
    "### 6.1 组件顶层语义字段（优先使用）",
    "",
    "这些字段直接放在组件对象上，Renderer 根据它们应用预设样式。优先使用语义字段可以保证视觉一致性：",
    "",
    "| 字段 | 类型 | 说明 | 常用值 |",
    "|------|------|------|--------|",
    "| role | string | 组件语义角色 | default, summary, metric, media, form, interactive, actions, metadata, mediaObject, emptyState |",
    "| density | string | 内容密度 | compact, comfortable, spacious |",
    "| variant | string | 视觉变体 | elevated, filled, plain, outline, ghost |",
    "| preset | string | 复杂样式预设 | media, metric, title, subtitle, body, caption, summary, formPanel |",
    "| intent | string | 按钮业务意图 | primary, secondary, danger, success, warning |",
    "| importance | string | 按钮视觉重要程度 | normal, quiet, prominent |",
    "| shape | string | 形状 | rounded, pill, square, circle |",
    "| size | string | 尺寸密度 | sm, md, lg |",
    "| emphasis | string | 文本强调语义 | default, muted, strong, danger, success, warning |",
    "| usageHint | string | 文本样式提示 | h1, h2, h3, h4, h5, body, caption |",
    "| truncate | boolean | 是否单行截断 | true, false |",
    "| tone | string | 语义色调 | neutral, brand, success, warning, danger |",
    "| icon | string | 按钮图标名称（直接字符串，不是 style） | \"plus\", \"search\", \"calendar_today\" |",
    "| iconPosition | string | 图标位置 | left, right, only |",
    "| fullWidth | boolean | 是否撑满父容器宽度 | true, false |",
    "",
    "### 6.2 style 对象（精准覆盖）",
    "",
    "当语义字段不足以表达需求时，在组件上添加 `\"style\": { ... }` 对象。**以下字段只能放在 style 对象内，不能放在组件顶层**：",
    "",
    "| 字段 | 类型 | 说明 | 示例 |",
    "|------|------|------|------|",
    "| width | string | 宽度 | \"100%\", \"200px\" |",
    "| height | string | 高度 | \"auto\", \"48px\" |",
    "| minWidth | string | 最小宽度 | \"0\", \"120px\" |",
    "| maxWidth | string | 最大宽度 | \"600px\" |",
    "| minHeight | string | 最小高度 | |",
    "| maxHeight | string | 最大高度 | |",
    "| padding | string | 四向内边距 | \"16px\", \"12px 16px\" |",
    "| paddingX | string | 水平内边距（展开为 paddingLeft+paddingRight） | \"16px\" |",
    "| paddingY | string | 垂直内边距（展开为 paddingTop+paddingBottom） | \"8px\" |",
    "| margin | string | 四向外边距 | \"0 auto\" |",
    "| marginX | string | 水平外边距（展开为 marginLeft+marginRight） | |",
    "| marginY | string | 垂直外边距（展开为 marginTop+marginBottom） | |",
    "| gap | string | 子元素间距（Column/Row/Grid 也可作顶层字段） | \"8px\", \"14px\" |",
    "| color | string | 文字颜色 | \"#ffffff\", \"#1a1a2e\" |",
    "| backgroundColor | string | 背景颜色 | \"#f8fafc\", \"#0F2A2E\" |",
    "| borderColor | string | 边框颜色 | \"#e5e7eb\", \"#3c2d18\" |",
    "| borderWidth | string | 边框宽度 | \"1px\", \"2px\" |",
    "| borderRadius | string | 圆角 | \"8px\", \"12px\", \"24px\" |",
    "| fontSize | string | 字号 | \"14px\", \"22px\" |",
    "| fontWeight | number|string | 字重 | \"400\", \"700\", \"900\" |",
    "| lineHeight | number|string | 行高 | \"1.5\", \"1.7\" |",
    "| textAlign | string | 文字对齐 | \"center\", \"right\" |",
    "| alignSelf | string | 自身交叉轴对齐 | \"center\" |",
    "| justifySelf | string | 自身主轴对齐 | |",
    "| shadow | string | 阴影（映射到 boxShadow），允许值 none|xs|sm|md|lg | \"sm\", \"md\" |",
    "| opacity | number|string | 透明度 | \"0.8\", \"0.5\" |",
    "| overflow | string | 溢出行为 | \"hidden\" |",
    "| flex | number|string | 弹性伸缩 | \"1\", \"0\" |",
    "",
    "### 6.3 常见混淆",
    "",
    "**style 子字段，不能放在组件顶层：** padding, borderRadius, shadow, backgroundColor, color, fontWeight, fontSize, lineHeight, borderColor, borderWidth, opacity, overflow, flex, width, height, minWidth, maxWidth, textAlign（gap 在 Column/Row/Grid 上也可作为顶层字段）。",
    "",
    "**组件顶层字段，不能放在 style 内：** role, density, variant, preset, intent, importance, shape, size, emphasis, usageHint, truncate, tone, icon, iconPosition, fullWidth, child, children, action。",
    "",
    "## 7. style 白名单与视觉设计指南",
    "",
    "以下 5 个设计模式覆盖了 90% 的视觉需求。每个模式给出核心 style 字段和参考实例。",
    "",
    "### 模式 1：暗色主题卡片",
    "",
    "适用场景：媒体播放、金融资讯、夜间模式面板。",
    "",
    "核心字段组合：",
    "- backgroundColor：深色背景（如 #080807, #0F2A2E）",
    "- color：浅色文字（如 #ffffff, #f8edcf）",
    "- borderColor：比背景稍亮的边框（如 #2f2415），拉开层次",
    "- 子元素用 color/fontWeight 微调区分重要性",
    "",
    "参考实例：Finance Brief（黑金金融卡）——外围 Card 使用 backgroundColor: \"#080807\" + color: \"#f8edcf\" + borderRadius: \"24px\" + shadow: \"lg\"，内部 hero 区块用稍亮的 backgroundColor: \"#14100a\" 做层次。",
    "",
    "### 模式 2：圆角 + 阴影层次",
    "",
    "适用场景：商品卡、仪表盘、信息流卡片。",
    "",
    "核心字段组合：",
    "- borderRadius：外层主卡片 16-24px（如 \"20px\", \"24px\"），内层区块 8-18px，标签 4px 或 999px（pill 形状）",
    "- shadow：外层卡片用 sm 或 md，内层区块通常不设阴影",
    "- overflow：配合 borderRadius 做圆角裁剪时设为 \"hidden\"",
    "",
    "参考实例：Live Commerce——外层 liveCard 使用 borderRadius: \"20px\" + shadow: \"md\" + overflow: \"hidden\"，内层标签 liveBadge 使用 borderRadius: \"4px\"。",
    "",
    "### 模式 3：色彩层次",
    "",
    "适用场景：卡片式布局、数据看板。",
    "",
    "三层配色方法：",
    "1. 页面/外层背景：浅灰（#f8fafc）或深色（#080807）",
    "2. 卡片背景：白色（#ffffff）或比外层稍亮的颜色",
    "3. 强调色点缀：品牌色用于关键指标、主按钮、状态标签，不要滥用",
    "",
    "参考实例：Work Board——主卡片白色背景 + sm 阴影；统计区三张指标卡分别用紫色（#f5f3ff）、琥珀色（#fffbeb）、绿色（#f0fdf4）做语义区分；添加按钮用 backgroundColor: \"#7c3aed\" 品牌色。",
    "",
    "### 模式 4：字重节奏",
    "",
    "适用场景：任何有信息层级的 UI。",
    "",
    "字重层级：",
    "- 标题/关键数值：fontWeight: \"800\" 或 \"900\"，配合 usageHint: \"h2\"-\"h4\"",
    "- 正文：默认 fontWeight（400），需要强调时用 emphasis: \"strong\"，弱化时用 emphasis: \"muted\"",
    "- 辅助信息（时间、来源、标签）：usageHint: \"caption\" + emphasis: \"muted\"",
    "- 价格/指标数据：role: \"price\" + variant: \"metric\" + fontWeight: \"800\"",
    "",
    "参考实例：Live Commerce 价格使用 fontSize: \"22px\" 放大；Finance Brief 标题用 fontWeight: \"900\" + usageHint: \"h2\"；Work Board 指标数值使用 fontWeight: \"800\" + usageHint: \"h4\"。",
    "",
    "### 模式 5：间距系统",
    "",
    "适用场景：所有布局。",
    "",
    "常用取值约定：",
    "- gap：紧凑 3-5px、标准 8-10px、宽松 14px",
    "- padding：卡片内边距 12-18px（如 \"16px\", \"18px\"），标签内边距 2-6px + 6-10px（如 \"3px 8px\"）",
    "- borderRadius：标签 4px、卡片 8-12px、主卡片 16-24px、pill 999px",
    "- fontWeight：辅助 400、标题 700-800、强调数值 800-900",
    "",
    "参考实例：Work Board 主卡片 style: { padding: \"16px\" }，子区域 gap: \"14px\"，标签 style: { padding: \"3px 8px\", borderRadius: \"999px\" }。",
    "",
    "## 8. 常见 bad case",
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
    "### Bad Case F：style 字段误放在组件顶层",
    "",
    "```json",
    "{",
    '  "id": "card",',
    '  "component": "Card",',
    '  "child": "body",',
    '  "padding": "10px",',
    '  "borderRadius": "12px"',
    "}",
    "```",
    "",
    "问题：padding 和 borderRadius 是 style 子字段，必须嵌套在 `\"style\": {}` 内。上面写法即使校验通过，渲染器也会忽略这些字段。正确写法：",
    "",
    "```json",
    "{",
    '  "id": "card",',
    '  "component": "Card",',
    '  "child": "body",',
    '  "style": { "padding": "10px", "borderRadius": "12px" }',
    "}",
    "```",
    "",
    "## 9. 输出前检查",
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
    "- style 对象内的字段是否都在白名单内？padding、borderRadius、shadow 等是否误放在组件顶层？",
    "- 是否合理使用 dark 主题 / 圆角阴影 / 色彩层次 / 字重 / 间距等设计模式？",
  ].join("\n"),
};

/** 构建 A2UI 高质量 Good Case Reference。 */
function buildHighQualityA2UIGoodCasesReference(): SkillReference {
  return {
  id: "high-quality-a2ui-good-cases",
  title: "高质量 A2UI Good Case",
  description:
    "复杂 UI 或需要质量标杆时请求；包含 Live Commerce（亮色电商）、Finance Brief（黑金金融）、Work Board（清爽工具）三个完整 good case，覆盖三种视觉范式。",
  content: [
    "# 高质量 A2UI Good Case",
    "",
    "本 Reference 收录完整、可审查的高质量 A2UI 标杆。三个 case 分别展示三种视觉范式：亮色电商（Live Commerce）、黑金金融（Finance Brief）、清爽工具（Work Board）。",
    "",
    "## Good Case 1: Live Commerce",
    "",
    "亮色电商视觉范式：白色卡片 + 圆角阴影 + 橙色系品牌色 + 暗色操作栏对比。",
    "",
    "```json",
    JSON.stringify(buildA2UIMessages(LIVE_COMMERCE_DATA_MODEL, LIVE_COMMERCE_COMPONENTS), null, 2),
    "```",
    "",
    "为什么好——架构层面：dataModel 按 /live 和 /product 域名聚合；hero 图片 + 直播信息条 + 商品货架 + 双购买 CTA 分层明确；社交指标和价格通过 data binding 关联；购物车和立即购买使用 action.event 提交业务事件。",
    "",
    "为什么好——视觉层面：外层 Card 使用 borderRadius: \"20px\" + shadow: \"md\" + overflow: \"hidden\" 做圆角裁剪；暗色操作栏（backgroundColor: \"#3d3b36\"）与白色卡片形成层次对比；直播标签使用 backgroundColor: \"#ff2f64\" 红色强调；立即购买按钮用 backgroundColor: \"#ff5a1f\" 品牌橙；价格用 fontSize: \"22px\" + role: \"price\" + variant: \"metric\" 放大突出。",
    "",
    "## Good Case 2: Finance Brief",
    "",
    "黑金金融视觉范式：深色背景 + 暖金色文字 + 多层次边框 + 大圆角阴影。",
    "",
    "```json",
    JSON.stringify(buildA2UIMessages(FINANCE_BRIEF_DATA_MODEL, FINANCE_BRIEF_COMPONENTS), null, 2),
    "```",
    "",
    "为什么好——架构层面：金融资讯拆成 hero、指标网格、分类操作、新闻列表和页脚事件；筛选和收藏都写回 dataModel；List 模板渲染 visibleNews；列表项使用相对 path 和 context。",
    "",
    "为什么好——视觉层面：外围 Card 使用 backgroundColor: \"#080807\" + color: \"#f8edcf\" + borderRadius: \"24px\" + shadow: \"lg\" 建立黑金基调；内部 hero 区块用 backgroundColor: \"#14100a\" + borderColor: \"#3c2d18\" + borderWidth: \"1px\" 拉开层次；指标卡用 backgroundColor: \"#120f0a\" 统一暗底；文字用三层金棕色（#fff7df / #d7b46a / #c8b98e）建立信息层级；分类标签通过 intent: \"warning\" vs importance: \"quiet\" 区分选中态。",
    "",
    "## Good Case 3: Work Board",
    "",
    "清爽工具视觉范式：浅色背景 + 白色卡片 + 蓝紫色品牌点缀 + 彩色指标卡 + 微阴影。",
    "",
    "```json",
    JSON.stringify(buildA2UIMessages(WORK_BOARD_DATA_MODEL, WORK_BOARD_COMPONENTS), null, 2),
    "```",
    "",
    "为什么好——架构层面：草稿输入和任务列表放入 dataModel；顶部 3 列 Grid 指标卡通过属性 script 从 /todo/items 数组派生统计值；TextField 绑定可编辑 draft；List 模板渲染任务卡；CheckBox 写回 item 状态；新增和清理按钮使用 action.script 做本地数组更新并回传事件。",
    "",
    "为什么好——视觉层面：整体浅色背景（#f8fafc）+ 白色卡片（backgroundColor: \"#ffffff\", borderRadius: \"12px\", shadow: \"sm\"）；顶部统计区用三色指标卡——紫色（#f5f3ff）表总数、琥珀色（#fffbeb）表进行中、绿色（#f0fdf4）表已完成；数值用对应颜色 fontWeight: \"800\" + usageHint: \"h4\"；添加按钮用 backgroundColor: \"#7c3aed\" 品牌紫强调主操作；底部操作区用 borderTop 分隔线区分层级；列表项用 borderRadius: \"8px\" 微圆角保持清爽。",
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

// NOTE(skill): 以下 good case 与 renderer-capability-demo/src/cases.ts 保持同步。
const LIVE_COMMERCE_DATA_MODEL: JsonObject = {
  live: {
    badge: "直播中",
    title: "农夫山泉 好礼相送",
    cta: "去逛逛",
    viewers: "3000+",
    likes: "1444",
    cover: LIVE_COMMERCE_COVER,
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
    thumbnail: WATER_THUMB,
  },
};

const LIVE_COMMERCE_COMPONENTS: A2UIComponent[] = [
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
  { id: "cartButton", component: "Button", label: "加入购物车", intent: "warning", shape: "rounded", importance: "prominent", fullWidth: true, action: { event: { name: "addToCart", context: { sku: { path: "/product/sku" }, title: { path: "/product/title" } } } } },
  { id: "buyButton", component: "Button", label: "立即购买", intent: "danger", shape: "rounded", importance: "prominent", fullWidth: true, style: { backgroundColor: "#ff5a1f" }, action: { event: { name: "buyNow", context: { sku: { path: "/product/sku" }, price: { path: "/product/price" }, title: { path: "/product/title" } } } } },
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
    draft: "",
    items: [
      { id: "task-1", title: "整理 Basic Catalog 能力矩阵", project: "Renderer", done: true },
      { id: "task-2", title: "补齐表单组件截图测试", project: "QA", done: false },
      { id: "task-3", title: "验证 JSRuntime 安全边界", project: "Runtime", done: false },
      { id: "task-4", title: "补充视觉设计指南 Reference", project: "Skill", done: true },
    ],
  },
};

const WORK_BOARD_COMPONENTS: A2UIComponent[] = [
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
  { id: "todoAddButton", component: "Button", label: "添加", icon: "plus", intent: "primary", shape: "pill", style: { backgroundColor: "#7c3aed" }, action: { script: { code: "const title = String(dataModel.get('/todo/draft') || '').trim(); if (!title) { actions.emit('todoSkipped', { reason: 'empty' }); return; } const items = dataModel.get('/todo/items') || []; const next = [...items, { id: `task-${items.length + 1}`, title, project: 'Renderer Lab', done: false }]; dataModel.set('/todo/items', next); dataModel.set('/todo/draft', ''); actions.emit('todoAdded', { title, total: next.length });", deps: ["/todo/items", "/todo/draft"] } } },
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
