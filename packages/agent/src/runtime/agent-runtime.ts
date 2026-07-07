import type {
  AgentRunInput,
  AgentRunResult,
  ToolCallRecord,
  ValidateA2UIResult,
  A2UIServerMessage,
  JsonObject,
} from "@a2ui-platform/shared";
import { AgentContextBuilder } from "../context/context-builder.js";
import { PromptComposer } from "../prompts/prompt-composer.js";
import { ModelClient } from "../model/model-client.js";
import { parseModelOutput } from "./output-parser.js";
import { validateA2UI } from "../tools/validate-a2ui.js";
import { logger, shortId } from "../logger.js";

// ─── 常量 ──────────────────────────────────────────────────

/** 最大尝试次数：1 次初始 + 2 次修复 */
const MAX_ATTEMPTS = 3;

// ─── AgentRuntime ──────────────────────────────────────────

export class AgentRuntime {
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
   * 执行完整的 Agent 运行流程。
   *
   * @param input Agent 运行输入
   * @param onToolCall 每次工具调用（校验）后的回调，用于实时上报 ToolCallRecord
   * @returns AgentRunResult
   */
  async run(
    input: AgentRunInput,
    onToolCall?: (record: ToolCallRecord) => void,
  ): Promise<AgentRunResult> {
    const sid = shortId(input.sessionId);

    // ── 阶段 PREPARE_CONTEXT ──
    const context = this.contextBuilder.buildContext(input);
    logger.info(
      `准备上下文 → session=${sid}, model=${input.model.name}`,
    );

    let lastAssistantMessage = "";
    let lastA2uiMessages: A2UIServerMessage[] = [];
    let lastValidation: ValidateA2UIResult | undefined;
    let totalTokens: JsonObject | undefined;

    // ── 尝试循环（初始 + 修复） ──
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const isRepair = attempt > 1;

      // ── 阶段 GENERATE_DRAFT（或 REPAIR_DRAFT）──
      const { systemPrompt, userPrompt } = isRepair
        ? this.promptComposer.composeRepair(
            context,
            JSON.stringify({
              assistantMessage: lastAssistantMessage,
              a2uiMessages: lastA2uiMessages,
            }),
            lastValidation?.errors ?? [],
          )
        : this.promptComposer.composeInitial(context);

      logger.info(
        isRepair
          ? `修复模式 → attempt=${attempt}/${MAX_ATTEMPTS}, 上次错误数=${lastValidation?.errors.length ?? 0}`
          : `调用模型 → attempt=${attempt}/${MAX_ATTEMPTS}`,
      );

      let modelResponse;
      try {
        modelResponse = await this.modelClient.generate([
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ]);
      } catch (err) {
        // 模型调用失败 → 如果不是最后一次，继续尝试
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.warn(`模型调用失败 → attempt=${attempt}/${MAX_ATTEMPTS}, error=${errMsg.slice(0, 120)}`);
        if (attempt >= MAX_ATTEMPTS) {
          return {
            status: "FAILED",
            assistantMessage: lastAssistantMessage || "模型调用失败",
            attemptCount: attempt,
            failureReason: `模型调用失败：${err instanceof Error ? err.message : String(err)}`,
          };
        }
        // 继续下次尝试
        lastAssistantMessage = `模型调用失败：${err instanceof Error ? err.message : String(err)}`;
        lastA2uiMessages = [];
        continue;
      }

      // 累积 token 用量
      if (modelResponse.usage) {
        totalTokens = {
          ...(totalTokens ?? {}),
          promptTokens:
            ((totalTokens?.["promptTokens"] as number) ?? 0) +
            modelResponse.usage.promptTokens,
          completionTokens:
            ((totalTokens?.["completionTokens"] as number) ?? 0) +
            modelResponse.usage.completionTokens,
          totalTokens:
            ((totalTokens?.["totalTokens"] as number) ?? 0) +
            modelResponse.usage.totalTokens,
        };
      }

      // 解析模型输出
      const parseResult = parseModelOutput(modelResponse.content);

      if (!parseResult.ok) {
        logger.warn(`解析失败 → attempt=${attempt}/${MAX_ATTEMPTS}, error=${parseResult.error.slice(0, 120)}`);
        // 解析失败 → 如果不是最后一次，继续尝试
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

      // ── 阶段 VALIDATE_DRAFT ──
      const validateStartTime = Date.now();
      const validation = validateA2UI({
        messages: a2uiMessages,
        catalogId: input.catalogId,
        currentSnapshot: input.currentSnapshot,
      });
      const validateDuration = Date.now() - validateStartTime;
      lastValidation = validation;

      logger.info(
        `A2UI 校验 → ${validation.valid ? "✅ 通过" : "❌ 未通过"}, errors=${validation.errors.length}, warnings=${validation.warnings.length}, 耗时=${validateDuration}ms`,
      );

      // 记录 ToolCallRecord 并回调
      const toolCallRecord: ToolCallRecord = {
        toolName: "validateA2UI",
        status: validation.valid ? "succeeded" : "failed",
        attemptIndex: attempt,
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

      // 校验通过
      if (validation.valid) {
        // 有 A2UI 消息 → COMMITTED
        if (a2uiMessages.length > 0) {
          logger.info(`Agent 完成 → ✅ COMMITTED, attempts=${attempt}, messages=${a2uiMessages.length}, tokens=${totalTokens?.["totalTokens"] ?? "?"}`);
          return {
            status: "COMMITTED",
            assistantMessage,
            a2uiMessages,
            attemptCount: attempt,
            validation,
            tokenUsage: totalTokens,
          };
        }

        // 无 A2UI 消息 → TEXT_ONLY
        logger.info(`Agent 完成 → TEXT_ONLY, attempts=${attempt}`);
        return {
          status: "TEXT_ONLY",
          assistantMessage,
          a2uiMessages: [],
          attemptCount: attempt,
          tokenUsage: totalTokens,
        };
      }

      // 校验未通过，且已是最后一次尝试
      if (attempt >= MAX_ATTEMPTS) {
        logger.warn(`Agent 完成 → ❌ FAILED, attempts=${MAX_ATTEMPTS}, errors=${validation.errors.length}`);
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

      // 继续修复循环
    }

    // 不应到达这里（循环内必定 return），但 TypeScript 要求有返回值
    return {
      status: "FAILED",
      assistantMessage: lastAssistantMessage,
      attemptCount: MAX_ATTEMPTS,
      validation: lastValidation,
      failureReason: "达到最大尝试次数",
    };
  }
}
