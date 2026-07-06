import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";

export const toolCallRepository = {
  create(data: Prisma.ToolCallCreateInput) {
    return prisma.toolCall.create({ data });
  },

  findByAgentRunId(agentRunId: string) {
    return prisma.toolCall.findMany({
      where: { agentRunId },
      orderBy: { attemptIndex: "asc" },
    });
  },
};
