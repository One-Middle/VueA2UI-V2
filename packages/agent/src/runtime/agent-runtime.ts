/**
 * Agent Runtime 核心调度器。
 *
 * 职责：
 * - 编排 Agent 运行的主循环（生成 → 校验 → 修复）
 * - 调度模型调用（初始生成 / 修复模式）
 * - 管理渐进式组件披露（progressive disclosure）流程
 * - 调用 validateA2UI 校验模型输出
 * - 记录工具调用和 Token 用量
 *
 * 不负责：上下文构建（见 AgentContextBuilder）、Prompt 组装（见 PromptComposer）、
 * 模型 HTTP 通信（见 ModelClient）、A2UI 校验实现（见 tools/validate-a2ui）。
 */

import type {
  AgentRunInput,
  AgentRunResult,
  IAgentRuntime,
  ToolCallRecord,
  ValidateA2UIResult,
  A2UIServerMessage,
  JsonObject,
} from "@a2ui-platform/shared";
import { AgentContextBuilder, type AgentContext } from "../context/context-builder.js";
import { PromptComposer } from "../prompts/prompt-composer.js";
import { ModelClient, type ModelResponse, type TokenUsage } from "../model/model-client.js";
import { parseModelOutput } from "./output-parser.js";
import { parseComponentInfoRequest } from "./component-info-request-parser.js";
import { parseSkillInfoRequest } from "./skill-info-request-parser.js";
import { parseSkillReferenceRequest } from "./skill-reference-request-parser.js";
import { validateA2UI } from "../tools/validate-a2ui.js";
import {
  formatCatalogComponentDetails,
  getComponentDef,
} from "../tools/catalog-schema.js";
import { logger, shortId, truncate } from "../logger.js";

/** 最大生成 + 修复尝试次数 */
const MAX_ATTEMPTS = 3;
/** 渐进式信息披露的最大轮数 */
const MAX_DISCLOSURE_ROUNDS = 3;

/**
 * Agent 运行时实现。
 *
 * 负责串联上下文构建、Prompt 生成、模型调用、渐进式信息披露、A2UI 校验和失败修复。
 */
export class AgentRuntime implements IAgentRuntime {
  private modelClient: ModelClient;
  private promptComposer: PromptComposer;
  private contextBuilder: AgentContextBuilder;

  constructor(
    modelClient: ModelClient,
    promptComposer: PromptComposer,
    contextBuilder: AgentContextBuilder,
  ) {
    this.modelClient = modelClient;
    this.promptComposer = promptComposer;
    this.contextBuilder = contextBuilder;
  }

