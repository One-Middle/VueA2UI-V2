/**
 * ReAct Agent prompt 合成器。
 *
 * 职责：
 * - 合成稳定的 system prompt（身份、边界、ReAct 契约、JSON 协议、工具策略、质量门禁等）。
 * - 按每轮 working context（goal / facts / observations / currentDraft / capabilities）生成 user prompt。
 *
 * 不负责：调用模型、执行工具、读取数据库；prompt 压缩与文案优化留待后续版本。
 */

import type {
  AgentDraft,
  AgentObservation,
  ReactAgentRunInput,
} from "./react-agent-types.js";

/** system prompt 与 user prompt 的合成结果。 */
export interface ReactPrompt {
  systemPrompt: string;
  userPrompt: string;
}

/**
 * 合成一次 ReAct 迭代所需的 system / user prompt。
 *
 * system prompt 在单次运行内保持稳定（除授权工具与期望产物外不变化）；
 * user prompt 每轮根据最新 observation 与 currentDraft 重新生成。
 */
export class ReactPromptComposer {
  /**
   * 合成 system + user prompt。
   *
   * @param input - 当前运行的输入（含 goal、facts、capabilities、limits）。
   * @param observations - 已累积的系统观察结果。
   * @param currentDraft - 上一轮校验未通过的草稿（无则为 null）。
   */
  compose(
    input: ReactAgentRunInput,
    observations: AgentObservation[],
    currentDraft: AgentDraft | null,
  ): ReactPrompt {
    return {
      systemPrompt: this.composeSystemPrompt(input),
      userPrompt: this.composeUserPrompt(input, observations, currentDraft),
    };
  }

  /** 合成 system prompt：静态契约 + 动态授权信息。 */
  composeSystemPrompt(input: ReactAgentRunInput): string {
    const sections = [
      buildIdentityAndMission(),
      buildAuthorityBoundaries(),
      buildWorkflowContract(),
      buildReactLoopContract(),
      buildJsonProtocol(),
      buildToolPolicy(),
      buildQualityGates(),
      buildA2UIConstraints(),
      buildRecoveryRules(),
      buildContextPriority(),
      "",
      "## 本任务授权工具",
      input.capabilities.allowedTools.length > 0
        ? input.capabilities.allowedTools.join(", ")
        : "（未授权任何工具，只能直接 final_draft 或 give_up）",
      "",
      "## 期望最终产物种类",
      input.goal.expectedResult.join(" | "),
    ];

    return sections.join("\n");
  }

  /** 合成 user prompt：goal、facts、observations、currentDraft、capabilities 与输出提醒。 */
  composeUserPrompt(
    input: ReactAgentRunInput,
    observations: AgentObservation[],
    currentDraft: AgentDraft | null,
  ): string {
    const parts: string[] = [];

    parts.push("## 目标（Goal）");
    parts.push(`- task: ${input.goal.task}`);
    parts.push(`- 描述: ${input.goal.description}`);
    parts.push(`- 期望产物种类: ${input.goal.expectedResult.join(" | ")}`);
    parts.push("");

    parts.push("## 事实（Facts）");
    if (input.facts.length === 0) {
      parts.push("（无）");
    } else {
      for (const fact of input.facts) {
        parts.push(`### ${fact.label} [${fact.kind}]`);
        parts.push(typeof fact.content === "string" ? fact.content : JSON.stringify(fact.content, null, 2));
        parts.push("");
      }
    }

    parts.push("## 观察（Observations）");
    if (observations.length === 0) {
      parts.push("（无）");
    } else {
      observations.forEach((obs, i) => {
        parts.push(`[${i + 1}] (${obs.kind}) ${obs.message}`);
        if (obs.details) {
          parts.push(`    详情: ${JSON.stringify(obs.details)}`);
        }
      });
    }
    parts.push("");

    parts.push("## 当前草稿（Current Draft）");
    if (currentDraft) {
      parts.push(`finalKind: ${currentDraft.finalKind}`);
      parts.push(JSON.stringify(currentDraft.draft, null, 2));
    } else {
      parts.push("（无）");
    }
    parts.push("");

    parts.push("## 能力（Capabilities）");
    parts.push(`- catalogId: ${input.capabilities.catalogId}`);
    parts.push(`- catalogVersion: ${input.capabilities.catalogVersion}`);
    parts.push(`- rendererVersion: ${input.capabilities.rendererVersion}`);
    if (input.capabilities.skillReferences && input.capabilities.skillReferences.length > 0) {
      parts.push("- skillReferences:");
      for (const ref of input.capabilities.skillReferences) {
        parts.push(`  - ${ref.skillName}/${ref.title} (${ref.skillId})`);
      }
    }
    parts.push("");

    parts.push("## 本轮输出提醒");
    parts.push(
      "请基于以上上下文，输出单个 JSON 动作：调用一个授权工具（tool_call）、产出最终草稿（final_draft），或放弃（give_up）。",
    );
    parts.push("不要输出 observation，不要输出隐藏推理过程，只能通过 reasoningSummary 给出简短审计摘要。");

    return parts.join("\n");
  }
}

