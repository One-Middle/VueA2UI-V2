import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";

export const agentRunRepository = {
  create(data: Prisma.AgentRunCreateInput) {
    return prisma.agentRun.create({ data });
  },

  findById(id: string) {
    return prisma.agentRun.findFirst({
      where: { id, deletedAt: null },
    });
  },

  findBySessionId(sessionId: string) {
    return prisma.agentRun.findMany({
      where: { sessionId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  },

  update(id: string, data: Prisma.AgentRunUpdateInput) {
    return prisma.agentRun.update({
      where: { id },
      data,
    });
  },
};
