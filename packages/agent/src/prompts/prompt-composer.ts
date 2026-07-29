import type { AgentContext } from "../context/context-builder.js";
import type { ValidationIssue } from "@a2ui-platform/shared";
import { formatCatalogComponentSummaries } from "../tools/catalog-schema.js";

export interface PromptDisclosureOptions {
  componentDetails?: string;
  skillDetails?: string;
  skillReferenceDetails?: string;
  forceFinalOutput?: boolean;
}

export class PromptComposer {
  composeInitial(
    context: AgentContext,
    options: PromptDisclosureOptions = {},
  ): {
    systemPrompt: string;
    userPrompt: string;
  } {
    const componentSummaries = formatCatalogComponentSummaries();
    const systemPrompt = this.buildBaseSystemPrompt(
      componentSummaries,
      options,
    );
    const userPrompt = this.buildUserPrompt(context);

    return { systemPrompt, userPrompt };
  }

  composeRepair(
    context: AgentContext,
    previousOutput: string,
    errors: ValidationIssue[],
    options: PromptDisclosureOptions = {},
  ): { systemPrompt: string; userPrompt: string } {
    const componentSummaries = formatCatalogComponentSummaries();
    const systemPrompt =
      this.buildBaseSystemPrompt(componentSummaries, {
        ...options,
        forceFinalOutput: true,
      }) +
      "\n\n你现在处于修复模式。请只修复下面列出的校验错误，不要重新设计整个 UI。保持已有的正确部分不变。";

    const errorLines = errors.map(
      (e, i) =>
        `[${i + 1}] 错误码 ${e.code}，路径 ${e.path ?? "(无)"}，信息 ${e.message}`,
    );

    const userPrompt = [
      "## 上一版模型输出",
      previousOutput,
      "",
      "## 校验失败详情",
      "以上输出经过 A2UI v0.9 校验后未通过。请修复以下错误：",
      ...errorLines,
      "",
      "## 用户原始需求（参考）",
      context.userMessage,
      "",
      "请只修复上述列出的错误。正确部分保持不变，不要重新设计整个 UI。只输出修复后的完整 JSON。",
    ].join("\n");

    return { systemPrompt, userPrompt };
  }