  /**
   * 执行一次完整的 Agent 运行：构建上下文 → 循环生成/校验/修复（最多 3 次）。
   *
   * @param input - Agent 运行输入参数
   * @param onToolCall - 工具调用回调，用于通知外部记录每次工具调用
   * @returns Agent 运行结果（COMMITTED / TEXT_ONLY / FAILED）
   */
  async run(
    input: AgentRunInput,
    onToolCall?: (record: ToolCallRecord) => void,
  ): Promise<AgentRunResult> {
    const sid = shortId(input.sessionId);
    const context = this.contextBuilder.buildContext(input);
    logger.info(`准备上下文 → session=${sid}, model=${input.model.name}`);
    logger.info(
      `用户输入 → session=${sid}, 长度=${input.userMessage.length}\n${input.userMessage}`,
    );

    let lastAssistantMessage = "";
    let lastA2uiMessages: A2UIServerMessage[] = [];
    let lastValidation: ValidateA2UIResult | undefined;
    let totalTokens: JsonObject | undefined;
    let componentDetails = "";
    let skillDetails = "";
    let skillReferenceDetails = "";
    const disclosedComponents = new Set<string>();
    const disclosedSkills = new Set<string>();
    const disclosedSkillReferences = new Set<string>();

    /** 累加 Token 用量到 totalTokens。 */
    const addUsage = (usage?: TokenUsage): void => {
      if (!usage) return;
      totalTokens = {
        ...(totalTokens ?? {}),
        promptTokens:
          ((totalTokens?.["promptTokens"] as number) ?? 0) + usage.promptTokens,
        completionTokens:
          ((totalTokens?.["completionTokens"] as number) ?? 0) +
          usage.completionTokens,
        totalTokens:
          ((totalTokens?.["totalTokens"] as number) ?? 0) + usage.totalTokens,
      };
    };

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const isRepair = attempt > 1;
      let modelResponse: ModelResponse;

      try {
        if (isRepair) {
          // 修复模式：将上次失败的输出和校验错误注入修复 Prompt
          const { systemPrompt, userPrompt } = this.promptComposer.composeRepair(
            context,
            JSON.stringify({
              assistantMessage: lastAssistantMessage,
              a2uiMessages: lastA2uiMessages,
            }),
            lastValidation?.errors ?? [],
            { componentDetails, skillDetails, skillReferenceDetails },
          );

          logger.info(
            `修复模式 → attempt=${attempt}/${MAX_ATTEMPTS}, 上次错误数=${lastValidation?.errors.length ?? 0}`,
          );

          modelResponse = await this.modelClient.generate([
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ]);
          addUsage(modelResponse.usage);
          logger.debug(
            `模型回复 → attempt=${attempt}/${MAX_ATTEMPTS}, 长度=${modelResponse.content.length}\n${truncate(modelResponse.content, 2000)}`,
          );
        } else {
          // 初始模式：带渐进式组件披露的生成流程
          const disclosureResult =
            await this.generateWithProgressiveDisclosure(
              context,
              attempt,
              disclosedComponents,
              disclosedSkills,
              disclosedSkillReferences,
              componentDetails,
              skillDetails,
              skillReferenceDetails,
              addUsage,
              onToolCall,
            );
          modelResponse = disclosureResult.modelResponse;
          componentDetails = disclosureResult.componentDetails;
          skillDetails = disclosureResult.skillDetails;
          skillReferenceDetails = disclosureResult.skillReferenceDetails;
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.warn(
          `模型调用失败 → attempt=${attempt}/${MAX_ATTEMPTS}, error=${errMsg.slice(0, 120)}`,
        );
        if (attempt >= MAX_ATTEMPTS) {
          return {
            status: "FAILED",
            assistantMessage: lastAssistantMessage || "模型调用失败",
            attemptCount: attempt,
            failureReason: `模型调用失败：${errMsg}`,
          };
        }
        lastAssistantMessage = `模型调用失败：${errMsg}`;
        lastA2uiMessages = [];
        continue;
      }

      // 解析模型输出，提取 assistant 文本和 A2UI 消息
      const parseResult = parseModelOutput(modelResponse.content);

      if (!parseResult.ok) {
        logger.warn(
          `解析失败 → attempt=${attempt}/${MAX_ATTEMPTS}, error=${parseResult.error.slice(0, 120)}`,
        );
        lastAssistantMessage = modelResponse.content;
        lastA2uiMessages = [];

        if (attempt >= MAX_ATTEMPTS) {
          return {
            status: "FAILED",
            assistantMessage: modelResponse.content,
            attemptCount: attempt,
            failureReason: `模型输出解析失败：${parseResult.error}`,
          };
        }
        continue;
      }

      const { assistantMessage, a2uiMessages } = parseResult.data;
      lastAssistantMessage = assistantMessage;
      lastA2uiMessages = a2uiMessages;

      // A2UI 校验
      const validateStartTime = Date.now();
      const validation = validateA2UI({
        messages: a2uiMessages,
        catalogId: input.catalogId,
        currentSnapshot: input.currentSnapshot,
      });
      const validateDuration = Date.now() - validateStartTime;
      lastValidation = validation;

      logger.info(
        `A2UI 校验 → ${validation.valid ? "通过" : "未通过"}, errors=${validation.errors.length}, warnings=${validation.warnings.length}, 耗时=${validateDuration}ms`,
      );

      // 构建 validateA2UI 工具调用记录
      const toolCallRecord: ToolCallRecord = {
        toolName: "validateA2UI",
        status: validation.valid ? "succeeded" : "failed",
        attemptIndex: attempt,
        phase: "VALIDATE_DRAFT",
        inputSummary: {
          messageCount: a2uiMessages.length,
          catalogId: input.catalogId,
          hasCurrentSnapshot: !!input.currentSnapshot,
        },
        output: {
          valid: validation.valid,
          errorCount: validation.errors.length,
          warningCount: validation.warnings.length,
        },
        durationMs: validateDuration,
      };

      if (!validation.valid) {
        toolCallRecord.errorMessage = validation.errors
          .map((e) => `${e.code}: ${e.message}`)
          .join("; ");
      }

      onToolCall?.(toolCallRecord);

      if (validation.valid) {
        if (a2uiMessages.length > 0) {
          logger.info(
            `Agent 完成 → COMMITTED, attempts=${attempt}, messages=${a2uiMessages.length}, tokens=${totalTokens?.["totalTokens"] ?? "?"}`,
          );
          logger.info(
            `最终提交的 A2UI 消息:\n${JSON.stringify(a2uiMessages, null, 2)}`,
          );
          return {
            status: "COMMITTED",
            assistantMessage,
            a2uiMessages,
            attemptCount: attempt,
            validation,
            tokenUsage: totalTokens,
          };
        }

        // 校验通过但无 A2UI 消息 —— 纯文本响应
        logger.info(`Agent 完成 → TEXT_ONLY, attempts=${attempt}`);
        return {
          status: "TEXT_ONLY",
          assistantMessage,
          a2uiMessages: [],
          attemptCount: attempt,
          tokenUsage: totalTokens,
        };
      }

      // 已达最大尝试次数仍未通过校验
      if (attempt >= MAX_ATTEMPTS) {
        logger.warn(
          `Agent 完成 → FAILED, attempts=${MAX_ATTEMPTS}, errors=${validation.errors.length}`,
        );
        return {
          status: "FAILED",
          assistantMessage,
          attemptCount: attempt,
          validation,
          failureReason: `校验未通过（已尝试 ${MAX_ATTEMPTS} 次）：${validation.errors
            .slice(0, 5)
            .map((e) => e.message)
            .join("; ")}${validation.errors.length > 5 ? ` 等共 ${validation.errors.length} 个错误` : ""}`,
        };
      }
    }

    return {
      status: "FAILED",
      assistantMessage: lastAssistantMessage,
      attemptCount: MAX_ATTEMPTS,
      validation: lastValidation,
      failureReason: "达到最大尝试次数",
    };
  }

