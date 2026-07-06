import type {
  AgentRunDto,
  AgentRunResult,
  AgentRunInput,
  JsonObject,
  MessageDto,
  A2UIEventDto,
  SurfaceSnapshotDto,
  AgentRunDetailResponse,
  A2UIServerMessage,
} from "@a2ui-platform/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { logger } from "../logger.js";
import { agentRunRepository } from "../repositories/agent-run.repository.js";
import { messageRepository } from "../repositories/message.repository.js";
import { a2uiEventRepository } from "../repositories/a2ui-event.repository.js";
import { surfaceSnapshotRepository } from "../repositories/surface-snapshot.repository.js";
import { toolCallRepository } from "../repositories/tool-call.repository.js";
import { notFound } from "../utils/errors.js";
import { streamService } from "./stream.service.js";
import { snapshotService } from "./snapshot.service.js";
import { mockAgentRun } from "../mock-agent.js";
import { config } from "../config.js";

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

export const agentRunService = {
  /**
   * 执行一次 agent run：启动 → mock agent → commit 或 fail。
   */
  async executeRun(agentRunId: string, sessionId: string, userMessage: string): Promise<void> {
    // 1. 启动 run
    const run = await agentRunRepository.update(agentRunId, {
      status: "running",
      startedAt: new Date(),
      attemptCount: 1,
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

    logger.info({ sessionId, agentRunId }, "Agent run 已启动");

    // 2. 异步执行 mock agent
    setImmediate(async () => {
      try {
        // 获取当前快照作为 input
        const currentSnapshot = await surfaceSnapshotRepository.findCurrentBySessionId(sessionId);

        const agentInput: AgentRunInput = {
          sessionId,
          userMessage,
          recentMessages: [],
          uploadedFiles: [],
          enabledSkills: [],
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

        // 记录 tool call（mock）
        const toolCall = await toolCallRepository.create({
          agentRun: { connect: { id: agentRunId } },
          sessionId,
          toolName: "generate_a2ui",
          status: "running",
          attemptIndex: 1,
          inputSummary: { userMessage },
        });

        const result = await mockAgentRun(agentInput);

        // 更新 tool call 为成功
        await prisma.toolCall.update({
          where: { id: toolCall.id },
          data: {
            status: "succeeded",
            output: result as unknown as Prisma.InputJsonValue,
            durationMs: 100,
          },
        });

        if (result.status === "COMMITTED") {
          await agentRunService.commitRun(agentRunId, sessionId, result);
        } else {
          await agentRunService.failRun(agentRunId, sessionId, (result as Extract<AgentRunResult, { status: "FAILED" }>).failureReason ?? "未知错误", result.attemptCount);
        }
      } catch (err) {
        logger.error({ err, sessionId, agentRunId }, "Agent run 执行失败");
        await agentRunService.failRun(agentRunId, sessionId, toAgentRunError(err), 1);
      }
    });
  },

  /**
   * 提交成功的 agent run：在事务中创建 assistant message、a2ui_events、snapshot。
   */
  async commitRun(
    agentRunId: string,
    sessionId: string,
    result: Extract<AgentRunResult, { status: "COMMITTED" }>
  ): Promise<void> {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. 创建 assistant message
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

      // 2. 计算 sequence
      const sequence = await a2uiEventRepository.getNextSequence(sessionId, tx);

      // 3. 创建 a2ui_event
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

      // 4. 关联 a2uiEventIds 到 assistant message
      await tx.message.update({
        where: { id: assistantMessage.id },
        data: { a2uiEventIds: [a2uiEvent.id] },
      });

      // 5. 计算 snapshot（回放所有事件）
      const snapshotData = await snapshotService.computeFromEvents(sessionId);
      const { surfaceCount, componentCount } = snapshotService.getCounts(snapshotData);

      // 6. unset 旧的 current snapshot
      await surfaceSnapshotRepository.unsetCurrent(sessionId, tx);

      // 7. 创建新 snapshot
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

      // 8. 更新 session
      await tx.session.update({
        where: { id: sessionId },
        data: {
          currentSnapshotId: newSnapshot.id,
          lastAgentRunId: agentRunId,
        },
      });

      // 9. 更新 agent_run 为 committed
      await tx.agentRun.update({
        where: { id: agentRunId },
        data: {
          status: "committed",
          outputSnapshotId: newSnapshot.id,
          assistantMessageId: assistantMessage.id,
          validationSummary: result.validation as unknown as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });

      // 事务提交后推送 SSE
      const assistantMessageDto = buildMessageDto(assistantMessage);
      const a2uiEventDto = buildA2UIEventDto(a2uiEvent, sessionId);
      const snapshotDto = buildSnapshotDto(newSnapshot, sessionId);

      streamService.send(sessionId, {
        event: "assistant_message",
        data: { sessionId, message: assistantMessageDto },
      });

      streamService.send(sessionId, {
        event: "a2ui_messages",
        data: { sessionId, a2uiEvent: a2uiEventDto },
      });

      streamService.send(sessionId, {
        event: "surface_snapshot",
        data: { sessionId, snapshot: snapshotDto },
      });

      logger.info({ sessionId, agentRunId, sequence }, "Agent run 已提交");
    });
  },

  /**
   * 标记 agent run 失败：在事务中创建 assistant 失败消息，推送 SSE。
   */
  async failRun(
    agentRunId: string,
    sessionId: string,
    reason: string,
    attemptCount: number
  ): Promise<void> {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. 创建 assistant 失败消息
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

      // 2. 更新 agent_run
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

      const failMessageDto = buildMessageDto(failMessage);

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
          message: failMessageDto,
        },
      });

      logger.warn({ sessionId, agentRunId, reason }, "Agent run 失败");
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
   * 查询 agent run 详情（含 tool calls、assistant message、a2ui events）。
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
      assistantMessage: assistantMessage
        ? buildMessageDto(assistantMessage)
        : null,
      a2uiEvents: relatedEvents.map((e: { id: string; sessionId: string; agentRunId: string | null; messageId: string | null; sequence: number; status: string; catalogId: string; catalogVersion: string; rendererVersion: string; surfaceIds: string[]; messages: unknown; validationResult: unknown; createdAt: Date }) => buildA2UIEventDto(e, sessionId)),
    };
  },
};

// ─── Helper: extract surface IDs ──────────────────────────

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

// ─── Helper: build DTOs from raw DB rows ──────────────────

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
  sessionId: string
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
  sessionId: string
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
