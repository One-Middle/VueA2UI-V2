/**
 * Agent Run 编排服务。
 *
 * 职责：
 * - 接收用户消息后启动 Agent Run，调用 Agent Runtime 执行生成/校验循环
 * - 将 Run 结果（COMMITTED / TEXT_ONLY / FAILED）持久化到数据库并推送 SSE 事件
 * - 管理 Run 生命周期中的 tool call 记录和流式进度推送
 * - 提供 Run 列表查询和详情查询
 *
 * 引用：
 * - agent-run / a2ui-event / message / file / surface-snapshot / tool-call 各 repository
 * - snapshot.service / skill-resolver.service / stream.service
 * - @a2ui-platform/agent（createAgentRuntime）
 * 被引用：
 * - message.service（sendMessage 触发 Run）、routes/agent-runs（HTTP 路由）
 * 注意：
 * - commitRun 必须在 Prisma 事务中执行，确保 a2uiEvent → snapshot → session 更新的原子性
 * - executeRun 使用 setImmediate 异步执行，不阻塞消息发送的 HTTP 响应
 */

import type {
  A2UIEventDto,
  A2UIServerMessage,
  AgentRunDetailResponse,
  AgentRunDto,
  AgentRunInput,
  AgentRunResult,
  AgentRunTraceSummaryDto,
  IAgentRuntime,
  JsonObject,
  MessageDto,
  SurfaceSnapshotDto,
  ToolCallRecord,
} from "@a2ui-platform/shared";
import { createAgentRuntime } from "@a2ui-platform/agent";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { logger } from "../logger.js";
import { a2uiEventRepository } from "../repositories/a2ui-event.repository.js";
import { agentRunRepository } from "../repositories/agent-run.repository.js";
import { fileRepository } from "../repositories/file.repository.js";
import { messageRepository } from "../repositories/message.repository.js";
import { sessionRepository } from "../repositories/session.repository.js";
import { surfaceSnapshotRepository } from "../repositories/surface-snapshot.repository.js";
import { toolCallRepository } from "../repositories/tool-call.repository.js";
import { notFound } from "../utils/errors.js";
import { config } from "../config.js";
import { snapshotService } from "./snapshot.service.js";
import { skillResolverService } from "./skill-resolver.service.js";
import { streamService } from "./stream.service.js";
import { workflowService } from "./workflow.service.js";

/**
 * 截取 ID 前 8 位用于日志展示，避免完整 UUID 占满日志宽度。
 *
 * @param id - 完整实体 ID（UUID）
 * @returns 前 8 位字符
 */
const SID = (id: string) => id.slice(0, 8);

/**
 * 将 Prisma AgentRun 实体转换为 AgentRunDto。
 *
 * 注意：所有 Date 字段转换为 ISO 8601 字符串，枚举字段通过类型断言保持与 DTO 一致。
 *
 * @param r - Prisma 查询返回的 AgentRun 实体（可能为 null）
 * @returns 转换后的 DTO，实体不存在时返回 null
 */