  /**
   * 执行带渐进式信息披露的初始生成流程。
   *
   * 模型可按需请求 Skill 内容或组件详情，Runtime 披露后进入下一轮生成。
   * 达到披露轮数上限后会强制要求模型输出最终结果，避免一直停留在请求信息阶段。
   *
   * @param context - 当前 Agent 运行上下文，包含用户输入、已启用 Skill 与组件目录信息。
   * @param attempt - 外层生成/修复尝试序号，用于日志与工具调用记录。
   * @param disclosedComponents - 已披露组件集合，用于避免重复注入组件详情。
   * @param disclosedSkills - 已披露 Skill 集合，用于避免重复注入 Skill 正文。
   * @param disclosedSkillReferences - 已披露 Skill Reference 集合，用于避免重复注入参考资料。
   * @param initialComponentDetails - 进入本流程前已累积的组件详情文本。
   * @param initialSkillDetails - 进入本流程前已累积的 Skill 正文文本。
   * @param initialSkillReferenceDetails - 进入本流程前已累积的 Skill Reference 文本。
   * @param addUsage - Token 用量累加回调。
   * @param onToolCall - 工具调用记录回调。
   * @returns 最后一轮模型响应，以及本轮累积后的披露文本。
   */
  private async generateWithProgressiveDisclosure(
    context: AgentContext,
    attempt: number,
    disclosedComponents: Set<string>,
    disclosedSkills: Set<string>,
    disclosedSkillReferences: Set<string>,
    initialComponentDetails: string,
    initialSkillDetails: string,
    initialSkillReferenceDetails: string,
    addUsage: (usage?: TokenUsage) => void,
    onToolCall?: (record: ToolCallRecord) => void,
  ): Promise<{
    modelResponse: ModelResponse;
    componentDetails: string;
    skillDetails: string;
    skillReferenceDetails: string;
  }> {
    let componentDetails = initialComponentDetails;
    let skillDetails = initialSkillDetails;
    let skillReferenceDetails = initialSkillReferenceDetails;
    let lastResponse: ModelResponse | undefined;

    for (let round = 1; round <= MAX_DISCLOSURE_ROUNDS + 1; round++) {
      const forceFinalOutput = round > MAX_DISCLOSURE_ROUNDS;
      const { systemPrompt, userPrompt } = this.promptComposer.composeInitial(
        context,
        {
          componentDetails,
          skillDetails,
          skillReferenceDetails,
          forceFinalOutput,
        },
      );

      logger.info(
        forceFinalOutput
          ? `调用模型 → attempt=${attempt}/${MAX_ATTEMPTS}, 强制最终输出`
          : `调用模型 → attempt=${attempt}/${MAX_ATTEMPTS}, 渐进披露轮=${round}/${MAX_DISCLOSURE_ROUNDS}`,
      );

      lastResponse = await this.modelClient.generate([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]);
      addUsage(lastResponse.usage);
      logger.debug(
        `模型回复 → attempt=${attempt}/${MAX_ATTEMPTS}, round=${round}, 长度=${lastResponse.content.length}\n${truncate(lastResponse.content, 2000)}`,
      );

      if (forceFinalOutput) {
        break;
      }

      const skillRequestResult = parseSkillInfoRequest(lastResponse.content);
      const skillReferenceRequestResult = parseSkillReferenceRequest(lastResponse.content);
      const componentRequestResult = parseComponentInfoRequest(lastResponse.content);
      if (
        !skillRequestResult.ok &&
        !skillReferenceRequestResult.ok &&
        !componentRequestResult.ok
      ) {
        break;
      }

      if (skillRequestResult.ok) {
        const result = this.discloseSkills(
          context,
          skillRequestResult.request.skills,
          disclosedSkills,
          skillRequestResult.request.reason,
        );
        if (result.feedback.length > 0) {
          skillDetails = [skillDetails, ...result.feedback]
            .filter((part) => part.trim().length > 0)
            .join("\n\n");
        }
        for (const skillId of result.disclosedSkillIds) {
          disclosedSkills.add(skillId);
        }
        onToolCall?.(result.toolCall(attempt));
        logger.info(
          `Skill 内容披露 → disclosed=[${result.disclosedSkills.map((s) => s.name).join(", ")}], skipped=[${result.skippedSkills.join(", ")}]`,
        );
      }

      if (skillReferenceRequestResult.ok) {
        const result = this.discloseSkillReferences(
          context,
          skillReferenceRequestResult.request.skill,
          skillReferenceRequestResult.request.references,
          disclosedSkillReferences,
          skillReferenceRequestResult.request.reason,
        );
        if (result.feedback.length > 0) {
          skillReferenceDetails = [skillReferenceDetails, ...result.feedback]
            .filter((part) => part.trim().length > 0)
            .join("\n\n");
        }
        for (const referenceKey of result.disclosedReferenceKeys) {
          disclosedSkillReferences.add(referenceKey);
        }
        onToolCall?.(result.toolCall(attempt));
        logger.info(
          `Skill Reference 内容披露 → disclosed=[${result.disclosedReferences.map((r) => `${r.skillName}/${r.title}`).join(", ")}], skipped=[${result.skippedReferences.join(", ")}]`,
        );
      }

      if (componentRequestResult.ok) {
        const result = this.discloseComponents(
          componentRequestResult.request.components,
          disclosedComponents,
        );
        if (result.feedback.length > 0) {
          componentDetails = [componentDetails, ...result.feedback]
            .filter((part) => part.trim().length > 0)
            .join("\n\n");
        }
        for (const componentName of result.disclosedComponents) {
          disclosedComponents.add(componentName);
        }
        onToolCall?.(result.toolCall(attempt));
        logger.info(
          `组件详情披露 → disclosed=[${result.disclosedComponents.join(", ")}], skipped=[${result.skippedComponents.join(", ")}]`,
        );
      }
    }

    if (!lastResponse) {
      throw new Error("模型未返回任何内容");
    }

    return {
      modelResponse: lastResponse,
      componentDetails,
      skillDetails,
      skillReferenceDetails,
    };
  }

