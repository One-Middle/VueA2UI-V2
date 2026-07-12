/**
 * 会话业务服务。
 *
 * 职责：
 * - 会话的 CRUD 操作（创建、列表、详情、更新、软删除）
 * - 实体到 DTO 的转换
 * - 与 session、snapshot、session-skill 三个 repository 的协调
 *
 * 不负责：HTTP 请求解析、权限校验、其他资源（消息/A2UI/文件）的管理。
 */

import type { SessionDto, SurfaceSnapshotDto, SessionDetailResponse } from "@a2ui-platform/shared";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { sessionRepository } from "../repositories/session.repository.js";
import { surfaceSnapshotRepository } from "../repositories/surface-snapshot.repository.js";
import { sessionSkillRepository } from "../repositories/session-skill.repository.js";
import { notFound } from "../utils/errors.js";

/**
 * 将 Prisma 会话实体转换为 SessionDto。
 *
 * @param session - Prisma 查询返回的会话实体
 * @returns 转换后的 DTO，若实体为空则返回 null
 */
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
  /**
   * 创建新会话，使用配置中的默认 Catalog 和模型参数。
   */
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

  /**
   * 分页查询会话列表，基于 updatedAt 进行游标分页。
   */
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

  /**
   * 获取会话详情，含当前快照和已启用的 Skill ID 列表。
   */
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

  /**
   * 更新会话的标题、描述或状态。
   */
  async update(sessionId: string, data: { title?: string; description?: string | null; status?: string }) {
    const existing = await sessionRepository.findById(sessionId);
    if (!existing) throw notFound("Session", sessionId);

    const updated = await sessionRepository.update(sessionId, data);
    logger.info({ sessionId }, "Session updated");
    return { session: toSessionDto(updated)! };
  },

  /**
   * 软删除会话（标记为 deleted 状态而非物理删除）。
   */
  async delete(sessionId: string) {
    const existing = await sessionRepository.findById(sessionId);
    if (!existing) throw notFound("Session", sessionId);

    await sessionRepository.softDelete(sessionId);
    logger.info({ sessionId }, "Session soft-deleted");
    return { success: true };
  },
};