function toAgentRunDto(r: Awaited<ReturnType<typeof agentRunRepository.findById>>): AgentRunDto | null {
  if (!r) return null;
  return {
    id: r.id,
    sessionId: r.sessionId,
    workflowId: r.workflowId,
    workflowStepId: r.workflowStepId,
    triggerMessageId: r.triggerMessageId,
    status: r.status as AgentRunDto["status"],
    intent: r.intent,
    modelProvider: r.modelProvider,
    modelName: r.modelName,
    attemptCount: r.attemptCount,
    maxAttempts: r.maxAttempts,
    inputSnapshotId: r.inputSnapshotId,
    outputSnapshotId: r.outputSnapshotId,
    assistantMessageId: r.assistantMessageId,
    failureReason: r.failureReason,
    validationSummary: r.validationSummary as AgentRunDto["validationSummary"],
    tokenUsage: r.tokenUsage as AgentRunDto["tokenUsage"],
    startedAt: r.startedAt?.toISOString() ?? null,
    completedAt: r.completedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

/**
 * 将未知错误标准化为可读的错误消息字符串。
 *
 * @param err - catch 块捕获的未知错误
 * @returns 标准化后的错误文字描述
 */
function toAgentRunError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * 通过工厂函数创建 Agent Runtime 实例。
 *
 * 各连接参数从 config.openai 读取，与具体模型客户端解耦。
 *
 * @returns 已创建的 IAgentRuntime 实例
 */
function buildAgentRuntime(): IAgentRuntime {
  return createAgentRuntime({
    baseUrl: config.openai.baseUrl,
    apiKey: config.openai.apiKey,
    model: config.openai.model,
    temperature: config.openai.temperature,
    maxTokens: config.openai.maxTokens,
    timeoutMs: config.openai.timeoutMs,
  });
}

async function buildAgentInput(sessionId: string, userMessage: string): Promise<AgentRunInput> {
  const currentSnapshot = await surfaceSnapshotRepository.findCurrentBySessionId(sessionId);
  const recentMessages = await messageRepository.findBySessionId(sessionId, { limit: 20 });
  const uploadedFiles = await fileRepository.findReadyWithContentBySessionId(sessionId);
  const enabledSkills = await skillResolverService.resolveForSession(sessionId);

  return {
    sessionId,
    userMessage,
    recentMessages: recentMessages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    uploadedFiles: uploadedFiles.map((file) => ({
      id: file.id,
      originalName: file.originalName,
      content: file.content,
    })),
    enabledSkills,
    currentSnapshot: currentSnapshot ? (currentSnapshot.snapshot as AgentRunInput["currentSnapshot"]) : null,
    catalogId: config.catalog.id,
    catalogVersion: config.catalog.version,
    rendererVersion: config.catalog.rendererVersion,
    model: {
      provider: "openai-compatible",
      name: config.openai.model,
      config: {},
    },
  };
}

/**
 * 记录 Agent Runtime 中单次工具调用的执行结果并推送到 SSE。
 *
 * 每次工具调用（如 validateA2UI）完成后调用，将记录持久化到 tool_call 表，
 * 同时通过 SSE 将工具调用进度推送给前端展示。
 *
 * @param agentRunId - 当前 Agent Run ID
 * @param sessionId - 当前会话 ID
 * @param record - Agent Runtime 回调传入的工具调用记录
 */
async function recordRuntimeToolCall(
  agentRunId: string,
  sessionId: string,
  record: ToolCallRecord,
): Promise<void> {
  const toolCall = await toolCallRepository.create({
    agentRun: { connect: { id: agentRunId } },
    sessionId,
    toolName: record.toolName,
    status: record.status,
    attemptIndex: record.attemptIndex,
    inputSummary: record.inputSummary as Prisma.InputJsonValue,
    output: (record.output ?? {}) as Prisma.InputJsonValue,
    errorMessage: record.errorMessage ?? null,
    durationMs: record.durationMs ?? null,
  });

  streamService.send(sessionId, {
    event: "agent_run_attempt",
    data: {
      sessionId,
      agentRunId,
      attemptIndex: record.attemptIndex,
      phase: record.phase ?? "GENERATE_DRAFT",
      toolCall: {
        id: toolCall.id,
        agentRunId: toolCall.agentRunId,
        sessionId: toolCall.sessionId,
        toolName: toolCall.toolName,
        status: toolCall.status as "running" | "succeeded" | "failed",
        attemptIndex: toolCall.attemptIndex,
        inputSummary: toolCall.inputSummary as JsonObject,
        output: toolCall.output as JsonObject | null,
        errorMessage: toolCall.errorMessage,
        durationMs: toolCall.durationMs,
        createdAt: toolCall.createdAt.toISOString(),
      },
    },
  });
}

export const agentRunService = {
  /**
   * 为 workflow candidate 生成创建并启动一条 Agent run。
   *
   * @param input - workflow candidate run 启动参数
   * @returns 新建的 Agent run 摘要
   */
  async startWorkflowCandidateRun(input: {
    sessionId: string;
    workflowId: string;
    workflowStepId: string;
    triggerMessageId: string;
    planMarkdown: string;
  }) {
    const session = await sessionRepository.findById(input.sessionId);
    if (!session) {
      throw notFound("Session", input.sessionId);
    }

    const run = await agentRunRepository.create({
      session: { connect: { id: input.sessionId } },
      workflow: { connect: { id: input.workflowId } },
      workflowStep: { connect: { id: input.workflowStepId } },
      triggerMessageId: input.triggerMessageId,
      status: "pending",
      intent: "GENERATE_CANDIDATE_A2UI",
      modelProvider: session.modelProvider,
      modelName: session.modelName,
      modelConfig: session.modelConfig as unknown as Prisma.InputJsonValue,
      attemptCount: 0,
      maxAttempts: 3,
      metadata: {
        planMarkdown: input.planMarkdown,
      },
    });

    void agentRunService.executeWorkflowCandidateRun({
      agentRunId: run.id,
      sessionId: input.sessionId,
      workflowId: input.workflowId,
      workflowStepId: input.workflowStepId,
      planMarkdown: input.planMarkdown,
    });

    return run;
  },

  /**
   * 执行 workflow candidate 生成：调用 Runtime，但只保存 candidate artifact。
   *
   * 注意：本路径不调用 commitRun，因此不会创建正式 A2UI event 或 surface snapshot。
   */
  async executeWorkflowCandidateRun(input: {
    agentRunId: string;
    sessionId: string;
    workflowId: string;
    workflowStepId: string;
    planMarkdown: string;
  }): Promise<void> {
    const run = await agentRunRepository.update(input.agentRunId, {
      status: "running",
      startedAt: new Date(),
      attemptCount: 0,
    });

    streamService.send(input.sessionId, {
      event: "agent_run_started",
      data: {
        sessionId: input.sessionId,
        agentRun: {
          id: run.id,
          status: run.status as AgentRunDto["status"],
          attemptCount: run.attemptCount,
          maxAttempts: run.maxAttempts,
        },
      },
    });

    setImmediate(async () => {
      try {
        await workflowService.updateStep({
          workflowId: input.workflowId,
          sessionId: input.sessionId,
          stepId: input.workflowStepId,
          status: "running",
          startedAt: new Date(),
          metadata: {
            gate: "generate_a2ui",
            agentRunId: input.agentRunId,
          },
        });

        const agentInput = await buildAgentInput(
          input.sessionId,
          [
            "请根据下面已确认的 Markdown plan 生成 Candidate A2UI messages。",
            "只输出合法 A2UI，不要提交正式状态；后端会把通过校验的结果保存为 candidate artifact。",
            "",
            input.planMarkdown,
          ].join("\n"),
        );
        const runtime = buildAgentRuntime();
        const toolCallTasks: Array<Promise<void>> = [];
        const result = await runtime.run(agentInput, (record) => {
          toolCallTasks.push(recordRuntimeToolCall(input.agentRunId, input.sessionId, record));
        });
        await Promise.all(toolCallTasks);

        if (result.status === "COMMITTED") {
          await workflowService.recordCandidateSuccess({
            sessionId: input.sessionId,
            workflowId: input.workflowId,
            generateStepId: input.workflowStepId,
            agentRunId: input.agentRunId,
            assistantMessage: result.assistantMessage,
            a2uiMessages: result.a2uiMessages,
            validation: result.validation,
            tokenUsage: result.tokenUsage,
          });

          await agentRunRepository.update(input.agentRunId, {
            status: "committed",
            attemptCount: result.attemptCount,
            validationSummary: result.validation as unknown as Prisma.InputJsonValue,
            tokenUsage: (result.tokenUsage ?? {}) as Prisma.InputJsonValue,
            completedAt: new Date(),
          });
          return;
        }

        const failureReason = result.status === "TEXT_ONLY"
          ? "Agent 未生成 Candidate A2UI messages"
          : result.failureReason;
        await workflowService.recordCandidateFailure({
          sessionId: input.sessionId,
          workflowId: input.workflowId,
          generateStepId: input.workflowStepId,
          agentRunId: input.agentRunId,
          failureReason,
          validation: result.status === "FAILED" ? result.validation : undefined,
        });
        await agentRunService.failRun(input.agentRunId, input.sessionId, failureReason, result.attemptCount);
      } catch (err) {
        const reason = toAgentRunError(err);
        logger.error(`Workflow candidate run 执行失败 -> session=${SID(input.sessionId)}, runId=${SID(input.agentRunId)}, error=${reason.slice(0, 120)}`);
        await workflowService.recordCandidateFailure({
          sessionId: input.sessionId,
          workflowId: input.workflowId,
          generateStepId: input.workflowStepId,
          agentRunId: input.agentRunId,
          failureReason: reason,
        });
        await agentRunService.failRun(input.agentRunId, input.sessionId, reason, 1);
      }
    });
  },

  /**
   * 将已确认的 Candidate A2UI artifact 提交为正式 A2UI event 和 current snapshot。
   *
   * 注意：提交使用 artifact 中保存的 exact messages，不重新调用 Agent Runtime。
   */
  async commitWorkflowCandidate(input: {
    sessionId: string;
    workflowId: string;
    workflowStepId: string;
    confirmedByMessageId: string;
    candidateArtifact: {
      id: string;
      version: number;
      contentText: string | null;
      contentJson: unknown;
    };
  }) {
    const content = input.candidateArtifact.contentJson as {
      messages?: A2UIServerMessage[];
      validation?: Extract<AgentRunResult, { status: "COMMITTED" }>["validation"];
    };
    const a2uiMessages = content.messages ?? [];
    const validation = content.validation;
    if (!validation?.valid || a2uiMessages.length === 0) {
      throw new Error("Candidate artifact 缺少可提交的 A2UI messages 或 validation");
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const assistantMessage = await tx.message.create({
        data: {
          sessionId: input.sessionId,
          workflowId: input.workflowId,
          workflowStepId: input.workflowStepId,
          role: "assistant",
          kind: "chat",
          content: input.candidateArtifact.contentText ?? "已提交 Candidate A2UI。",
          attachments: [],
          a2uiEventIds: [],
          metadata: {
            candidateArtifactId: input.candidateArtifact.id,
            candidateVersion: input.candidateArtifact.version,
          },
        },
      });

      const sequence = await a2uiEventRepository.getNextSequence(input.sessionId, tx);
      const surfaceIds = extractSurfaceIds(a2uiMessages);
      const a2uiEvent = await tx.a2UIEvent.create({
        data: {
          sessionId: input.sessionId,
          messageId: assistantMessage.id,
          sequence,
          status: "committed",
          catalogId: config.catalog.id,
          catalogVersion: config.catalog.version,
          rendererVersion: config.catalog.rendererVersion,
          surfaceIds,
          messages: a2uiMessages as unknown as Prisma.InputJsonValue,
          validationResult: validation as unknown as Prisma.InputJsonValue,
          metadata: {
            workflowId: input.workflowId,
            workflowStepId: input.workflowStepId,
            candidateArtifactId: input.candidateArtifact.id,
          },
        },
      });

      await tx.message.update({
        where: { id: assistantMessage.id },
        data: { a2uiEventIds: [a2uiEvent.id] },
      });

      const snapshotData = await snapshotService.computeFromEvents(input.sessionId, tx);
      const { surfaceCount, componentCount } = snapshotService.getCounts(snapshotData);
      await surfaceSnapshotRepository.unsetCurrent(input.sessionId, tx);

      const newSnapshot = await tx.surfaceSnapshot.create({
        data: {
          sessionId: input.sessionId,
          a2uiEventId: a2uiEvent.id,
          sequence,
          isCurrent: true,
          catalogId: config.catalog.id,
          catalogVersion: config.catalog.version,
          rendererVersion: config.catalog.rendererVersion,
          surfaceCount,
          componentCount,
          snapshot: snapshotData as unknown as Prisma.InputJsonValue,
          summary: assistantMessage.content,
          metadata: {
            workflowId: input.workflowId,
            workflowStepId: input.workflowStepId,
            candidateArtifactId: input.candidateArtifact.id,
          },
        },
      });

      await tx.session.update({
        where: { id: input.sessionId },
        data: {
          currentSnapshotId: newSnapshot.id,
        },
      });

      await tx.workflowStep.update({
        where: { id: input.workflowStepId },
        data: {
          status: "completed",
          completedAt: new Date(),
          metadata: {
            gate: "commit",
            committed: true,
            confirmedByMessageId: input.confirmedByMessageId,
            candidateArtifactId: input.candidateArtifact.id,
            a2uiEventId: a2uiEvent.id,
            snapshotId: newSnapshot.id,
            assistantMessageId: assistantMessage.id,
          },
        },
      });

      const completedWorkflow = await tx.agentWorkflow.update({
        where: { id: input.workflowId },
        data: {
          status: "completed",
          currentStepType: "commit",
          completedReason: "committed",
          completedAt: new Date(),
          metadata: {
            committed: true,
            confirmedByMessageId: input.confirmedByMessageId,
            candidateArtifactId: input.candidateArtifact.id,
            a2uiEventId: a2uiEvent.id,
            snapshotId: newSnapshot.id,
            assistantMessageId: assistantMessage.id,
          },
        },
      });

      streamService.send(input.sessionId, {
        event: "assistant_message",
        data: { sessionId: input.sessionId, message: buildMessageDto(assistantMessage) },
      });
      streamService.send(input.sessionId, {
        event: "a2ui_messages",
        data: { sessionId: input.sessionId, a2uiEvent: buildA2UIEventDto(a2uiEvent, input.sessionId) },
      });
      streamService.send(input.sessionId, {
        event: "surface_snapshot",
        data: { sessionId: input.sessionId, snapshot: buildSnapshotDto(newSnapshot, input.sessionId) },
      });
      streamService.send(input.sessionId, {
        event: "workflow_completed",
        data: {
          sessionId: input.sessionId,
          workflow: {
            id: completedWorkflow.id,
            sessionId: completedWorkflow.sessionId,
            status: completedWorkflow.status as "completed",
            currentStepType: completedWorkflow.currentStepType as "commit",
            title: completedWorkflow.title,
            intent: completedWorkflow.intent,
            completedReason: completedWorkflow.completedReason,
            failureReason: completedWorkflow.failureReason,
            metadata: completedWorkflow.metadata as JsonObject,
            startedAt: completedWorkflow.startedAt?.toISOString() ?? null,
            completedAt: completedWorkflow.completedAt?.toISOString() ?? null,
            createdAt: completedWorkflow.createdAt.toISOString(),
            updatedAt: completedWorkflow.updatedAt.toISOString(),
          },
        },
      });
    });
  },

  /**
   * 执行一次正式 Agent run：启动、调用 Agent Runtime、提交或失败。
   */
  async executeRun(agentRunId: string, sessionId: string, userMessage: string): Promise<void> {
    const run = await agentRunRepository.update(agentRunId, {
      status: "running",
      startedAt: new Date(),
      attemptCount: 0,
    });

    streamService.send(sessionId, {
      event: "agent_run_started",
      data: {
        sessionId,
        agentRun: {
          id: run.id,
          status: run.status as AgentRunDto["status"],
          attemptCount: run.attemptCount,
          maxAttempts: run.maxAttempts,
        },
      },
    });

    logger.info(`Agent run 启动 -> session=${SID(sessionId)}, runId=${SID(agentRunId)}`);
    logger.debug("-> SSE -> FRONTEND: agent_run_started");

    setImmediate(async () => {
      try {
        const agentInput = await buildAgentInput(sessionId, userMessage);

        const runtime = buildAgentRuntime();
        const toolCallTasks: Array<Promise<void>> = [];
        const result = await runtime.run(agentInput, (record) => {
          toolCallTasks.push(recordRuntimeToolCall(agentRunId, sessionId, record));
        });
        await Promise.all(toolCallTasks);

        if (result.status === "COMMITTED") {
          await agentRunService.commitRun(agentRunId, sessionId, result);
        } else if (result.status === "TEXT_ONLY") {
          await agentRunService.commitTextOnlyRun(agentRunId, sessionId, result);
        } else {
          await agentRunService.failRun(agentRunId, sessionId, result.failureReason, result.attemptCount);
        }
      } catch (err) {
        logger.error(`Agent run 执行失败 -> session=${SID(sessionId)}, runId=${SID(agentRunId)}, error=${toAgentRunError(err).slice(0, 120)}`);
        await agentRunService.failRun(agentRunId, sessionId, toAgentRunError(err), 1);
      }
    });
  },

  /**
   * 提交成功的 agent run：创建 assistant message、A2UI event 和 snapshot。
   */
  async commitRun(
    agentRunId: string,
    sessionId: string,
    result: Extract<AgentRunResult, { status: "COMMITTED" }>,
  ): Promise<void> {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const assistantMessage = await tx.message.create({
        data: {
          sessionId,
          agentRunId,
          role: "assistant",
          kind: "chat",
          content: result.assistantMessage,
          attachments: [],
          a2uiEventIds: [],
          metadata: {},
        },
      });

      const sequence = await a2uiEventRepository.getNextSequence(sessionId, tx);
      const surfaceIds = extractSurfaceIds(result.a2uiMessages);
      const a2uiEvent = await tx.a2UIEvent.create({
        data: {
          sessionId,
          agentRunId,
          messageId: assistantMessage.id,
          sequence,
          status: "committed",
          catalogId: config.catalog.id,
          catalogVersion: config.catalog.version,
          rendererVersion: config.catalog.rendererVersion,
          surfaceIds,
          messages: result.a2uiMessages as unknown as Prisma.InputJsonValue,
          validationResult: result.validation as unknown as Prisma.InputJsonValue,
        },
      });

      await tx.message.update({
        where: { id: assistantMessage.id },
        data: { a2uiEventIds: [a2uiEvent.id] },
      });

      // 必须复用当前事务，否则刚写入的 a2uiEvent 对事务外连接不可见，
      // 首次生成会错误地产生 surfaces 为空的 current snapshot。
      const snapshotData = await snapshotService.computeFromEvents(sessionId, tx);
      const { surfaceCount, componentCount } = snapshotService.getCounts(snapshotData);

      await surfaceSnapshotRepository.unsetCurrent(sessionId, tx);

      const newSnapshot = await tx.surfaceSnapshot.create({
        data: {
          sessionId,
          a2uiEventId: a2uiEvent.id,
          agentRunId,
          sequence,
          isCurrent: true,
          catalogId: config.catalog.id,
          catalogVersion: config.catalog.version,
          rendererVersion: config.catalog.rendererVersion,
          surfaceCount,
          componentCount,
          snapshot: snapshotData as unknown as Prisma.InputJsonValue,
          summary: result.assistantMessage,
        },
      });

      await tx.session.update({
        where: { id: sessionId },
        data: {
          currentSnapshotId: newSnapshot.id,
          lastAgentRunId: agentRunId,
        },
      });

      const completedAt = new Date();
      const updatedRun = await tx.agentRun.update({
        where: { id: agentRunId },
        data: {
          status: "committed",
          attemptCount: result.attemptCount,
          outputSnapshotId: newSnapshot.id,
          assistantMessageId: assistantMessage.id,
          validationSummary: result.validation as unknown as Prisma.InputJsonValue,
          tokenUsage: (result.tokenUsage ?? {}) as Prisma.InputJsonValue,
          completedAt,
        },
      });

      streamService.send(sessionId, {
        event: "assistant_message",
        data: { sessionId, message: buildMessageDto(assistantMessage) },
      });

      streamService.send(sessionId, {
        event: "a2ui_messages",
        data: { sessionId, a2uiEvent: buildA2UIEventDto(a2uiEvent, sessionId) },
      });

      streamService.send(sessionId, {
        event: "surface_snapshot",
        data: { sessionId, snapshot: buildSnapshotDto(newSnapshot, sessionId) },
      });

      streamService.send(sessionId, {
        event: "agent_run_completed",
        data: {
          sessionId,
          agentRun: {
            id: updatedRun.id,
            status: updatedRun.status as AgentRunDto["status"],
            attemptCount: updatedRun.attemptCount,
            assistantMessageId: updatedRun.assistantMessageId,
            outputSnapshotId: updatedRun.outputSnapshotId,
            completedAt: updatedRun.completedAt?.toISOString() ?? completedAt.toISOString(),
          },
        },
      });

      logger.info(`Agent run 提交 -> session=${SID(sessionId)}, runId=${SID(agentRunId)}, sequence=${sequence}`);
      logger.debug("-> SSE -> FRONTEND: assistant_message + a2ui_messages + surface_snapshot + agent_run_completed");
    });
  },

  /**
   * 提交仅文本回复的 agent run：不创建 A2UI event，也不更新 snapshot。
   */
  async commitTextOnlyRun(
    agentRunId: string,
    sessionId: string,
    result: Extract<AgentRunResult, { status: "TEXT_ONLY" }>,
  ): Promise<void> {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const assistantMessage = await tx.message.create({
        data: {
          sessionId,
          agentRunId,
          role: "assistant",
          kind: "chat",
          content: result.assistantMessage,
          attachments: [],
          a2uiEventIds: [],
          metadata: {},
        },
      });

      await tx.session.update({
        where: { id: sessionId },
        data: { lastAgentRunId: agentRunId },
      });

      const completedAt = new Date();
      const updatedRun = await tx.agentRun.update({
        where: { id: agentRunId },
        data: {
          status: "committed",
          attemptCount: result.attemptCount,
          assistantMessageId: assistantMessage.id,
          tokenUsage: (result.tokenUsage ?? {}) as Prisma.InputJsonValue,
          completedAt,
        },
      });

      streamService.send(sessionId, {
        event: "assistant_message",
        data: { sessionId, message: buildMessageDto(assistantMessage) },
      });

      streamService.send(sessionId, {
        event: "agent_run_completed",
        data: {
          sessionId,
          agentRun: {
            id: updatedRun.id,
            status: updatedRun.status as AgentRunDto["status"],
            attemptCount: updatedRun.attemptCount,
            assistantMessageId: updatedRun.assistantMessageId,
            outputSnapshotId: updatedRun.outputSnapshotId,
            completedAt: updatedRun.completedAt?.toISOString() ?? completedAt.toISOString(),
          },
        },
      });

      logger.info(`Agent run 文本回复提交 -> session=${SID(sessionId)}, runId=${SID(agentRunId)}`);
    });
  },

  /**
   * 标记 agent run 失败，并创建 assistant 失败消息。
   */
  async failRun(
    agentRunId: string,
    sessionId: string,
    reason: string,
    attemptCount: number,
  ): Promise<void> {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const failMessage = await tx.message.create({
        data: {
          sessionId,
          agentRunId,
          role: "assistant",
          kind: "validation_error",
          content: `Agent 执行失败：${reason}`,
          attachments: [],
          a2uiEventIds: [],
          metadata: {},
        },
      });

      await tx.agentRun.update({
        where: { id: agentRunId },
        data: {
          status: "failed",
          failureReason: reason,
          attemptCount,
          assistantMessageId: failMessage.id,
          completedAt: new Date(),
        },
      });

      streamService.send(sessionId, {
        event: "agent_run_failed",
        data: {
          sessionId,
          agentRun: {
            id: agentRunId,
            status: "failed",
            attemptCount,
            failureReason: reason,
          },
          message: buildMessageDto(failMessage),
        },
      });

      logger.warn(`Agent run 失败 -> session=${SID(sessionId)}, runId=${SID(agentRunId)}, reason=${reason.slice(0, 120)}`);
      logger.debug("-> SSE -> FRONTEND: agent_run_failed");
    });
  },

  /**
   * 查询 session 下的所有 agent runs。
   */
  async getRuns(sessionId: string) {
    const runs = await agentRunRepository.findBySessionId(sessionId);
    return { items: runs.map((r: NonNullable<Awaited<ReturnType<typeof agentRunRepository.findById>>>) => toAgentRunDto(r)!).filter(Boolean) };
  },

  /**
   * 查询 agent run 详情，包含 tool calls、assistant message 和 A2UI events。
   */
  async getRunDetail(sessionId: string, runId: string): Promise<AgentRunDetailResponse> {
    const run = await agentRunRepository.findById(runId);
    if (!run) {
      throw notFound("AgentRun", runId);
    }

    const toolCalls = await toolCallRepository.findByAgentRunId(runId);
    const assistantMessage = run.assistantMessageId
      ? await messageRepository.findById(run.assistantMessageId)
      : null;
    const a2uiEvents = await a2uiEventRepository.findBySessionId(sessionId, { limit: 100 });
    const relatedEvents = a2uiEvents.filter((e: { agentRunId: string | null }) => e.agentRunId === runId);

    return {
      agentRun: toAgentRunDto(run)!,
      toolCalls: toolCalls.map((tc: {
        id: string;
        agentRunId: string;
        sessionId: string;
        toolName: string;
        status: string;
        attemptIndex: number;
        inputSummary: unknown;
        output: unknown;
        errorMessage: string | null;
        durationMs: number | null;
        createdAt: Date;
      }) => ({
        id: tc.id,
        agentRunId: tc.agentRunId,
        sessionId: tc.sessionId,
        toolName: tc.toolName,
        status: tc.status as "running" | "succeeded" | "failed",
        attemptIndex: tc.attemptIndex,
        inputSummary: tc.inputSummary as unknown as JsonObject,
        output: tc.output as unknown as JsonObject | null,
        errorMessage: tc.errorMessage,
        durationMs: tc.durationMs,
        createdAt: tc.createdAt.toISOString(),
      })),
      assistantMessage: assistantMessage ? buildMessageDto(assistantMessage) : null,
      a2uiEvents: relatedEvents.map((e: {
        id: string;
        sessionId: string;
        agentRunId: string | null;
        messageId: string | null;
        sequence: number;
        status: string;
        catalogId: string;
        catalogVersion: string;
        rendererVersion: string;
        surfaceIds: string[];
        messages: unknown;
        validationResult: unknown;
        createdAt: Date;
      }) => buildA2UIEventDto(e, sessionId)),
      traceSummary: toTraceSummary(run.metadata),
    };
  },
};