  /**
   * 按需披露 Skill 完整内容。
   *
   * 会按 Skill id 或 name 匹配启用列表，并把本次新增披露内容格式化为可追加到 Prompt 的反馈文本。
   *
   * @param context - 当前 Agent 运行上下文。
   * @param skills - 模型请求披露的 Skill id 或 name 列表。
   * @param disclosedSkills - 已披露 Skill id 集合，调用成功后由外层更新。
   * @param reason - 模型说明的请求原因，用于工具调用记录。
   * @returns 披露结果、反馈文本和可延迟生成的工具调用记录。
   */
  private discloseSkills(
    context: AgentContext,
    skills: string[],
    disclosedSkills: Set<string>,
    reason?: string,
  ): {
    requestedSkills: string[];
    disclosedSkills: Array<{ id: string; name: string }>;
    disclosedSkillIds: string[];
    alreadyDisclosedSkills: string[];
    skippedSkills: string[];
    feedback: string[];
    toolCall: (attempt: number) => ToolCallRecord;
  } {
    const disclosureStartTime = Date.now();
    const requestedSkills = Array.from(new Set(skills));
    const disclosedNow: Array<{ id: string; name: string; content: string }> = [];
    const alreadyDisclosedSkills: string[] = [];
    const skippedSkills: string[] = [];

    for (const requested of requestedSkills) {
      const matched =
        context.enabledSkillList.find((skill) => skill.id === requested) ??
        context.enabledSkillList.find((skill) => skill.name === requested);

      if (!matched) {
        skippedSkills.push(requested);
        continue;
      }
      if (disclosedSkills.has(matched.id)) {
        alreadyDisclosedSkills.push(matched.name);
        continue;
      }
      disclosedNow.push({
        id: matched.id,
        name: matched.name,
        content: matched.content,
      });
    }

    const feedback: string[] = [];
    for (const skill of disclosedNow) {
      feedback.push(
        [`### Skill: ${skill.name}`, `id: ${skill.id}`, "", skill.content].join(
          "\n",
        ),
      );
    }
    if (skippedSkills.length > 0) {
      feedback.push(
        [
          "### Skill 内容请求反馈",
          `以下 Skill 未启用或不存在，不能使用：${skippedSkills.join("、")}`,
        ].join("\n"),
      );
    }
    if (alreadyDisclosedSkills.length > 0) {
      feedback.push(
        [
          "### 已披露 Skill 提醒",
          `以下 Skill 内容已经提供过，不会重复注入：${alreadyDisclosedSkills.join("、")}`,
        ].join("\n"),
      );
    }

    const disclosedSkillSummaries = disclosedNow.map((skill) => ({
      id: skill.id,
      name: skill.name,
    }));

    return {
      requestedSkills,
      disclosedSkills: disclosedSkillSummaries,
      disclosedSkillIds: disclosedNow.map((skill) => skill.id),
      alreadyDisclosedSkills,
      skippedSkills,
      feedback,
      toolCall: (attemptIndex: number): ToolCallRecord => ({
        toolName: "getSkillContent",
        status: disclosedNow.length > 0 ? "succeeded" : "failed",
        attemptIndex,
        phase: "GENERATE_DRAFT",
        inputSummary: {
          requestedSkills,
          alreadyDisclosedSkills,
          skippedSkills,
          ...(reason ? { reason } : {}),
        },
        output: {
          disclosedSkills: disclosedSkillSummaries,
        },
        durationMs: Date.now() - disclosureStartTime,
        ...(disclosedNow.length === 0
          ? { errorMessage: "没有新增可披露 Skill 内容" }
          : {}),
      }),
    };
  }