  private buildBaseSystemPrompt(
    componentSummaries: string,
    options: PromptDisclosureOptions,
  ): string {
    return [
      "## 角色",
      "你是 A2UI 创作平台中的受控 UI 生成 Agent。你的任务是理解用户的自然语言需求，读取上下文摘要，选择并请求相关 Skill，按需请求组件字段详情，生成并修复 A2UI。",
      "",
      "## 工作流",
      "理解用户需求 -> 向用户确认自己的理解 -> 开始生成 -> 校验 -> 提交",
      "- 向用户确认自己的理解默认体现在最终 JSON 的 assistantMessage：先简要复述你的理解，再说明生成或修改了什么。",
      "- 除非需求明显缺少无法合理补全的关键信息，否则不要阻塞式追问，应该基于上下文和已启用 Skill 继续生成。",
      "- 当用户要求创建、修改或修复 UI 时，必须先通过已启用 Skill 列表获取 A2UI 生成规则；不要凭空生成协议细节。",
      "- 正式提交前必须经过 validateA2UI 校验；校验失败时进入修复，不得绕过校验。",
      "",
      "## 能力与输出通道",
      "你只能使用以下三类结构化输出之一：",
      "",
      "### 1. 请求 Skill 完整内容",
      "{",
      '  "assistantMessage": "需要查看相关 Skill 后再生成。",',
      '  "skillInfoRequest": {',
      '    "skills": ["skill-id-or-name"],',
      '    "reason": "需要遵循该 Skill 的生成规范"',
      "  }",
      "}",
      "skillInfoRequest.skills 只能填写已启用 Skill 摘要中的 id 或 name，优先使用 id。",
      "",
      "### 2. 请求 Skill Reference 完整内容",
      "{",
      '  "assistantMessage": "需要查看相关参考资料后再生成。",',
      '  "skillReferenceRequest": {',
      '    "skill": "skill-id-or-name",',
      '    "references": ["reference-id-or-title"],',
      '    "reason": "需要遵循该参考资料"',
      "  }",
      "}",
      'skillReferenceRequest.skill 只能填写已启用 Skill 摘要中的 id 或 name；references 只能填写该 Skill 摘要中的 reference id 或 title，也可以填写 "*" 请求该 Skill 下全部 references。',
      "",
      "### 3. 请求组件字段详情",
      "{",
      '  "assistantMessage": "需要查看组件详情后再生成。",',
      '  "componentInfoRequest": {',
      '    "components": ["Column", "Text", "Card"],',
      '    "reason": "需要布局、文本和卡片容器字段"',
      "  }",
      "}",
      "componentInfoRequest.components 只能填写下方 Basic Catalog 中存在的组件名称。",
      "",
      "### 4. 最终响应",
      "{",
      '  "assistantMessage": "先简要复述理解，再说明生成或修改了什么",',
      '  "a2uiMessages": []',
      "}",
      "如果用户只是纯文字对话（不涉及 UI 修改），assistantMessage 给出回复，a2uiMessages 设为空数组 []。",
      "",
      "## 可请求的 Basic Catalog 组件摘要",
      "首轮只提供组件名称和用途。需要字段细节时，使用 componentInfoRequest 请求对应组件详情。",
      componentSummaries,
      ...(options.skillDetails?.trim()
        ? [
            "",
            "## 已披露 Skill 内容",
            "你必须遵循以下已披露 Skill 内容。未披露 Skill 如需完整规则，应继续请求 skillInfoRequest。",
            options.skillDetails.trim(),
          ]
        : []),
      ...(options.skillReferenceDetails?.trim()
        ? [
            "",
            "## 已披露 Skill Reference 内容",
            "你必须遵循以下已披露 Skill Reference 内容。未披露 reference 如需完整内容，应继续请求 skillReferenceRequest。",
            options.skillReferenceDetails.trim(),
          ]
        : []),
      ...(options.componentDetails?.trim()
        ? [
            "",
            "## 已披露组件详情",
            "你只能依赖以下已披露组件详情生成对应组件字段。未披露组件如需字段细节，应继续请求详情。",
            options.componentDetails.trim(),
          ]
        : []),
      ...(options.forceFinalOutput
        ? [
            "",
            "## 强制最终输出",
            "渐进式披露轮次已达到上限。现在必须基于已披露的信息输出最终 { assistantMessage, a2uiMessages } JSON，不要再输出 componentInfoRequest、skillInfoRequest 或 skillReferenceRequest。",
          ]
        : []),
      "",
      "## 禁止事项",
      "- 禁止生成任意 HTML、浏览器 JavaScript 或 CSS；只有已披露 A2UI Skill 明确允许的受限 script 声明例外。",
      "- 禁止用 Markdown 代码块（如 ```json）包裹 JSON 输出。",
      "- 禁止使用 Catalog 之外的自定义组件。",
      '- 禁止在组件属性中使用 "innerHTML"、"eval"、"<script"、"javascript:"、DOM、window、document、fetch 等不安全内容。',
      "- 禁止引用不存在的组件 id。",
      "",
      "## 注意事项",
      "- 必须确保所有组件 id 在同一个 surface 内唯一。",
      "- updateComponents 中的 components 数组不能为空。",
      "- 如果用户只是纯文字对话（不涉及 UI 修改），assistantMessage 给出回复，a2uiMessages 设为空数组 []。",
    ].join("\n");
  }

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
      "请根据以上用户需求和上下文信息生成 A2UI。若需要 Skill 完整内容，请先输出 skillInfoRequest；若需要 Skill Reference 完整内容，请先输出 skillReferenceRequest；若需要组件字段详情，请先输出 componentInfoRequest；若已有足够信息，请输出最终 { assistantMessage, a2uiMessages } JSON。",
    );

    return parts.join("\n");
  }
}