/**
 * 从一组 A2UI 服务端消息中提取所有涉及的 surfaceId。
 *
 * 遍历 createSurface / updateComponents / updateDataModel / deleteSurface 四类消息，
 * 通过 Set 去重后返回唯一 surfaceId 列表。
 *
 * @param messages - A2UI 服务端消息数组
 * @returns 去重后的 surfaceId 列表
 */
function extractSurfaceIds(messages: A2UIServerMessage[]): string[] {
  const surfaceIds = new Set<string>();
  for (const msg of messages) {
    if ("createSurface" in msg && msg.createSurface) {
      surfaceIds.add(msg.createSurface.surfaceId);
    }
    if ("updateComponents" in msg && msg.updateComponents) {
      surfaceIds.add(msg.updateComponents.surfaceId);
    }
    if ("updateDataModel" in msg && msg.updateDataModel) {
      surfaceIds.add(msg.updateDataModel.surfaceId);
    }
    if ("deleteSurface" in msg && msg.deleteSurface) {
      surfaceIds.add(msg.deleteSurface.surfaceId);
    }
  }
  return Array.from(surfaceIds);
}

/**
 * 将 Prisma Message 实体（含扩展字段）转换为 MessageDto。
 *
 * Date 字段转为 ISO 字符串，枚举字段通过类型断言保持类型安全。
 *
 * @param m - Prisma 查询返回的 Message 实体
 * @returns 转换后的 MessageDto
 */
