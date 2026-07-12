export interface A2uiProtocolGuideOptions {
  componentSummaries: string;
  componentDetails?: string;
  forceFinalOutput?: boolean;
}

export function buildA2uiProtocolGuide(
  options: A2uiProtocolGuideOptions,
): string {
  const parts = [
    "## A2UI v0.9 协议生成指南",
    "",
    "### 1. 最终输出结构",
    "当你已经掌握所需组件字段时，必须只输出严格 JSON 对象，不要使用 Markdown 代码块，不要输出 JSON 之外的解释文字。",
    "{",
    '  "assistantMessage": "给用户的文本回复，说明生成或修改了什么",',
    '  "a2uiMessages": []',
    "}",
    "如果用户只是聊天、解释或询问，并没有要求创建或修改 UI，则 a2uiMessages 必须是空数组 []。",
    "",
    "### 2. 组件详情请求结构",
    "如果你还不知道某些组件的可用字段、必填项或枚举值，先输出组件详情请求，不要猜字段。",
    "{",
    '  "assistantMessage": "需要查看组件详情后再生成。",',
    '  "componentInfoRequest": {',
    '    "components": ["Column", "Text", "Card"],',
    '    "reason": "需要布局、文本和卡片容器字段"',
    "  }",
    "}",
    "componentInfoRequest.components 只能填写下方 Basic Catalog 中存在的组件名称。",
    "",
    "### 3. 可用组件摘要",
    "首轮只提供组件名称和用途。需要字段细节时，使用 componentInfoRequest 请求对应组件详情。",
    options.componentSummaries,
    "",
    "### 4. 消息类型",
    "a2uiMessages 是 A2UI v0.9 server-to-client 消息数组，每条消息只能是下面四种之一：",
    '1. createSurface: { "version": "v0.9", "createSurface": { "surfaceId": "main", "catalogId": "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json" } }',
    '2. updateDataModel: { "version": "v0.9", "updateDataModel": { "surfaceId": "main", "path": "/", "value": { ... } } }',
    '3. updateComponents: { "version": "v0.9", "updateComponents": { "surfaceId": "main", "components": [ ... ] } }',
    '4. deleteSurface: { "version": "v0.9", "deleteSurface": { "surfaceId": "main" } }',
    '生成新 UI 时必须先 createSurface，再 updateDataModel（如需要），最后 updateComponents。surfaceId 固定使用 "main"。',
    "",
    "### 5. 组件树规则",
    '每个组件对象必须包含 { "id": "唯一组件ID", "component": "组件类型名称" }。',
    '必须存在一个 id 为 "root" 的组件作为 UI 树根节点。',
    "A2UI 使用邻接表，不使用嵌套 children 对象。容器通过字符串 id 引用子组件。",
    "同一 surface 内所有组件 id 必须唯一，所有 child/children/tabItems.child 引用的 id 必须真实存在。",
    "",
    "### 6. 数据绑定",
    '动态数据使用 JSON Pointer：{ "path": "/some/data/path" }。',
    "固定文案直接写字符串，不必放入 dataModel。",
    "",
    "### 7. 页面组织方法",
    "不要把页面生成成一串孤立 Text。优先用 Column 作为 root，用 Row、Card、List、Tabs 等容器组织层级。",
    "页面标题使用独立 Text；分区使用 Card 包裹；信息密集页面用 Row/Column 表达并列和纵向内容。",
    "没有请求到组件详情前，不要臆造该组件字段。",
    "",
    "### 8. 常见错误与禁止写法",
    '- Row/Column 的 children 只能写组件 id 字符串数组，不要写完整组件对象。',
    '- Card 使用单个 child 字段，不要写 children；如果卡片内有多个内容，先创建一个 Column，再让 Card.child 指向这个 Column。',
    '- Button.action 必须是 { "name": "...", "context": { ... } }，不要写成字符串。',
    "- 禁止生成 table、div、input、select、Schedule、Calendar 等 Catalog 外组件。",
    "- 禁止使用 className、css、html、innerHTML、script、onClick、onInput、onChange 等非 Catalog 字段。",
    "- style 只能使用受控白名单字段；复杂视觉效果优先使用 variant、size、tone、preset。",
  ];

  if (options.componentDetails?.trim()) {
    parts.push(
      "",
      "### 9. 已披露组件详情",
      "你只能依赖以下已披露组件详情生成对应组件字段。未披露组件如需字段细节，应继续请求详情。",
      options.componentDetails.trim(),
    );
  }

  if (options.forceFinalOutput) {
    parts.push(
      "",
      "### 10. 强制最终输出",
      "组件详情披露轮次已达到上限。现在必须基于已披露的信息输出最终 { assistantMessage, a2uiMessages } JSON，不要再输出 componentInfoRequest。",
    );
  }

  return parts.join("\n");
}
