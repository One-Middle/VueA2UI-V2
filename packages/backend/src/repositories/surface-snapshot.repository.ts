import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";

export const surfaceSnapshotRepository = {
  create(data: Prisma.SurfaceSnapshotCreateInput) {
    return prisma.surfaceSnapshot.create({ data });
  },

  findCurrentBySessionId(sessionId: string) {
    return prisma.surfaceSnapshot.findFirst({
      where: { sessionId, isCurrent: true, deletedAt: null },
    });
  },

  findBySessionId(sessionId: string) {
    return prisma.surfaceSnapshot.findMany({
      where: { sessionId, deletedAt: null },
      orderBy: { sequence: "desc" },
      take: 50,
    });
  },

  /**
   * 在事务中将当前 session 的所有 snapshot 的 isCurrent 置为 false。
   */
  async unsetCurrent(sessionId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? prisma;
    await client.surfaceSnapshot.updateMany({
      where: { sessionId, isCurrent: true },
      data: { isCurrent: false },
    });
  },
};
