import { prisma } from "../db.js";

export const sessionSkillRepository = {
  upsert(sessionId: string, skillId: string, enabled: boolean) {
    return prisma.sessionSkill.upsert({
      where: {
        sessionId_skillId: { sessionId, skillId },
      },
      create: {
        sessionId,
        skillId,
        enabled,
        enabledAt: enabled ? new Date() : undefined,
        disabledAt: !enabled ? new Date() : undefined,
      },
      update: {
        enabled,
        enabledAt: enabled ? new Date() : undefined,
        disabledAt: !enabled ? new Date() : undefined,
      },
    });
  },

  findBySessionId(sessionId: string) {
    return prisma.sessionSkill.findMany({
      where: { sessionId },
      include: { skill: true },
    });
  },
};