  /**
   * 按需披露 Skill Reference 完整内容。
   *
   * 支持按 Skill id 或 name 定位 Skill，并按 Reference id、title 或 "*" 匹配参考资料。
   *
   * @param context - 当前 Agent 运行上下文。
   * @param skillIdOrName - 模型请求的 Skill id 或 name。
   * @param references - 模型请求披露的 Reference id、title 或 "*"。
   * @param disclosedSkillReferences - 已披露 Reference 集合，键格式为 "skillId:referenceId"。
   * @param reason - 模型说明的请求原因，用于工具调用记录。
   * @returns 披露结果、反馈文本和可延迟生成的工具调用记录。
   */
  private discloseSkillReferences(
    context: AgentContext,
    skillIdOrName: string,
    references: string[],
    disclosedSkillReferences: Set<string>,
    reason?: string,
  ): {
    requestedSkill: string;
    requestedReferences: string[];
    disclosedReferences: Array<{ skillId: string; skillName: string; id: string; title: string }>;
    disclosedReferenceKeys: string[];
    alreadyDisclosedReferences: string[];
    skippedReferences: string[];
    feedback: string[];
    toolCall: (attempt: number) => ToolCallRecord;
  } {
    const disclosureStartTime = Date.now();
    const requestedReferences = Array.from(new Set(references));
    const matchedSkill =
      context.enabledSkillList.find((skill) => skill.id === skillIdOrName) ??
      context.enabledSkillList.find((skill) => skill.name === skillIdOrName);

    const disclosedNow: Array<{
      skillId: string;
      skillName: string;
      id: string;
      title: string;
      content: string;
    }> = [];
    const alreadyDisclosedReferences: string[] = [];
    const skippedReferences: string[] = [];

    if (!matchedSkill) {
      skippedReferences.push(...requestedReferences);
    } else {
      const availableReferences = matchedSkill.references ?? [];
      const shouldDiscloseAll = requestedReferences.includes("*");
      const candidates = shouldDiscloseAll
        ? availableReferences
        : requestedReferences
            .map(
              (requested) =>
                availableReferences.find((ref) => ref.id === requested) ??
                availableReferences.find((ref) => ref.title === requested),
            )
            .filter((ref): ref is NonNullable<typeof ref> => !!ref);

      if (!shouldDiscloseAll) {
        for (const requested of requestedReferences) {
          const matched =
            availableReferences.find((ref) => ref.id === requested) ??
            availableReferences.find((ref) => ref.title === requested);
          if (!matched) {
            skippedReferences.push(requested);
          }
        }
      }

      for (const reference of candidates) {
        const referenceKey = `${matchedSkill.id}:${reference.id}`;
        if (disclosedSkillReferences.has(referenceKey)) {
          alreadyDisclosedReferences.push(reference.title);
          continue;
        }
        disclosedNow.push({
          skillId: matchedSkill.id,
          skillName: matchedSkill.name,
          id: reference.id,
          title: reference.title,
          content: reference.content,
        });
      }
    }

    const feedback: string[] = [];
    for (const reference of disclosedNow) {
      feedback.push(
        [
          `### Skill Reference: ${reference.skillName} / ${reference.title}`,
          `skillId: ${reference.skillId}`,
          `referenceId: ${reference.id}`,
          "",
          reference.content,
        ].join("\n"),
      );
    }
    if (skippedReferences.length > 0) {
      feedback.push(
        [
          "### Skill Reference 内容请求反馈",
          `以下 Skill Reference 未启用或不存在，不能使用：${skippedReferences.join("、")}`,
        ].join("\n"),
      );
    }
    if (alreadyDisclosedReferences.length > 0) {
      feedback.push(
        [
          "### 已披露 Skill Reference 提醒",
          `以下 Skill Reference 内容已经提供过，不会重复注入：${alreadyDisclosedReferences.join("、")}`,
        ].join("\n"),
      );
    }

    const disclosedReferenceSummaries = disclosedNow.map((reference) => ({
      skillId: reference.skillId,
      skillName: reference.skillName,
      id: reference.id,
      title: reference.title,
    }));

    return {
      requestedSkill: skillIdOrName,
      requestedReferences,
      disclosedReferences: disclosedReferenceSummaries,
      disclosedReferenceKeys: disclosedNow.map(
        (reference) => `${reference.skillId}:${reference.id}`,
      ),
      alreadyDisclosedReferences,
      skippedReferences,
      feedback,
      toolCall: (attemptIndex: number): ToolCallRecord => ({
        toolName: "getSkillReferenceContent",
        status: disclosedNow.length > 0 ? "succeeded" : "failed",
        attemptIndex,
        phase: "GENERATE_DRAFT",
        inputSummary: {
          skill: skillIdOrName,
          requestedReferences,
          alreadyDisclosedReferences,
          skippedReferences,
          ...(reason ? { reason } : {}),
        },
        output: {
          disclosedReferences: disclosedReferenceSummaries,
        },
        durationMs: Date.now() - disclosureStartTime,
        ...(disclosedNow.length === 0
          ? { errorMessage: "没有新增可披露 Skill Reference 内容" }
          : {}),
      }),
    };
  }

