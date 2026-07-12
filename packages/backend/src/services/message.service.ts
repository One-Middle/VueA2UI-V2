import type { MessageDto, SendMessageResponse } from "@a2ui-platform/shared";
import type { Prisma } from "@prisma/client";
import { logger } from "../logger.js";
import { messageRepository } from "../repositories/message.repository.js";
import { agentRunRepository } from "../repositories/agent-run.repository.js";
import { sessionRepository } from "../repositories/session.repository.js";
import { sessionArchived } from "../utils/errors.js";
import { parsePagination, buildPageResult } from "../utils/pagination.js";

const SID = (id: string) => id.slice(0, 8);

function toMessageDto(
  m: Awaited<ReturnType<typeof messageRepository.findById>>
): MessageDto | null {
  if (!m) return null;
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

export const messageService = {
  /**
   * 创建用户消息并初始化一个 pending agent_run。
   * 仅当会话状态为 "active" 时允许发送。
   */
  async createUserMessageAndAgentRun(
    sessionId: string,
    content: string,
    attachmentFileIds?: string[],
    options?: { intent?: string }
  ): Promise<SendMessageResponse> {
    const session = await sessionRepository.findById(sessionId);
    if (!session) {
      throw sessionArchived(sessionId);
    }
    if (session.status !== "active") {
      throw sessionArchived(sessionId);
    }

    const message = await messageRepository.create({
      session: { connect: { id: sessionId } },
      role: "user",
      kind: "chat",
      content,
      attachments: attachmentFileIds ?? [],
    });

    const agentRun = await agentRunRepository.create({
      session: { connect: { id: sessionId } },
      triggerMessageId: message.id,
      status: "pending",
      intent: options?.intent ?? null,
      modelProvider: session.modelProvider,
      modelName: session.modelName,
      modelConfig: session.modelConfig as unknown as Prisma.InputJsonValue,
      attemptCount: 0,
      maxAttempts: 3,
    });

    logger.info(`收到用户消息 → session=${SID(sessionId)}, content=${content.length}字, agentRun=${SID(agentRun.id)}`);

    return {
      message: {
        id: message.id,
        role: message.role as MessageDto["role"],
        content: message.content,
      },
      agentRun: {
        id: agentRun.id,
        status: agentRun.status as SendMessageResponse["agentRun"]["status"],
      },
      streamUrl: `/api/sessions/${sessionId}/stream`,
    };
  },

  /**
   * 按 session 分页查询消息列表。
   */
  async listBySession(
    sessionId: string,
    query: Record<string, unknown>
  ) {
    const { limit, cursor } = parsePagination(query);
    const messages = await messageRepository.findBySessionId(sessionId, { limit, cursor });
    const items = messages.map((m) => toMessageDto(m)!).filter(Boolean);
    return buildPageResult(items, items.length, limit, (item) => item.id);
  },
};
