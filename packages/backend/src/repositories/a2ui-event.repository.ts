import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";

export const a2uiEventRepository = {
  create(data: Prisma.A2UIEventCreateInput) {
    return prisma.a2UIEvent.create({ data });
  },

  findBySessionId(
    sessionId: string,
    options: { fromSequence?: number; limit?: number } = {},
    tx?: Prisma.TransactionClient,
  ) {
    const { fromSequence, limit = 50 } = options;
    const where: Prisma.A2UIEventWhereInput = { sessionId, deletedAt: null };
    if (fromSequence !== undefined) {
      where.sequence = { gte: fromSequence };
    }
    const client = tx ?? prisma;
    return client.a2UIEvent.findMany({
      where,
      orderBy: { sequence: "asc" },
      take: limit + 1,
    });
  },

  /**
   * 在事务中获取下一个递增序号。
   */
  async getNextSequence(sessionId: string, tx?: Prisma.TransactionClient): Promise<number> {
    const client = tx ?? prisma;
    const last = await client.a2UIEvent.findFirst({
      where: { sessionId },
      orderBy: { sequence: "desc" },
      select: { sequence: true },
    });
    return (last?.sequence ?? 0) + 1;
  },
};
