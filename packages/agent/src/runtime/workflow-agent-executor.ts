/**
 * ReAct WorkflowAgentExecutor。
 *
 * 职责：
 * - 运行 ReAct while 循环：模型调用 → 动作解析 → 工具执行 → 观察累积 → 草稿修复。
 * - 对 final_draft 做归一化与校验（finalKind 匹配 + 结构校验 + candidate 强制 validateA2UI）。
 * - 通过 onTraceEvent 回调输出 trace 事件，并在内存累积 trace summary。
 *
 * 不负责：读写数据库、发送 SSE、保存 artifact、更新 WorkflowStep、提交 A2UI。
 *
 * 引用：
 * - react-action-parser、react-prompt-composer、tool-registry、model-client。
 * 被引用：
 * - create-agent-runtime / backend（通过 runWorkflowTask 迁移调用）。
 */

import type {
  A2UIServerMessage,
  AgentRunTraceSummaryDto,
  AgentTraceEventDto,
  JsonObject,
} from "@a2ui-platform/shared";
import { logger } from "../logger.js";
import { ModelClient, type TokenUsage } from "../model/model-client.js";
import { parseAgentAction } from "./react-action-parser.js";
import { ReactPromptComposer } from "./react-prompt-composer.js";
import {
  ToolRegistry,
  getMissingPlanHeadings,
  normalizeClarificationForm,
  normalizeDecisionForm,
} from "./tool-registry.js";
import type {
  AgentDraft,
  AgentFinalArtifact,
  AgentFinalKind,
  AgentObservation,
  ReactAgentRunInput,
  ReactAgentRunResult,
} from "./react-agent-types.js";

/** trace 事件中由 executor 依据 input 补全的字段。 */
type TraceEventPartial = Omit<
  AgentTraceEventDto,
  "sessionId" | "agentRunId" | "workflowId" | "workflowStepId" | "createdAt"
>;

/** WorkflowAgentExecutor 的注入依赖。 */
export interface WorkflowAgentExecutorDependencies {
  modelClient: ModelClient;
  promptComposer: ReactPromptComposer;
  toolRegistry: ToolRegistry;
  /** 每轮迭代产生的 trace 事件回调，由 backend 桥接为 SSE 与 trace summary。 */
  onTraceEvent?: (event: AgentTraceEventDto) => void;
}

/** ReAct 循环的执行器。 */
export class WorkflowAgentExecutor {
  constructor(private readonly deps: WorkflowAgentExecutorDependencies) {}

