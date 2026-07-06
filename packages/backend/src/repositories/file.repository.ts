import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";

export const fileRepository = {
  create(data: Prisma.UploadedFileCreateInput) {
    return prisma.uploadedFile.create({ data });
  },

  findBySessionId(sessionId: string) {
    return prisma.uploadedFile.findMany({
      where: { sessionId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        sessionId: true,
        originalName: true,
        mimeType: true,
        extension: true,
        sizeBytes: true,
        encoding: true,
        status: true,
        createdAt: true,
      },
    });
  },

  findById(id: string) {
    return prisma.uploadedFile.findFirst({
      where: { id, deletedAt: null },
    });
  },

  softDelete(id: string) {
    return prisma.uploadedFile.update({
      where: { id },
      data: {
        status: "deleted",
        deletedAt: new Date(),
      },
    });
  },
};
