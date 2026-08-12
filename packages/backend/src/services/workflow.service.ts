/**
 * Agent Workflow 持久化编排服务。
 *
 * 职责：
 * - 创建、推进、失败、取消和完成 session 下的 workflow。
 * - 创建并更新 workflow step，保存 workflow artifact。
 * - 在 service 层守住同一 session 只允许一个进行中 workflow 的约束。
 * - 推送 workflow 级 SSE 事件，供前端恢复 timeline。
 *
 * 引用：
 * - workflow.repository
 * - stream.service
 * - utils/errors
 * 被引用：
 * - 后续 WorkflowService API 与 sendMessage 编排入口。
 * 注意：
 * - 本服务暂不调用 Agent Runtime，也不提交 A2UI event/snapshot。
 */
import type {
  AgentWorkflowDto,
  JsonObject,
  WorkflowArtifactDto,
  WorkflowArtifactKind,
  WorkflowStepDto,
  WorkflowStepStatus,
  WorkflowStepType,
} from "@a2ui-platform/shared";
import type { Prisma } from "@prisma/client";
import { workflowRepository } from "../repositories/workflow.repository.js";
import { conflict } from "../utils/errors.js";
import { streamService } from "./stream.service.js";

/** 创建 Agent Workflow 的输入参数。 */
export type CreateWorkflowInput = {
  sessionId: string;
  title?: string;
  intent?: string;
  metadata?: Prisma.InputJsonValue;
};

export type CreateWorkflowStepInput = {
  workflowId: string;
  sessionId: string;
  type: WorkflowStepType;
  sequence: number;
  status?: WorkflowStepStatus;
  maxAttempts?: number;
  metadata?: Prisma.InputJsonValue;
};

export type UpdateWorkflowStepInput = {
  stepId: string;
  sessionId: string;
  workflowId: string;
  status?: WorkflowStepStatus;
  attemptCount?: number;
  failureReason?: string | null;
  failureMetadata?: Prisma.InputJsonValue;
  confirmedAt?: Date | null;
  confirmedByMessageId?: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  metadata?: Prisma.InputJsonValue;
};

export type CreateWorkflowArtifactInput = {
  workflowId: string;
  workflowStepId?: string;
  sessionId: string;
  kind: WorkflowArtifactKind;
  version?: number;
  contentText?: string;
  contentJson?: Prisma.InputJsonValue;
  createdBy?: string;
  metadata?: Prisma.InputJsonValue;
};

export type CompleteWorkflowInput = {
  workflowId: string;
  sessionId: string;
  completedReason?: string;
  metadata?: Prisma.InputJsonValue;
};

export type FailWorkflowInput = {
  workflowId: string;
  sessionId: string;
  failureReason: string;
  failedStep?: WorkflowStepDto;
  retryable?: boolean;
  metadata?: Prisma.InputJsonValue;
};

/**
 * 将未知值安全转换为 JsonObject。
 *
 * 仅当值为非数组的普通对象时返回原值，否则返回空对象。
 * 用于安全展开 Prisma 返回的 Json 字段。
 */
function toJsonObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

/**
 * 将 Prisma AgentWorkflow 实体转换为 AgentWorkflowDto。
 *
 * Date 字段转为 ISO 字符串，metadata 通过 toJsonObject 安全转换。
 */
