/**
 * Agent Workflow 路由。
 *
 * 职责：
 * - 查询 session 下的 workflow timeline。
 * - 接收用户显式 workflow actions，并交给 WorkflowService 做阶段门禁。
 *
 * 引用：
 * - workflow.service
 * - message.repository
 * - agent-run.service
 * - utils/validation
 * 被引用：
 * - app.ts
 * 注意：
 * - 本路由只分发 action，不在路由层决定 workflow 阶段能否推进。
 */
import { Router, type NextFunction, type Request, type Response } from "express";
import type { AgentRunDto, MessageDto, WorkflowActionRequest, WorkflowActionResponse } from "@a2ui-platform/shared";
import { agentRunService } from "../services/agent-run.service.js";
import { workflowService } from "../services/workflow.service.js";
import { messageRepository } from "../repositories/message.repository.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
import { validate, workflowActionSchema } from "../utils/validation.js";

export const workflowsRouter = Router();

/**
 * GET /api/sessions/:sessionId/workflows - 查询 session 下 workflow 历史。
 */
workflowsRouter.get(
  "/sessions/:sessionId/workflows",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.sessionId as string;
      const workflows = await workflowService.getSessionWorkflows(sessionId);
      res.json({ items: workflows });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/sessions/:sessionId/workflows/:workflowId - 查询 workflow 详情。
 */
workflowsRouter.get(
  "/sessions/:sessionId/workflows/:workflowId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workflowId = req.params.workflowId as string;
      const workflow = await workflowService.getWorkflowById(workflowId);
      if (!workflow) throw notFound("AgentWorkflow", workflowId);
      res.json({ workflow });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/sessions/:sessionId/workflow/actions - 推进当前 active workflow。
 */
workflowsRouter.post(
  "/sessions/:sessionId/workflow/actions",
  validate(workflowActionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.sessionId as string;
      const body = req.body as WorkflowActionRequest;
      const workflow = await workflowService.getActiveWorkflow(sessionId);
      if (!workflow) throw conflict("当前会话没有进行中的 Agent Workflow", "ACTIVE_WORKFLOW_NOT_FOUND", { sessionId });

      if (!["confirm_plan", "confirm_commit", "retry_step"].includes(body.action)) {
        throw badRequest(`暂不支持 workflow action: ${body.action}`, "WORKFLOW_ACTION_NOT_SUPPORTED", {
          action: body.action,
        });
      }

      const message = await messageRepository.create({
        session: { connect: { id: sessionId } },
        workflow: { connect: { id: workflow.id } },
        role: "user",
        kind: "chat",
        content: body.message ?? "确认方案",
        attachments: [],
        metadata: {
          workflowAction: body.action,
          payload: body.payload ?? {},
        },
      });

      if (body.action === "retry_step") {
        const workflowDetail = await workflowService.getWorkflowById(workflow.id);
        if (!workflowDetail) throw notFound("AgentWorkflow", workflow.id);
        const failedStep = workflowDetail.steps.filter((step) => step.status === "failed").at(-1);
        const plan = workflowDetail.artifacts.filter((artifact) => artifact.kind === "plan_markdown").at(-1);
        if (!failedStep || failedStep.type !== "generate_a2ui" || !plan?.contentText) {
          throw conflict("当前 workflow 没有可重试的 Candidate 生成失败阶段", "WORKFLOW_RETRY_STEP_NOT_AVAILABLE", {
            workflowId: workflow.id,
          });
        }

        const retryStep = await workflowService.createStep({
          workflowId: workflow.id,
          sessionId,
          type: "generate_a2ui",
          sequence: failedStep.sequence + 1,
          status: "pending",
          metadata: {
            gate: "generate_a2ui",
            retryOfStepId: failedStep.id,
            retryByMessageId: message.id,
          },
        });
        const agentRun = await agentRunService.startWorkflowCandidateRun({
          sessionId,
          workflowId: workflow.id,
          workflowStepId: retryStep.id,
          triggerMessageId: message.id,
          planMarkdown: plan.contentText,
        });
        const latestWorkflow = await workflowService.getWorkflowById(workflow.id);
        if (!latestWorkflow) throw notFound("AgentWorkflow", workflow.id);

        res.status(202).json({
          workflow: latestWorkflow,
          message: toMessageDto(message),
          agentRun: toAgentRunDto(agentRun),
        } satisfies WorkflowActionResponse);
        return;
      }

      if (body.action === "confirm_commit") {
        const confirmedCandidate = await workflowService.confirmCandidateCommit({
          sessionId,
          workflowId: workflow.id,
          confirmedByMessageId: message.id,
          candidateArtifactId: body.artifactId,
        });

        await agentRunService.commitWorkflowCandidate({
          sessionId,
          workflowId: workflow.id,
          workflowStepId: confirmedCandidate.commitStep.id,
          confirmedByMessageId: message.id,
          candidateArtifact: confirmedCandidate.candidateArtifact,
        });

        const completedWorkflow = await workflowService.getWorkflowById(workflow.id);
        if (!completedWorkflow) throw notFound("AgentWorkflow", workflow.id);

        const response: WorkflowActionResponse = {
          workflow: completedWorkflow,
          message: toMessageDto(message),
        };

        res.status(202).json(response);
        return;
      }

      const confirmedWorkflow = await workflowService.confirmPlan({
        sessionId,
        workflowId: workflow.id,
        confirmedByMessageId: message.id,
      });
      if (!confirmedWorkflow) throw notFound("AgentWorkflow", workflow.id);

      const generateStep = confirmedWorkflow.steps
        .filter((step) => step.type === "generate_a2ui")
        .at(-1);
      const plan = confirmedWorkflow.artifacts
        .filter((artifact) => artifact.kind === "plan_markdown")
        .at(-1);

      if (!generateStep || !plan?.contentText) {
        throw conflict("确认 plan 后无法找到 candidate 生成所需上下文", "WORKFLOW_CANDIDATE_CONTEXT_MISSING", {
          workflowId: workflow.id,
        });
      }

      const agentRun = await agentRunService.startWorkflowCandidateRun({
        sessionId,
        workflowId: workflow.id,
        workflowStepId: generateStep.id,
        triggerMessageId: message.id,
        planMarkdown: plan.contentText,
      });

      const response: WorkflowActionResponse = {
        workflow: confirmedWorkflow,
        message: toMessageDto(message),
        agentRun: toAgentRunDto(agentRun),
      };

      res.status(202).json(response);
    } catch (err) {
      next(err);
    }
  },
);

function toMessageDto(message: Awaited<ReturnType<typeof messageRepository.create>>): MessageDto {
  return {
    id: message.id,
    sessionId: message.sessionId,
    agentRunId: message.agentRunId,
    workflowId: message.workflowId,
    workflowStepId: message.workflowStepId,
    role: message.role as MessageDto["role"],
    kind: message.kind as MessageDto["kind"],
    content: message.content,
    attachments: message.attachments as MessageDto["attachments"],
    a2uiEventIds: message.a2uiEventIds as string[],
    metadata: message.metadata as MessageDto["metadata"],
    createdAt: message.createdAt.toISOString(),
  };
}

function toAgentRunDto(agentRun: Awaited<ReturnType<typeof agentRunService.startWorkflowCandidateRun>>): AgentRunDto {
  return {
    id: agentRun.id,
    sessionId: agentRun.sessionId,
    workflowId: agentRun.workflowId,
    workflowStepId: agentRun.workflowStepId,
    triggerMessageId: agentRun.triggerMessageId,
    status: agentRun.status as AgentRunDto["status"],
    intent: agentRun.intent,
    modelProvider: agentRun.modelProvider,
    modelName: agentRun.modelName,
    attemptCount: agentRun.attemptCount,
    maxAttempts: agentRun.maxAttempts,
    inputSnapshotId: agentRun.inputSnapshotId,
    outputSnapshotId: agentRun.outputSnapshotId,
    assistantMessageId: agentRun.assistantMessageId,
    failureReason: agentRun.failureReason,
    validationSummary: agentRun.validationSummary as AgentRunDto["validationSummary"],
    tokenUsage: agentRun.tokenUsage as AgentRunDto["tokenUsage"],
    startedAt: agentRun.startedAt?.toISOString() ?? null,
    completedAt: agentRun.completedAt?.toISOString() ?? null,
    createdAt: agentRun.createdAt.toISOString(),
  };
}