  /**
   * 执行一次受控的 ReAct 运行，返回 completed 或 failed。
   *
   * @param input - 运行输入（goal / facts / capabilities / limits / currentDraft）。
   * @returns 最终产物或失败结果，含 trace summary 与 token 用量。
   */
  async execute(input: ReactAgentRunInput): Promise<ReactAgentRunResult> {
    const observations: AgentObservation[] = [];
    let currentDraft: AgentDraft | null = input.currentDraft ?? null;
    let totalUsage: JsonObject | undefined;
    const iterations: AgentRunTraceSummaryDto["iterations"] = [];

    /** 补全 session/run 关联与时间戳后发出完整 trace 事件。 */
    const emit = (partial: TraceEventPartial): void => {
      this.deps.onTraceEvent?.({
        ...partial,
        sessionId: input.sessionId,
        agentRunId: input.runId,
        workflowId: input.workflowId,
        workflowStepId: input.workflowStepId,
        createdAt: new Date().toISOString(),
      });
    };

    for (let iteration = 1; iteration <= input.limits.maxIterations; iteration++) {
      const iterationStart = Date.now();
      const record: AgentRunTraceSummaryDto["iterations"][number] = {
        index: iteration,
        durationMs: 0,
      };

      emit({ iterationIndex: iteration, type: "iteration_started" });
      logger.info(
        `ReAct 迭代 → iteration=${iteration}/${input.limits.maxIterations}, task=${input.goal.task}`,
      );

      const { systemPrompt, userPrompt } = this.deps.promptComposer.compose(
        input,
        observations,
        currentDraft,
      );

      let modelResponse;
      try {
        modelResponse = await this.deps.modelClient.generate(
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          {
            sessionId: input.sessionId,
            agentRunId: input.runId,
            workflowId: input.workflowId,
            workflowStepId: input.workflowStepId,
            task: input.goal.task,
            phase: "workflow_task",
            attempt: iteration,
          },
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const observation: AgentObservation = {
          kind: "system",
          message: `模型调用失败：${message}`,
        };
        observations.push(observation);
        record.observationSummary = toObservationSummary(observation);
        emit({
          iterationIndex: iteration,
          type: "observation",
          summary: record.observationSummary,
        });
        this.finishIteration(record, iterationStart, iterations);
        logger.warn(`模型调用失败 → iteration=${iteration}, error=${message.slice(0, 120)}`);
        continue;
      }

      totalUsage = addUsage(totalUsage, modelResponse.usage);
      logger.debug(
        `模型回复 → iteration=${iteration}, 长度=${modelResponse.content.length}`,
      );

      const parsed = parseAgentAction(modelResponse.content);

      if (!parsed.ok) {
        const observation: AgentObservation = {
          kind: "parse_error",
          message: parsed.error,
          ...(parsed.details ? { details: parsed.details } : {}),
        };
        observations.push(observation);
        record.observationSummary = toObservationSummary(observation);
        emit({
          iterationIndex: iteration,
          type: "observation",
          summary: record.observationSummary,
        });
        this.finishIteration(record, iterationStart, iterations);
        logger.warn(`解析失败 → iteration=${iteration}, error=${parsed.error.slice(0, 120)}`);
        continue;
      }

      const action = parsed.action;

      record.reasoningSummary = action.reasoningSummary;
      record.actionType = action.type;
      emit({
        iterationIndex: iteration,
        type: "model_action",
        reasoningSummary: action.reasoningSummary,
        actionType: action.type,
        ...(action.type === "tool_call" ? { toolName: action.tool } : {}),
        ...(action.type === "final_draft" ? { finalKind: action.finalKind } : {}),
      });

      if (action.type === "tool_call") {
        record.toolName = action.tool;
        const result = await this.deps.toolRegistry.execute(action.tool, action.arguments);

        emit({
          iterationIndex: iteration,
          type: "tool_call",
          toolName: action.tool,
          reasoningSummary: action.reasoningSummary,
        });

        switch (result.status) {
          case "completed":
          case "failed": {
            // recoverable 失败与 completed 都作为 observation 进入下一轮
            if (result.status === "failed" && !result.recoverable) {
              this.finishIteration(record, iterationStart, iterations);
              logger.warn(
                `工具不可恢复失败 → tool=${action.tool}, reason=${result.observation.message}`,
              );
              return {
                status: "failed",
                failure: {
                  reason: result.observation.message,
                  recoverable: false,
                  ...(result.observation.details
                    ? { details: result.observation.details }
                    : {}),
                },
                trace: { iterations },
                usage: totalUsage,
              };
            }
            observations.push(result.observation);
            record.observationSummary = toObservationSummary(result.observation);
            emit({
              iterationIndex: iteration,
              type: "observation",
              summary: record.observationSummary,
            });
            this.finishIteration(record, iterationStart, iterations);
            logger.info(
              `工具执行 → tool=${action.tool}, status=${result.status}, iteration=${iteration}`,
            );
            continue;
          }
          case "final_artifact": {
            // askClarification / askUserDecision 成功
            record.finalKind = result.artifact.kind;
            this.finishIteration(record, iterationStart, iterations);
            logger.info(
              `工具产出最终产物 → tool=${action.tool}, kind=${result.artifact.kind}`,
            );
            return {
              status: "completed",
              final: result.artifact,
              trace: { iterations },
              usage: totalUsage,
            };
          }
        }
      }

      if (action.type === "final_draft") {
        record.finalKind = action.finalKind;
        const finalization = this.finalizeDraft(action.finalKind, action.draft, input.goal.expectedResult);

        if (!finalization.ok) {
          currentDraft = { finalKind: action.finalKind, draft: action.draft };
          const observation: AgentObservation = {
            kind: "validation_error",
            message: finalization.error,
          };
          observations.push(observation);
          record.finalValidation = { valid: false, error: finalization.error };
          emit({
            iterationIndex: iteration,
            type: "final_validation",
            finalKind: action.finalKind,
            summary: record.finalValidation,
          });
          this.finishIteration(record, iterationStart, iterations);
          logger.warn(`最终校验失败 → iteration=${iteration}, error=${finalization.error.slice(0, 120)}`);
          continue;
        }

        record.finalValidation = { valid: true };
        emit({
          iterationIndex: iteration,
          type: "final_validation",
          finalKind: action.finalKind,
          summary: record.finalValidation,
        });
        this.finishIteration(record, iterationStart, iterations);
        logger.info(`最终产物完成 → kind=${action.finalKind}, iteration=${iteration}`);
        return {
          status: "completed",
          final: finalization.artifact,
          trace: { iterations },
          usage: totalUsage,
        };
      }

      // give_up
      this.finishIteration(record, iterationStart, iterations);
      logger.warn(`Agent 放弃 → iteration=${iteration}, reason=${action.reason}`);
      return {
        status: "failed",
        failure: {
          reason: action.reason,
          recoverable: action.recoverable,
          ...(action.details ? { details: action.details } : {}),
        },
        trace: { iterations },
        usage: totalUsage,
      };
    }

    logger.warn(`达到最大迭代次数 → max=${input.limits.maxIterations}`);
    return {
      status: "failed",
      failure: {
        reason: `达到最大迭代次数 ${input.limits.maxIterations}`,
        recoverable: true,
      },
      trace: { iterations },
      usage: totalUsage,
    };
  }

  /**
   * 校验并归一化 final_draft：先做 finalKind 匹配，再做结构校验，
   * candidate 会强制 validateA2UI。
   */
  private finalizeDraft(
    finalKind: AgentFinalKind,
    draft: JsonObject,
    expectedResult: AgentFinalKind[],
  ): { ok: true; artifact: AgentFinalArtifact } | { ok: false; error: string } {
    try {
      if (!expectedResult.includes(finalKind)) {
        return {
          ok: false,
          error: `finalKind "${finalKind}" 与期望产物种类（${expectedResult.join(" | ")}）不匹配`,
        };
      }

      switch (finalKind) {
        case "clarification_form": {
          const form = normalizeClarificationForm(draft);
          if (typeof form === "string") return { ok: false, error: form };
          return { ok: true, artifact: { kind: "clarification_form", form } };
        }
        case "decision_form": {
          const form = normalizeDecisionForm(draft);
          if (typeof form === "string") return { ok: false, error: form };
          return { ok: true, artifact: { kind: "decision_form", form } };
        }
        case "plan_markdown": {
          const markdown = draft["markdown"];
          if (typeof markdown !== "string" || markdown.trim().length === 0) {
            return { ok: false, error: "plan_markdown 的 draft 缺少非空 markdown" };
          }
          const missing = getMissingPlanHeadings(markdown);
          if (missing.length > 0) {
            return { ok: false, error: `plan_markdown 缺少必要标题：${missing.join("、")}` };
          }
          const decisionInput = draft["decisionForm"];
          if (!decisionInput || typeof decisionInput !== "object" || Array.isArray(decisionInput)) {
            return { ok: false, error: "plan_markdown 必须携带 decisionForm 以进入用户确认" };
          }
          const form = normalizeDecisionForm(decisionInput as Record<string, unknown>);
          if (typeof form === "string") return { ok: false, error: form };
          return { ok: true, artifact: { kind: "plan_markdown", markdown: markdown.trim(), decisionForm: form } };
        }
        case "candidate_a2ui_messages": {
          const messages = draft["messages"];
          if (!Array.isArray(messages)) {
            return { ok: false, error: "candidate_a2ui_messages 的 draft 缺少 messages 数组" };
          }
          const result = this.deps.toolRegistry.validateMessages(
            messages as unknown as A2UIServerMessage[],
          );
          if (!result.valid) {
            const summary = result.errors
              .slice(0, 5)
              .map((e) => `${e.code}: ${e.message}`)
              .join("; ");
            const suffix = result.errors.length > 5 ? ` 等共 ${result.errors.length} 个错误` : "";
            return { ok: false, error: `candidate_a2ui_messages 未通过 validateA2UI：${summary}${suffix}` };
          }
          return {
            ok: true,
            artifact: {
              kind: "candidate_a2ui_messages",
              messages: result.normalizedMessages,
              ...(typeof draft["assistantMessage"] === "string"
                ? { assistantMessage: draft["assistantMessage"] }
                : {}),
            },
          };
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `final_draft 结构校验异常：${message}` };
    }
  }

  private finishIteration(
    record: AgentRunTraceSummaryDto["iterations"][number],
    iterationStart: number,
    iterations: AgentRunTraceSummaryDto["iterations"],
  ): void {
    record.durationMs = Date.now() - iterationStart;
    iterations.push(record);
  }
}

/** 累加 Token 用量到 JsonObject。 */
function addUsage(total: JsonObject | undefined, usage?: TokenUsage): JsonObject | undefined {
  if (!usage) return total;
  return {
    ...(total ?? {}),
    promptTokens: ((total?.["promptTokens"] as number) ?? 0) + usage.promptTokens,
    completionTokens: ((total?.["completionTokens"] as number) ?? 0) + usage.completionTokens,
    totalTokens: ((total?.["totalTokens"] as number) ?? 0) + usage.totalTokens,
  };
}

/** 把 observation 转为可入 trace summary 的摘要（省略可能很大的 details）。 */
function toObservationSummary(obs: AgentObservation): JsonObject {
  return { kind: obs.kind, message: obs.message };
}