function buildMessageDto(m: {
  id: string;
  sessionId: string;
  agentRunId: string | null;
  workflowId?: string | null;
  workflowStepId?: string | null;
  role: string;
  kind: string;
  content: string;
  attachments: unknown;
  a2uiEventIds: unknown;
  metadata: unknown;
  createdAt: Date;
}): MessageDto {
  return {
    id: m.id,
    sessionId: m.sessionId,
    agentRunId: m.agentRunId,
    workflowId: m.workflowId ?? null,
    workflowStepId: m.workflowStepId ?? null,
    role: m.role as MessageDto["role"],
    kind: m.kind as MessageDto["kind"],
    content: m.content,
    attachments: m.attachments as MessageDto["attachments"],
    a2uiEventIds: m.a2uiEventIds as string[],
    metadata: m.metadata as MessageDto["metadata"],
    createdAt: m.createdAt.toISOString(),
  };
}

/**
 * 将 Prisma A2UIEvent 实体转换为 A2UIEventDto。
 *
 * @param e - Prisma 查询返回的 A2UIEvent 实体
 * @param sessionId - 关联的会话 ID（传入但未在 DTO 中重复设置，仅在调用方传入以区分上下文）
 * @returns 转换后的 A2UIEventDto
 */
function buildA2UIEventDto(
  e: {
    id: string;
    sessionId: string;
    agentRunId: string | null;
    messageId: string | null;
    sequence: number;
    status: string;
    catalogId: string;
    catalogVersion: string;
    rendererVersion: string;
    surfaceIds: string[];
    messages: unknown;
    validationResult: unknown;
    createdAt: Date;
  },
  sessionId: string,
): A2UIEventDto {
  return {
    id: e.id,
    sessionId: e.sessionId,
    agentRunId: e.agentRunId,
    messageId: e.messageId,
    sequence: e.sequence,
    status: e.status as A2UIEventDto["status"],
    catalogId: e.catalogId,
    catalogVersion: e.catalogVersion,
    rendererVersion: e.rendererVersion,
    surfaceIds: e.surfaceIds,
    messages: e.messages as A2UIEventDto["messages"],
    validationResult: e.validationResult as A2UIEventDto["validationResult"],
    createdAt: e.createdAt.toISOString(),
  };
}

