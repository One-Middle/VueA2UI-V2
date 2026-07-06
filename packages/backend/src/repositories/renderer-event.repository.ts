import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";

export const rendererEventRepository = {
  create(data: Prisma.RendererEventCreateInput) {
    return prisma.rendererEvent.create({ data });
  },

  findBySessionId(sessionId: string) {
    return prisma.rendererEvent.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  },
};
