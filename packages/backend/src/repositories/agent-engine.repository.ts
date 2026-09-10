import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";

export const agentEngineRepository = {
  createBinding(data: Prisma.AgentEngineBindingCreateInput) { return prisma.agentEngineBinding.create({ data }); },
  findBinding(workflowId: string) { return prisma.agentEngineBinding.findUnique({ where: { workflowId } }); },
  updateContinuation(workflowId: string, continuation: Prisma.InputJsonValue) {
    return prisma.agentEngineBinding.update({ where: { workflowId }, data: { continuation } });
  },
  createEvent(data: Prisma.AgentEngineEventCreateInput) { return prisma.agentEngineEvent.create({ data }); },
  findEvents(agentRunId: string) { return prisma.agentEngineEvent.findMany({ where: { agentRunId, deletedAt: null }, orderBy: { sequence: "asc" } }); },
  clearExpiredPayloads(now = new Date()) {
    return prisma.agentEngineEvent.updateMany({ where: { payloadExpiresAt: { lte: now }, failureNativePayloadEncrypted: { not: null } }, data: { failureNativePayloadEncrypted: null } });
  },
};
