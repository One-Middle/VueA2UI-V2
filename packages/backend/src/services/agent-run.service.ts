import type {
  A2UIEventDto,
  A2UIServerMessage,
  AgentRunDetailResponse,
  AgentRunDto,
  AgentRunInput,
  AgentRunResult,
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
import { sessionSkillRepository } from "../repositories/session-skill.repository.js";
import { surfaceSnapshotRepository } from "../repositories/surface-snapshot.repository.js";
import { toolCallRepository } from "../repositories/tool-call.repository.js";
import { notFound } from "../utils/errors.js";
import { config } from "../config.js";
import { snapshotService } from "./snapshot.service.js";
import { streamService } from "./stream.service.js";

const SID = (id: string) => id.slice(0, 8);

function toAgentRunDto(r: Awaited<ReturnType<typeof agentRunRepository.findById>>): AgentRunDto | null {
  if (!r) return null;
  return {
    id: r.id,
    sessionId: r.sessionId,
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

function toAgentRunError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

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
        const currentSnapshot = await surfaceSnapshotRepository.findCurrentBySessionId(sessionId);
        const recentMessages = await messageRepository.findBySessionId(sessionId, { limit: 20 });
        const uploadedFiles = await fileRepository.findReadyWithContentBySessionId(sessionId);
        const enabledSkills = await sessionSkillRepository.findBySessionId(sessionId);

        const agentInput: AgentRunInput = {
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
          enabledSkills: enabledSkills
            .filter((sessionSkill) => sessionSkill.enabled && sessionSkill.skill.isActive)
            .map((sessionSkill) => ({
              id: sessionSkill.skill.id,
              name: sessionSkill.skill.name,
              description: sessionSkill.skill.description,
              content: sessionSkill.skill.content,
            })),
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
    };
  },
};

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

function buildMessageDto(m: {
  id: string;
  sessionId: string;
  agentRunId: string | null;
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
    role: m.role as MessageDto["role"],
    kind: m.kind as MessageDto["kind"],
    content: m.content,
    attachments: m.attachments as MessageDto["attachments"],
    a2uiEventIds: m.a2uiEventIds as string[],
    metadata: m.metadata as MessageDto["metadata"],
    createdAt: m.createdAt.toISOString(),
  };
}

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