/**
 * 将 Prisma SurfaceSnapshot 实体转换为 SurfaceSnapshotDto。
 *
 * @param s - Prisma 查询返回的 SurfaceSnapshot 实体
 * @param sessionId - 关联的会话 ID
 * @returns 转换后的 SurfaceSnapshotDto
 */
function buildSnapshotDto(
  s: {
    id: string;
    sessionId: string;
    a2uiEventId: string | null;
    agentRunId: string | null;
    sequence: number;
    isCurrent: boolean;
    catalogId: string;
    catalogVersion: string;
    rendererVersion: string;
    surfaceCount: number;
    componentCount: number;
    snapshot: unknown;
    summary: string | null;
    createdAt: Date;
  },
  sessionId: string,
): SurfaceSnapshotDto {
  return {
    id: s.id,
    sessionId: s.sessionId,
    a2uiEventId: s.a2uiEventId,
    agentRunId: s.agentRunId,
    sequence: s.sequence,
    isCurrent: s.isCurrent,
    catalogId: s.catalogId,
    catalogVersion: s.catalogVersion,
    rendererVersion: s.rendererVersion,
    surfaceCount: s.surfaceCount,
    componentCount: s.componentCount,
    snapshot: s.snapshot as SurfaceSnapshotDto["snapshot"],
    summary: s.summary,
    createdAt: s.createdAt.toISOString(),
  };
}

/**
 * 从 AgentRun metadata 中提取 trace summary（可能为 null）。
 */
function toTraceSummary(metadata: unknown): AgentRunTraceSummaryDto | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const raw = (metadata as Record<string, unknown>)["traceSummary"];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as unknown as AgentRunTraceSummaryDto;
}
