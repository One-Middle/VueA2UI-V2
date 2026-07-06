import type { SkillDto, CreateSkillRequest, UpdateSkillRequest } from "@a2ui-platform/shared";
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
    sourceType: s.sourceType,
    version: s.version,
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
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
      metadata: {},
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
};
