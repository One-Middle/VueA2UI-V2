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
