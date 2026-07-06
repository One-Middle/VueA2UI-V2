import type { AgentContext } from "../context/context-builder.js";
import type { ValidationIssue } from "@a2ui-platform/shared";
import { getAllCatalogComponentNames } from "../tools/catalog-schema.js";

// ─── PromptComposer ─────────────────────────────────────────

export class PromptComposer {
  /**
   * 生成初始请求的 system prompt 和 user prompt。
   */
  composeInitial(context: AgentContext): {
    systemPrompt: string;
    userPrompt: string;
  } {
    const componentList = getAllCatalogComponentNames().join("、");
    const systemPrompt = this.buildBaseSystemPrompt(componentList);
    const userPrompt = this.buildUserPrompt(context);

    return { systemPrompt, userPrompt };
  }

  /**
   * 生成修复请求的 system prompt 和 user prompt。
   * 修复时要求模型只修正校验错误，不要重新设计整个 UI。
   */
  composeRepair(
    context: AgentContext,
    previousOutput: string,
    errors: ValidationIssue[],
  ): { systemPrompt: string; userPrompt: string } {
    const componentList = getAllCatalogComponentNames().join("、");
    const systemPrompt =
      this.buildBaseSystemPrompt(componentList) +
      "\n\n你现在处于修复模式。请只修复下面列出的校验错误，不要重新设计整个 UI。保持已有的正确部分不变。";

    const errorLines = errors.map(
      (e, i) =>
        `[${i + 1}] 错误码: ${e.code}，路径: ${e.path ?? "(无)"}，信息: ${e.message}`,
    );

    const userPrompt = [
      "## 上一版模型输出",
      previousOutput,
      "",
      "## 校验失败详情",
      "以上输出经 A2UI v0.9 校验后未通过。请修复以下错误：",
      ...errorLines,
      "",
      "## 用户原始需求（参考）",
      context.userMessage,
      "",
      "请只修复上述列出的错误。正确部分保持不变，不要重新设计整个 UI。只输出修复后的完整 JSON。",
    ].join("\n");

    return { systemPrompt, userPrompt };
  }

  // ─── 私有方法 ─────────────────────────────────────────

  /**
   * 构建基础 system prompt（初始和修复共用）。
   */
  private buildBaseSystemPrompt(componentList: string): string {
    return [
      "## 角色",
      "你是一个 A2UI 页面生成助手。你的任务是根据用户的自然语言描述，使用固定的 Basic Catalog 组件生成符合 A2UI v0.9 规范的 UI 界面。",
      "",
      "## 可用组件",
      `你只能使用以下 Basic Catalog 组件：${componentList}。`,
      "不能使用 Catalog 之外的任意组件。",
      "",
      "## 输出格式要求",
      "你的输出必须是一个严格的 JSON 对象（不要用 Markdown 代码块包裹），结构如下：",
      "{",
      '  "assistantMessage": "给用户的文本回复（解释你生成了什么）",',
      '  "a2uiMessages": [ /* A2UI v0.9 消息数组 */ ]',
      "}",
      "",
      "### a2uiMessages 说明",
      "a2uiMessages 是 A2UI v0.9 server-to-client 消息数组。每条消息是以下四种之一：",
      '1. createSurface — { "version": "v0.9", "createSurface": { "surfaceId": "...", "catalogId": "..." } }',
      '2. updateComponents — { "version": "v0.9", "updateComponents": { "surfaceId": "...", "components": [...] } }',
      '3. updateDataModel — { "version": "v0.9", "updateDataModel": { "surfaceId": "...", "path": "/...", "value": ... } }',
      '4. deleteSurface — { "version": "v0.9", "deleteSurface": { "surfaceId": "..." } }',
      "",
      "必须先 createSurface，再用 updateComponents 添加组件。",
      "",
      "### 组件定义规范",
      "每个组件对象的最小结构：",
      '{ "id": "唯一组件ID", "component": "组件类型名称", ...组件属性 }',
      "",
      "### 组件关系 - 邻接表",
      "使用邻接表方式定义组件树：",
      "- 每个组件都有唯一的字符串 id。",
      '- 容器组件（Row、Column、List、Card、Tabs、Modal）通过 child（单子）或 children（多子，字符串数组）引用其他组件的 id。',
      "- 必须有一个 id 为 \"root\" 的组件作为 UI 树的根。",
      "",
      "### 数据绑定",
      '数据绑定使用 JSON Pointer 格式：{ "path": "/some/data/path" }',
      "例如，TextField 的 text 属性可以绑定到 data model 的某个路径。",
      "",
      "## 禁止事项",
      "- 禁止生成任意 HTML、JavaScript 或 CSS。",
      "- 禁止用 Markdown 代码块（如 ```json）包裹 JSON 输出。",
      "- 禁止使用 Catalog 之外的自定义组件。",
      '- 禁止在组件属性中使用 "innerHTML"、"eval"、"<script" 等不安全内容。',
      "- 禁止引用不存在的组件 id。",
      "",
      "## 注意事项",
      "- 必须确保所有组件 id 在同一个 surface 内唯一。",
      "- updateComponents 中的 components 数组不能为空。",
      "- 如果用户只是纯文字对话（不涉及 UI 修改），assistantMessage 给出回复，a2uiMessages 设为空数组 []。",
    ].join("\n");
  }

  /**
   * 构建用户 prompt（拼接用户消息和上下文）。
   */
  private buildUserPrompt(context: AgentContext): string {
    const parts: string[] = [];

    parts.push("## 用户需求");
    parts.push(context.userMessage);
    parts.push("");

    parts.push(context.recentMessages);
    parts.push("");

    parts.push(context.uploadedFiles);
    parts.push("");

    parts.push(context.enabledSkills);
    parts.push("");

    parts.push(context.currentSnapshotSummary);
    parts.push("");

    parts.push(context.catalogSummary);
    parts.push("");

    parts.push(
      "请根据以上用户需求和上下文信息，生成符合 A2UI v0.9 规范的 UI 界面。如果用户没有要求修改 UI，则只需回复文本，a2uiMessages 设为空数组。",
    );

    return parts.join("\n");
  }
}