/** 身份与使命。 */
function buildIdentityAndMission(): string {
  return [
    "## 身份与使命",
    "你是 A2UI 创作平台中受控的 workflow Agent。你的任务是在一个明确的 workflow step 内，通过「思考 → 行动」循环推进任务，产出符合预期的最终产物，或向用户请求澄清/确认。",
  ].join("\n");
}

/** 权限边界。 */
function buildAuthorityBoundaries(): string {
  return [
    "## 权限边界",
    "- 你无权直接读写数据库、发送 SSE、保存 artifact 或提交 A2UI。",
    "- 你只能通过工具调用请求系统执行允许的操作，或通过 final_draft 产出最终产物。",
    "- 等待用户输入通过澄清表单/决策表单表达，而不是挂起你的运行。",
  ].join("\n");
}

/** Workflow 契约。 */
function buildWorkflowContract(): string {
  return [
    "## Workflow 契约",
    "- 每次运行只处理一个 workflow task。",
    "- 你必须产出与「期望最终产物种类」匹配的产物。",
    "- 你不能决定 workflow step 的状态或下一步转移，那由系统负责。",
  ].join("\n");
}

/** ReAct 循环契约。 */
function buildReactLoopContract(): string {
  return [
    "## ReAct 循环契约",
    "- 每一轮你只能输出一个动作：调用一个工具（tool_call）、产出最终草稿（final_draft）、或放弃（give_up）。",
    "- 系统会把你工具调用的结果作为「观察」（observation）回传，你再决定下一步。",
    "- 你永远不能自己输出 observation；observation 只能由系统产生。",
  ].join("\n");
}

/** JSON 输出协议。 */
function buildJsonProtocol(): string {
  return [
    "## JSON 输出协议",
    "- 你的每次回复必须是且仅是一个 JSON object，不要输出任何其他文字或 Markdown。",
    "- 三种动作结构如下：",
    '  tool_call: { "type": "tool_call", "reasoningSummary": "调用某个工具的原因", "tool": "工具名", "arguments": { } }',
    '  final_draft: { "type": "final_draft", "reasoningSummary": "产出最终草稿的原因", "finalKind": "期望产物种类之一", "draft": { } }',
    '  give_up: { "type": "give_up", "reasoningSummary": "放弃的原因", "reason": "无法继续的说明", "recoverable": true }',
    "- reasoningSummary 是简短的可审计推理摘要，不要输出隐藏思维链。",
    "- 每轮最多调用一个工具。",
    "- 最终草稿的 draft 内容结构：",
    '  - clarification_form 的 draft: { "title": "…", "description": "…", "fields": [{"id","label","type","required","reason","options?"}] }',
    '  - decision_form 的 draft: { "title": "…", "prompt": "…", "guidance": "…", "target": "plan_markdown|candidate_a2ui_messages", "options": [{"id","label"}] }',
    '  - plan_markdown 的 draft: { "markdown": "## 页面目标\\n…" }',
    '  - candidate_a2ui_messages 的 draft: { "messages": [A2UI 服务端消息…] }',
  ].join("\n");
}

/** 工具使用策略。 */
function buildToolPolicy(): string {
  return [
    "## 工具使用策略",
    "- 只能调用「本任务授权工具」中列出的工具。",
    "- 调用未授权工具会被系统拒绝。",
    "- askClarification 与 askUserDecision 会结束本轮运行并等待用户输入。",
    "- validateA2UI 用于校验 A2UI 消息。",
  ].join("\n");
}

/** 最终草稿质量门禁。 */
function buildQualityGates(): string {
  return [
    "## 最终草稿质量门禁",
    "- final_draft 的 finalKind 必须属于「期望最终产物种类」。",
    "- plan_markdown 必须包含这些标题：页面目标、布局结构、组件清单、Data Model、交互行为、假设、风险。",
    "- decision_form 必须包含 confirm、revise、reject 三个选项。",
    "- clarification_form 必须包含非空 fields。",
    "- candidate_a2ui_messages 会经过强制 validateA2UI 校验。",
  ].join("\n");
}

/** A2UI 协议约束。 */
function buildA2UIConstraints(): string {
  return [
    "## A2UI 协议约束",
    "- 生成 A2UI 消息时，只能使用授权 Catalog 中的组件。",
    "- 禁止输出 HTML、浏览器 JS、CSS，或 script、innerHTML、eval、javascript: 等不安全内容。",
    "- 组件 id 在同一 surface 内唯一，updateComponents 的 components 数组不能为空。",
  ].join("\n");
}

/** 恢复与修复规则。 */
function buildRecoveryRules(): string {
  return [
    "## 恢复与修复规则",
    "- 当系统回传校验失败的 observation 时，你必须修复草稿而不是从头重做。",
    "- 保持已通过的部分不变，只修复失败部分。",
    "- 若无法继续，用 give_up 明确说明原因，并正确标记 recoverable。",
  ].join("\n");
}

/** 上下文优先级。 */
function buildContextPriority(): string {
  return [
    "## 上下文优先级",
    "- 系统回传的 observation 与 currentDraft 优先级最高。",
    "- 已确认的 plan 与用户澄清答案高于一般 facts。",
    "- 不要臆造未在上下文中出现的 fact。",
  ].join("\n");
}
