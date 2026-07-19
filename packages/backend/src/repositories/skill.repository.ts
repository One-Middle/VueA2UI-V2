import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";

export const skillRepository = {
  create(data: Prisma.SkillCreateInput) {
    return prisma.skill.create({ data });
  },

  findMany(filters: { isActive?: boolean; limit?: number; cursor?: string | null } = {}) {
    const { isActive, limit = 50, cursor } = filters;
    const where: Prisma.SkillWhereInput = { deletedAt: null };
    if (isActive !== undefined) where.isActive = isActive;

    return prisma.skill.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
  },

  findById(id: string) {
    return prisma.skill.findFirst({
      where: { id, deletedAt: null },
    });
  },

  /**
   * 按名称和来源类型查找 Skill（含软删除记录）。
   * 用于内置 Skill 同步时匹配已有记录。
   */
  findByNameAndSourceType(name: string, sourceType: string) {
    return prisma.skill.findFirst({
      where: { name, sourceType },
    });
  },

  update(id: string, data: Prisma.SkillUpdateInput) {
    return prisma.skill.update({
      where: { id },
      data,
    });
  },

  softDelete(id: string) {
    return prisma.skill.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });
  },
};