function toWorkflowDto(workflow: {
  id: string;
  sessionId: string;
  status: string;
  currentStepType: string | null;
  title: string | null;
  intent: string | null;
  completedReason: string | null;
  failureReason: string | null;
  metadata: unknown;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): AgentWorkflowDto {
  return {
    id: workflow.id,
    sessionId: workflow.sessionId,
    status: workflow.status as AgentWorkflowDto["status"],
    currentStepType: workflow.currentStepType as AgentWorkflowDto["currentStepType"],
    title: workflow.title,
    intent: workflow.intent,
    completedReason: workflow.completedReason,
    failureReason: workflow.failureReason,
    metadata: toJsonObject(workflow.metadata),
    startedAt: workflow.startedAt?.toISOString() ?? null,
    completedAt: workflow.completedAt?.toISOString() ?? null,
    createdAt: workflow.createdAt.toISOString(),
    updatedAt: workflow.updatedAt.toISOString(),
  };
}

/**
 * 将 Prisma WorkflowStep 实体转换为 WorkflowStepDto。
 */
function toStepDto(step: {
  id: string;
  workflowId: string;
  sessionId: string;
  type: string;
  status: string;
  sequence: number;
  attemptCount: number;
  maxAttempts: number;
  failureReason: string | null;
  failureMetadata: unknown;
  confirmedAt: Date | null;
  confirmedByMessageId: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}): WorkflowStepDto {
  return {
    id: step.id,
    workflowId: step.workflowId,
    sessionId: step.sessionId,
    type: step.type as WorkflowStepDto["type"],
    status: step.status as WorkflowStepDto["status"],
    sequence: step.sequence,
    attemptCount: step.attemptCount,
    maxAttempts: step.maxAttempts,
    failureReason: step.failureReason,
    failureMetadata: toJsonObject(step.failureMetadata),
    confirmedAt: step.confirmedAt?.toISOString() ?? null,
    confirmedByMessageId: step.confirmedByMessageId,
    startedAt: step.startedAt?.toISOString() ?? null,
    completedAt: step.completedAt?.toISOString() ?? null,
    metadata: toJsonObject(step.metadata),
    createdAt: step.createdAt.toISOString(),
    updatedAt: step.updatedAt.toISOString(),
  };
}

/**
 * 将 Prisma WorkflowArtifact 实体转换为 WorkflowArtifactDto。
 */
function toArtifactDto(artifact: {
  id: string;
  workflowId: string;
  workflowStepId: string | null;
  sessionId: string;
  kind: string;
  version: number;
  contentText: string | null;
  contentJson: unknown;
  createdBy: string;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}): WorkflowArtifactDto {
  return {
    id: artifact.id,
    workflowId: artifact.workflowId,
    workflowStepId: artifact.workflowStepId,
    sessionId: artifact.sessionId,
    kind: artifact.kind as WorkflowArtifactDto["kind"],
    version: artifact.version,
    contentText: artifact.contentText,
    contentJson: toJsonObject(artifact.contentJson),
    createdBy: artifact.createdBy as WorkflowArtifactDto["createdBy"],
    metadata: toJsonObject(artifact.metadata),
    createdAt: artifact.createdAt.toISOString(),
    updatedAt: artifact.updatedAt.toISOString(),
  };
}

export const workflowService = {
  /**
   * 创建 session 下的新 Agent Workflow。
   *
   * @param input - 创建参数，包含 sessionId、可选标题和意图
   * @returns 新建的 workflow 记录
   */
  async createWorkflow(input: CreateWorkflowInput) {
    const activeWorkflow = await workflowRepository.findActiveBySessionId(input.sessionId);
    if (activeWorkflow) {
      throw conflict("当前会话已有进行中的 Agent Workflow", "ACTIVE_WORKFLOW_EXISTS", {
        sessionId: input.sessionId,
        workflowId: activeWorkflow.id,
      });
    }

    const workflow = await workflowRepository.createWorkflow({
      session: { connect: { id: input.sessionId } },
      status: "active",
      title: input.title,
      intent: input.intent,
      metadata: input.metadata ?? {},
      startedAt: new Date(),
    });

    streamService.send(input.sessionId, {
      event: "workflow_started",
      data: { sessionId: input.sessionId, workflow: toWorkflowDto(workflow) },
    });

    return workflow;
  },

  /**
   * 创建 workflow step。
   *
   * @param input - step 创建参数
   * @returns 新建的 workflow step
   */
  async createStep(input: CreateWorkflowStepInput) {
    const step = await workflowRepository.createStep({
      workflow: { connect: { id: input.workflowId } },
      sessionId: input.sessionId,
      type: input.type,
      sequence: input.sequence,
      status: input.status ?? "pending",
      maxAttempts: input.maxAttempts ?? 3,
      metadata: input.metadata ?? {},
    });

    await workflowRepository.updateWorkflow(input.workflowId, {
      currentStepType: input.type,
    });

    streamService.send(input.sessionId, {
      event: "workflow_step_updated",
      data: { sessionId: input.sessionId, workflowId: input.workflowId, step: toStepDto(step) },
    });

    return step;
  },

  /**
   * 更新 workflow step 并推送 timeline 事件。
   *
   * @param input - step 更新参数
   * @returns 更新后的 workflow step
   */
  async updateStep(input: UpdateWorkflowStepInput) {
    const step = await workflowRepository.updateStep(input.stepId, {
      status: input.status,
      attemptCount: input.attemptCount,
      failureReason: input.failureReason,
      failureMetadata: input.failureMetadata,
      confirmedAt: input.confirmedAt,
      confirmedByMessageId: input.confirmedByMessageId,
      startedAt: input.startedAt,
      completedAt: input.completedAt,
      metadata: input.metadata,
    });

    streamService.send(input.sessionId, {
      event: "workflow_step_updated",
      data: { sessionId: input.sessionId, workflowId: input.workflowId, step: toStepDto(step) },
    });

    return step;
  },

  /**
   * 创建 workflow artifact。
   *
   * @param input - artifact 创建参数
   * @returns 新建的 workflow artifact
   */
  async createArtifact(input: CreateWorkflowArtifactInput) {
    const artifact = await workflowRepository.createArtifact({
      workflow: { connect: { id: input.workflowId } },
      workflowStep: input.workflowStepId ? { connect: { id: input.workflowStepId } } : undefined,
      sessionId: input.sessionId,
      kind: input.kind,
      version: input.version ?? 1,
      contentText: input.contentText,
      contentJson: input.contentJson ?? {},
      createdBy: input.createdBy ?? "agent",
      metadata: input.metadata ?? {},
    });

    streamService.send(input.sessionId, {
      event: "workflow_artifact_created",
      data: { sessionId: input.sessionId, workflowId: input.workflowId, artifact: toArtifactDto(artifact) },
    });

    return artifact;
  },

  /**
   * 完成 workflow。
   *
   * @param input - 完成参数
   * @returns 更新后的 workflow
   */
  async completeWorkflow(input: CompleteWorkflowInput) {
    const workflow = await workflowRepository.updateWorkflow(input.workflowId, {
      status: "completed",
      completedReason: input.completedReason ?? "completed",
      completedAt: new Date(),
      metadata: input.metadata,
    });

    streamService.send(input.sessionId, {
      event: "workflow_completed",
      data: { sessionId: input.sessionId, workflow: toWorkflowDto(workflow) },
    });

    return workflow;
  },

  /**
   * 标记 workflow 失败。
   *
   * @param input - 失败参数
   * @returns 更新后的 workflow
   */
  async failWorkflow(input: FailWorkflowInput) {
    const workflow = await workflowRepository.updateWorkflow(input.workflowId, {
      status: input.retryable ? "failed_retryable" : "failed",
      failureReason: input.failureReason,
      metadata: input.metadata,
      completedAt: input.retryable ? undefined : new Date(),
    });

    streamService.send(input.sessionId, {
      event: "workflow_failed",
      data: { sessionId: input.sessionId, workflow: toWorkflowDto(workflow), failedStep: input.failedStep },
    });

    return workflow;
  },

  /**
   * 取消 workflow。
   *
   * @param workflowId - Workflow ID
   * @param sessionId - Session ID
   * @returns 更新后的 workflow
   */
  async cancelWorkflow(workflowId: string, sessionId: string) {
    const workflow = await workflowRepository.updateWorkflow(workflowId, {
      status: "cancelled",
      completedReason: "cancelled",
      completedAt: new Date(),
    });

    streamService.send(sessionId, {
      event: "workflow_completed",
      data: { sessionId, workflow: toWorkflowDto(workflow) },
    });

    return workflow;
  },

  /**
   * 查询 session 的 workflow 历史。
   *
   * @param sessionId - 会话 ID
   * @returns workflow 历史，包含 steps 与 artifacts
   */
  getSessionWorkflows(sessionId: string) {
    return workflowRepository.findWorkflowsBySessionId(sessionId);
  },

  /**
   * 查询 session 当前进行中的 workflow。
   *
   * @param sessionId - 会话 ID
   * @returns 当前 active workflow，不存在时返回 null
   */
  getActiveWorkflow(sessionId: string) {
    return workflowRepository.findActiveBySessionId(sessionId);
  },
};
