import type {
  AgentRunInput,
  AgentRunResult,
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
import { validateA2UI } from "../tools/validate-a2ui.js";
import {
  formatCatalogComponentDetails,
  getComponentDef,
} from "../tools/catalog-schema.js";
import { logger, shortId } from "../logger.js";

const MAX_ATTEMPTS = 3;
const MAX_COMPONENT_DISCLOSURE_ROUNDS = 3;

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

  async run(
    input: AgentRunInput,
    onToolCall?: (record: ToolCallRecord) => void,
  ): Promise<AgentRunResult> {
    const sid = shortId(input.sessionId);
    const context = this.contextBuilder.buildContext(input);
    logger.info(`准备上下文 → session=${sid}, model=${input.model.name}`);

    let lastAssistantMessage = "";
    let lastA2uiMessages: A2UIServerMessage[] = [];
    let lastValidation: ValidateA2UIResult | undefined;
    let totalTokens: JsonObject | undefined;
    let componentDetails = "";
    const disclosedComponents = new Set<string>();

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
          const { systemPrompt, userPrompt } = this.promptComposer.composeRepair(
            context,
            JSON.stringify({
              assistantMessage: lastAssistantMessage,
              a2uiMessages: lastA2uiMessages,
            }),
            lastValidation?.errors ?? [],
            { componentDetails },
          );

          logger.info(
            `修复模式 → attempt=${attempt}/${MAX_ATTEMPTS}, 上次错误数=${lastValidation?.errors.length ?? 0}`,
          );

          modelResponse = await this.modelClient.generate([
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ]);
          addUsage(modelResponse.usage);
        } else {
          const disclosureResult =
            await this.generateWithComponentDisclosure(
              context,
              attempt,
              disclosedComponents,
              componentDetails,
              addUsage,
              onToolCall,
            );
          modelResponse = disclosureResult.modelResponse;
          componentDetails = disclosureResult.componentDetails;
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

        logger.info(`Agent 完成 → TEXT_ONLY, attempts=${attempt}`);
        return {
          status: "TEXT_ONLY",
          assistantMessage,
          a2uiMessages: [],
          attemptCount: attempt,
          tokenUsage: totalTokens,
        };
      }

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

  private async generateWithComponentDisclosure(
    context: AgentContext,
    attempt: number,
    disclosedComponents: Set<string>,
    initialComponentDetails: string,
    addUsage: (usage?: TokenUsage) => void,
    onToolCall?: (record: ToolCallRecord) => void,
  ): Promise<{ modelResponse: ModelResponse; componentDetails: string }> {
    let componentDetails = initialComponentDetails;
    let lastResponse: ModelResponse | undefined;

    for (
      let round = 1;
      round <= MAX_COMPONENT_DISCLOSURE_ROUNDS + 1;
      round++
    ) {
      const forceFinalOutput = round > MAX_COMPONENT_DISCLOSURE_ROUNDS;
      const { systemPrompt, userPrompt } = this.promptComposer.composeInitial(
        context,
        {
          componentDetails,
          forceFinalOutput,
        },
      );

      logger.info(
        forceFinalOutput
          ? `调用模型 → attempt=${attempt}/${MAX_ATTEMPTS}, 强制最终输出`
          : `调用模型 → attempt=${attempt}/${MAX_ATTEMPTS}, 组件披露轮=${round}/${MAX_COMPONENT_DISCLOSURE_ROUNDS}`,
      );

      lastResponse = await this.modelClient.generate([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]);
      addUsage(lastResponse.usage);

      if (forceFinalOutput) {
        break;
      }

      const requestResult = parseComponentInfoRequest(lastResponse.content);
      if (!requestResult.ok) {
        break;
      }

      const disclosureStartTime = Date.now();
      const requestedComponents = Array.from(
        new Set(requestResult.request.components),
      );
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

      if (feedback.length > 0) {
        componentDetails = [componentDetails, ...feedback]
          .filter((part) => part.trim().length > 0)
          .join("\n\n");
      }

      for (const componentName of disclosedNow) {
        disclosedComponents.add(componentName);
      }

      const durationMs = Date.now() - disclosureStartTime;
      onToolCall?.({
        toolName: "getCatalogComponentDetails",
        status: disclosedNow.length > 0 ? "succeeded" : "failed",
        attemptIndex: attempt,
        inputSummary: {
          requestedComponents,
          skippedComponents,
          alreadyDisclosedComponents,
        },
        output: {
          disclosedComponents: disclosedNow,
        },
        durationMs,
        ...(disclosedNow.length === 0
          ? { errorMessage: "没有新增可披露组件详情" }
          : {}),
      });

      logger.info(
        `组件详情披露 → requested=${requestedComponents.length}, disclosed=${disclosedNow.length}, skipped=${skippedComponents.length}, already=${alreadyDisclosedComponents.length}`,
      );
    }

    if (!lastResponse) {
      throw new Error("模型未返回任何内容");
    }

    return { modelResponse: lastResponse, componentDetails };
  }
}
