/**
 * Agent Workflow 数据访问层。
 *
 * 职责：
 * - 提供 AgentWorkflow / WorkflowStep / WorkflowArtifact 三张表的 CRUD 操作
 * - 查询当前会话进行中的 Workflow（基于 ACTIVE_WORKFLOW_STATUSES）
 * - 按 session 查询 Workflow 历史（含 steps 和 artifacts 关联）
 *
 * 引用：
 * - Prisma Client (db.ts)
 * 被引用：
 * - workflow.service
 * 注意：
 * - 本层为纯数据访问，不做业务流程校验（由 workflow.service 负责）
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";

/** 处于进行中状态的 Workflow 状态枚举。 */
export const ACTIVE_WORKFLOW_STATUSES = ["active", "running", "awaiting_confirmation", "failed_retryable"] as const;

export const workflowRepository = {
  /** 创建 AgentWorkflow 记录。 */
  createWorkflow(data: Prisma.AgentWorkflowCreateInput) {
    return prisma.agentWorkflow.create({ data });
  },

  /**
   * 查询指定 Session 下当前进行中的 Workflow。
   *
   * 通过 status IN ACTIVE_WORKFLOW_STATUSES 过滤，按创建时间降序取第一条。
   */
  findActiveBySessionId(sessionId: string) {
    return prisma.agentWorkflow.findFirst({
      where: {
        sessionId,
        deletedAt: null,
        status: { in: [...ACTIVE_WORKFLOW_STATUSES] },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * 查询指定 Session 的 Workflow 历史列表。
   *
   * 包含关联的 steps（按 sequence 升序）和 artifacts（按 kind + version 升序）。
   */
  findWorkflowsBySessionId(sessionId: string) {
    return prisma.agentWorkflow.findMany({
      where: { sessionId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        steps: { where: { deletedAt: null }, orderBy: { sequence: "asc" } },
        artifacts: { where: { deletedAt: null }, orderBy: [{ kind: "asc" }, { version: "asc" }] },
        agentRuns: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
      },
    });
  },

  /** 查询单个 Workflow，包含 steps 和 artifacts。 */
  findWorkflowById(id: string) {
    return prisma.agentWorkflow.findFirst({
      where: { id, deletedAt: null },
      include: {
        steps: { where: { deletedAt: null }, orderBy: { sequence: "asc" } },
        artifacts: { where: { deletedAt: null }, orderBy: [{ kind: "asc" }, { version: "asc" }] },
        agentRuns: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
      },
    });
  },

  /** 查询单个 Workflow 记录（不含 steps/artifacts 关联），用于读取 metadata 等轻量场景。 */
  findById(id: string) {
    return prisma.agentWorkflow.findFirst({
      where: { id, deletedAt: null },
    });
  },

  /** 查询 Workflow 中指定类型的最新 step。 */
  findLatestStep(workflowId: string, type?: string) {
    return prisma.workflowStep.findFirst({
      where: {
        workflowId,
        deletedAt: null,
        ...(type ? { type } : {}),
      },
      orderBy: { sequence: "desc" },
    });
  },

  /** 按 ID 查询未删除的 WorkflowStep。 */
  findStepById(id: string) {
    return prisma.workflowStep.findFirst({
      where: { id, deletedAt: null },
    });
  },

  /** 查询 Workflow 中指定 kind 的最新 artifact。 */
  findLatestArtifact(workflowId: string, kind: string) {
    return prisma.workflowArtifact.findFirst({
      where: { workflowId, kind, deletedAt: null },
      orderBy: { version: "desc" },
    });
  },

  /** 按 ID 查询未删除的 WorkflowArtifact。 */
  findArtifactById(id: string) {
    return prisma.workflowArtifact.findFirst({
      where: { id, deletedAt: null },
    });
  },

  /** 更新 Workflow 字段（状态、标题、完成原因等）。 */
  updateWorkflow(id: string, data: Prisma.AgentWorkflowUpdateInput) {
    return prisma.agentWorkflow.update({
      where: { id },
      data,
    });
  },

  /** 创建 WorkflowStep 记录。 */
  createStep(data: Prisma.WorkflowStepCreateInput) {
    return prisma.workflowStep.create({ data });
  },

  /** 更新 WorkflowStep 字段（状态、重试次数、失败原因等）。 */
  updateStep(id: string, data: Prisma.WorkflowStepUpdateInput) {
    return prisma.workflowStep.update({
      where: { id },
      data,
    });
  },

  /** 创建 WorkflowArtifact 记录（中间产物、最终结果等）。 */
  createArtifact(data: Prisma.WorkflowArtifactCreateInput) {
    return prisma.workflowArtifact.create({ data });
  },

  /** 更新 WorkflowArtifact 字段（如标记 candidate 失效）。 */
  updateArtifact(id: string, data: Prisma.WorkflowArtifactUpdateInput) {
    return prisma.workflowArtifact.update({
      where: { id },
      data,
    });
  },
};
