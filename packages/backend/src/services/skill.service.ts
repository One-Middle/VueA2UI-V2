/**
 * Skill 业务服务。
 *
 * 职责：
 * - Skill 的 CRUD（创建、列表、更新）
 * - Session 级 Skill 启用/禁用管理
 * - 内置 Skill（builtin）的自动同步（由 sync-builtin-skills 脚本调用）
 * - Skill metadata 中的 references 格式化和安全提取
 *
 * 引用：
 * - skill / sessionSkill 两个 repository
 * - utils/errors / utils/pagination
 * 被引用：
 * - skills 路由、sync-builtin-skills 脚本
 * 注意：
 * - builtin Skill 按 name + sourceType="builtin" 匹配后 upsert，避免重复创建
 * - references 存储在 metadata JSON 字段中，提取时做类型守卫校验
 */

import type {
  JsonObject,
  SkillDto,
  SkillReference,
  CreateSkillRequest,
  UpdateSkillRequest,
} from "@a2ui-platform/shared";
import { logger } from "../logger.js";
import { skillRepository } from "../repositories/skill.repository.js";
import { sessionSkillRepository } from "../repositories/session-skill.repository.js";
import { notFound } from "../utils/errors.js";
import { parsePagination, buildPageResult } from "../utils/pagination.js";

/**
 * 将 Prisma Skill 实体转换为 SkillDto。
 *
 * @param s - Prisma 查询返回的 Skill 实体（可能为 null）
 * @returns 转换后的 DTO，实体不存在时返回 null
 */
function toSkillDto(s: Awaited<ReturnType<typeof skillRepository.findById>>): SkillDto | null {
  if (!s) return null;
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    content: s.content,
    references: normalizeSkillReferences(s.metadata),
    sourceType: s.sourceType,
    version: s.version,
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

/**
 * 从 Skill 的 metadata JSON 字段中安全提取并校验 references 列表。
 *
 * 对每个 reference 做严格的类型守卫：必须包含非空字符串的 id、title、content 字段。
 * 使用 Array.isArray + filter 类型谓词，过滤掉不符合格式的条目。
 *
 * @param metadata - Skill.metadata 原始 JSON 字段
 * @returns 校验通过的 SkillReference 列表
 */
function normalizeSkillReferences(metadata: unknown): SkillReference[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return [];
  }
  const references = (metadata as { references?: unknown }).references;
  if (!Array.isArray(references)) {
    return [];
  }
  return references
    .filter((item): item is SkillReference => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return false;
      const ref = item as Record<string, unknown>;
      return (
        typeof ref.id === "string" &&
        ref.id.trim().length > 0 &&
        typeof ref.title === "string" &&
        ref.title.trim().length > 0 &&
        typeof ref.content === "string" &&
        ref.content.trim().length > 0
      );
    })
    .map((ref) => ({
      id: ref.id.trim(),
      title: ref.title.trim(),
      content: ref.content,
      description: ref.description ?? null,
    }));
}

/**
 * 将 SkillReference 列表序列化为 metadata JSON 格式。
 *
 * @param references - Skill 引用资料列表
 * @returns 包含 references 数组的 JSON 对象
 */
function buildSkillMetadata(references?: SkillReference[]): JsonObject {
  return {
    references: (references ?? []).map((ref) => ({
      id: ref.id,
      title: ref.title,
      content: ref.content,
      description: ref.description ?? null,
    })),
  };
}

/**
 * 将新的 references 合并到现有 metadata 中。
 *
 * 保留原 metadata 中的其他字段（如 platformSkillSource），仅覆盖 references 部分。
 * 用于更新 Skill 时避免覆盖非 references 相关的元数据。
 *
 * @param metadata - 现有的 Skill.metadata JSON 字段
 * @param references - 要替换的 SkillReference 列表
 * @returns 合并后的 JSON 对象
 */
function mergeSkillReferencesMetadata(
  metadata: unknown,
  references: SkillReference[],
): JsonObject {
  const base =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as JsonObject)
      : {};
  return {
    ...base,
    ...buildSkillMetadata(references),
  };
}

