import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";

export const messageRepository = {
  create(data: Prisma.MessageCreateInput) {
    return prisma.message.create({ data });
  },

  findBySessionId(sessionId: string, options: { limit?: number; cursor?: string | null } = {}) {
    const { limit = 50, cursor } = options;
    return prisma.message.findMany({
      where: { sessionId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
  },

  findById(id: string) {
    return prisma.message.findFirst({
      where: { id, deletedAt: null },
    });
  },
};
