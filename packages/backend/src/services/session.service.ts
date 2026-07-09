import type { SessionDto, SurfaceSnapshotDto, SessionDetailResponse } from "@a2ui-platform/shared";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { sessionRepository } from "../repositories/session.repository.js";
import { surfaceSnapshotRepository } from "../repositories/surface-snapshot.repository.js";
import { sessionSkillRepository } from "../repositories/session-skill.repository.js";
import { notFound } from "../utils/errors.js";

function toSessionDto(session: Awaited<ReturnType<typeof sessionRepository.findById>>): SessionDto | null {
  if (!session) return null;
  return {
    id: session.id,
    title: session.title,
    description: session.description,
    status: session.status as SessionDto["status"],
    catalogId: session.catalogId,
    catalogVersion: session.catalogVersion,
    rendererVersion: session.rendererVersion,
    modelProvider: session.modelProvider,
    modelName: session.modelName,
    currentSnapshotId: session.currentSnapshotId,
    lastAgentRunId: session.lastAgentRunId,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

export const sessionService = {
  async create(req: { title?: string; description?: string; modelName?: string }) {
    const session = await sessionRepository.create({
      title: req.title ?? "未命名会话",
      description: req.description ?? null,
      status: "active",
      catalogId: config.catalog.id,
      catalogVersion: config.catalog.version,
      rendererVersion: config.catalog.rendererVersion,
      modelProvider: "openai-compatible",
      modelName: req.modelName ?? config.openai.model,
    });

    logger.info({ sessionId: session.id }, "Session created");
    return { session: toSessionDto(session)! };
  },

  async list(filters: { status?: string; limit?: number; cursor?: string | null }) {
    const sessions = await sessionRepository.findMany(filters);
    const items = sessions.map((s) => toSessionDto(s)!);
    // 基于 updatedAt 的 cursor
    const hasMore = items.length > (filters.limit ?? 50);
    const page = hasMore ? items.slice(0, filters.limit ?? 50) : items;

    return {
      items: page,
      pageInfo: {
        nextCursor: hasMore && page.length > 0 ? page[page.length - 1]!.id : null,
        hasMore,
      },
    };
  },

  async getById(sessionId: string): Promise<SessionDetailResponse> {
    const session = await sessionRepository.findById(sessionId);
    if (!session) throw notFound("Session", sessionId);

    const currentSnapshot = await surfaceSnapshotRepository.findCurrentBySessionId(sessionId);
    const sessionSkills = await sessionSkillRepository.findBySessionId(sessionId);
    const enabledSkillIds = sessionSkills.filter((ss) => ss.enabled).map((ss) => ss.skillId);

    let currentSnapshotDto: SurfaceSnapshotDto | null = null;
    if (currentSnapshot) {
      currentSnapshotDto = {
        id: currentSnapshot.id,
        sessionId: currentSnapshot.sessionId,
        a2uiEventId: currentSnapshot.a2uiEventId,
        agentRunId: currentSnapshot.agentRunId,
        sequence: currentSnapshot.sequence,
        isCurrent: currentSnapshot.isCurrent,
        catalogId: currentSnapshot.catalogId,
        catalogVersion: currentSnapshot.catalogVersion,
        rendererVersion: currentSnapshot.rendererVersion,
        surfaceCount: currentSnapshot.surfaceCount,
        componentCount: currentSnapshot.componentCount,
        snapshot: currentSnapshot.snapshot as unknown as SurfaceSnapshotDto["snapshot"],
        summary: currentSnapshot.summary,
        createdAt: currentSnapshot.createdAt.toISOString(),
      };
    }

    return {
      session: toSessionDto(session)!,
      currentSnapshot: currentSnapshotDto,
      enabledSkillIds,
    };
  },

  async update(sessionId: string, data: { title?: string; description?: string | null; status?: string }) {
    const existing = await sessionRepository.findById(sessionId);
    if (!existing) throw notFound("Session", sessionId);

    const updated = await sessionRepository.update(sessionId, data);
    logger.info({ sessionId }, "Session updated");
    return { session: toSessionDto(updated)! };
  },

  async delete(sessionId: string) {
    const existing = await sessionRepository.findById(sessionId);
    if (!existing) throw notFound("Session", sessionId);

    await sessionRepository.softDelete(sessionId);
    logger.info({ sessionId }, "Session soft-deleted");
    return { success: true };
  },
};