  /**
   * 按需披露 Basic Catalog 组件详情。
   *
   * 会先过滤已披露或不存在的组件，只把本次新增组件详情注入后续 Prompt。
   *
   * @param components - 模型请求披露的组件名称列表。
   * @param disclosedComponents - 已披露组件名称集合，调用成功后由外层更新。
   * @returns 披露结果、反馈文本和可延迟生成的工具调用记录。
   */
  private discloseComponents(
    components: string[],
    disclosedComponents: Set<string>,
  ): {
    requestedComponents: string[];
    disclosedComponents: string[];
    alreadyDisclosedComponents: string[];
    skippedComponents: string[];
    feedback: string[];
    toolCall: (attempt: number) => ToolCallRecord;
  } {
    const disclosureStartTime = Date.now();
    const requestedComponents = Array.from(new Set(components));
    const disclosedNow: string[] = [];
    const alreadyDisclosedComponents: string[] = [];
    const skippedComponents: string[] = [];

    for (const componentName of requestedComponents) {
      if (disclosedComponents.has(componentName)) {
        alreadyDisclosedComponents.push(componentName);
        continue;
      }
      if (!getComponentDef(componentName)) {
        skippedComponents.push(componentName);
        continue;
      }
      disclosedNow.push(componentName);
    }

    const detailText = formatCatalogComponentDetails(disclosedNow);
    const feedback: string[] = [];
    if (detailText) {
      feedback.push(detailText);
    }
    if (skippedComponents.length > 0) {
      feedback.push(
        [
          "### 组件详情请求反馈",
          `以下组件不在 Basic Catalog 中，不能使用：${skippedComponents.join("、")}`,
        ].join("\n"),
      );
    }
    if (alreadyDisclosedComponents.length > 0) {
      feedback.push(
        [
          "### 已披露组件提醒",
          `以下组件详情已经提供过，不会重复注入：${alreadyDisclosedComponents.join("、")}`,
        ].join("\n"),
      );
    }

    return {
      requestedComponents,
      disclosedComponents: disclosedNow,
      alreadyDisclosedComponents,
      skippedComponents,
      feedback,
      toolCall: (attemptIndex: number): ToolCallRecord => ({
        toolName: "getCatalogComponentDetails",
        status: disclosedNow.length > 0 ? "succeeded" : "failed",
        attemptIndex,
        phase: "GENERATE_DRAFT",
        inputSummary: {
          requestedComponents,
          skippedComponents,
          alreadyDisclosedComponents,
        },
        output: {
          disclosedComponents: disclosedNow,
        },
        durationMs: Date.now() - disclosureStartTime,
        ...(disclosedNow.length === 0
          ? { errorMessage: "没有新增可披露组件详情" }
          : {}),
      }),
    };
  }
}
