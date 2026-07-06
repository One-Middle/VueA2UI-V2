import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";

export const sessionRepository = {
  create(data: Prisma.SessionCreateInput) {
    return prisma.session.create({ data });
  },

  findById(id: string) {
    return prisma.session.findFirst({
      where: { id, deletedAt: null },
    });
  },

  findMany(filters: {
    status?: string;
    catalogId?: string;
    limit?: number;
    cursor?: string | null;
  }) {
    const { status, catalogId, limit = 50, cursor } = filters;
    const where: Prisma.SessionWhereInput = { deletedAt: null };
    if (status) where.status = status;
    if (catalogId) where.catalogId = catalogId;

    return prisma.session.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
  },

  update(id: string, data: Prisma.SessionUpdateInput) {
    return prisma.session.update({
      where: { id },
      data,
    });
  },

  /** 软删除会话 */
  softDelete(id: string) {
    return prisma.session.update({
      where: { id },
      data: {
        status: "deleted",
        deletedAt: new Date(),
      },
    });
  },
};