export const skillService = {
  /**
   * 创建 Skill。
   */
  async create(req: CreateSkillRequest) {
    const skill = await skillRepository.create({
      name: req.name,
      description: req.description ?? null,
      content: req.content,
      sourceType: "manual",
      version: 1,
      isActive: true,
      metadata: buildSkillMetadata(req.references),
    });

    logger.info({ skillId: skill.id }, "Skill 已创建");
    return { skill: toSkillDto(skill)! };
  },

  /**
   * 分页查询 Skill 列表。
   */
  async list(query: Record<string, unknown>) {
    const { limit, cursor } = parsePagination(query);
    const isActive = query.isActive !== undefined ? query.isActive === "true" : undefined;
    const skills = await skillRepository.findMany({ isActive, limit, cursor });
    const items = skills.map((s) => toSkillDto(s)!).filter(Boolean);
    return buildPageResult(items, items.length, limit, (item) => item.id);
  },

  /**
   * 更新 Skill。
   */
  async update(skillId: string, data: UpdateSkillRequest) {
    const existing = await skillRepository.findById(skillId);
    if (!existing) throw notFound("Skill", skillId);

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.references !== undefined) {
      updateData.metadata = mergeSkillReferencesMetadata(
        existing.metadata,
        data.references,
      );
    }
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await skillRepository.update(skillId, updateData);
    logger.info({ skillId }, "Skill 已更新");
    return { skill: toSkillDto(updated)! };
  },

  /**
   * 为 session 启用指定 skill。
   */
  async enableForSession(sessionId: string, skillId: string) {
    const skill = await skillRepository.findById(skillId);
    if (!skill) throw notFound("Skill", skillId);

    await sessionSkillRepository.upsert(sessionId, skillId, true);
    logger.info({ sessionId, skillId }, "Session skill 已启用");
    return { enabled: true };
  },

  /**
   * 为 session 禁用指定 skill。
   */
  async disableForSession(sessionId: string, skillId: string) {
    const skill = await skillRepository.findById(skillId);
    if (!skill) throw notFound("Skill", skillId);

    await sessionSkillRepository.upsert(sessionId, skillId, false);
    logger.info({ sessionId, skillId }, "Session skill 已禁用");
    return { enabled: false };
  },

  /**
   * 查询 session 已启用的 skill 列表。
   */
  async getEnabledForSession(sessionId: string) {
    const sessionSkills = await sessionSkillRepository.findBySessionId(sessionId);
    const enabled = sessionSkills.filter((ss) => ss.enabled);
    return {
      items: enabled.map((ss) => ({
        sessionId: ss.sessionId,
        skillId: ss.skillId,
        enabled: ss.enabled,
      })),
    };
  },

  /**
   * 同步内置 Skill：按 name + sourceType='builtin' 匹配已有记录后 upsert。
   * 供 sync-builtin-skills 脚本调用。
   */
  async upsertBuiltin(params: {
    name: string;
    description?: string | null;
    content: string;
    version?: number;
  }) {
    const existing = await skillRepository.findByNameAndSourceType(
      params.name,
      "builtin",
    );

    if (existing) {
      const updated = await skillRepository.update(existing.id, {
        description: params.description ?? existing.description,
        content: params.content,
        version: existing.version + 1,
        isActive: true,
        deletedAt: null,
      });
      logger.info(
        { skillId: updated.id, name: params.name },
        "Builtin Skill 已更新",
      );
      return { skill: toSkillDto(updated)! };
    }

    const created = await skillRepository.create({
      name: params.name,
      description: params.description ?? null,
      content: params.content,
      sourceType: "builtin",
      version: params.version ?? 1,
      isActive: true,
      metadata: buildSkillMetadata(),
    });
    logger.info(
      { skillId: created.id, name: params.name },
      "Builtin Skill 已创建",
    );
    return { skill: toSkillDto(created)! };
  },
};
