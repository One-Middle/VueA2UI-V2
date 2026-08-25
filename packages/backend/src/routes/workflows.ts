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
import type { MessageDto, WorkflowActionRequest, WorkflowActionResponse } from "@a2ui-platform/shared";
import type { Prisma } from "@prisma/client";
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

      const message = await messageRepository.create({
        session: { connect: { id: sessionId } },
        workflow: { connect: { id: workflow.id } },
        role: "user",
        kind: "chat",
        content: workflowActionMessageContent(body),
        attachments: [],
        metadata: {
          workflowAction: body.action,
          payload: (body.payload ?? {}) as Prisma.InputJsonValue,
        },
      });

      if (body.action === "submit_clarification") {
        const workflowDetail = await workflowService.submitClarification({
          sessionId,
          workflowId: workflow.id,
          artifactId: body.artifactId,
          submittedByMessageId: message.id,
          answers: body.payload.answers,
          additionalText: body.payload.additionalText,
        });
        if (!workflowDetail) throw notFound("AgentWorkflow", workflow.id);

        res.status(202).json({
          workflow: workflowDetail,
          message: toMessageDto(message),
        } satisfies WorkflowActionResponse);
        return;
      }

      if (body.action === "submit_decision") {
        const workflowDetail = await workflowService.submitDecision({
          sessionId,
          workflowId: workflow.id,
          artifactId: body.artifactId,
          submittedByMessageId: message.id,
          selectedOption: body.payload.selectedOption,
          comment: body.payload.comment,
        });
        if (!workflowDetail) throw notFound("AgentWorkflow", workflow.id);

        res.status(202).json({
          workflow: workflowDetail,
          message: toMessageDto(message),
        } satisfies WorkflowActionResponse);
        return;
      }

      if (body.action === "cancel") {
        const interrupted = await workflowService.interruptWorkflow(workflow.id, sessionId);

        res.status(202).json({
          workflow: interrupted.workflow,
          message: toMessageDto(message),
          agentRun: interrupted.agentRun,
          step: interrupted.step,
        } satisfies WorkflowActionResponse);
        return;
      }

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
        void workflowService.executeGenerateA2UI({
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
        } satisfies WorkflowActionResponse);
        return;
      }

      const unsupportedAction = (body as { action: string }).action;
      throw badRequest(`暂不支持 workflow action: ${unsupportedAction}`, "WORKFLOW_ACTION_NOT_SUPPORTED", {
        action: unsupportedAction,
      });
    } catch (err) {
      next(err);
    }
  },
);

function workflowActionMessageContent(body: WorkflowActionRequest): string {
  if (body.message?.trim()) return body.message.trim();
  if (body.action === "submit_clarification") {
    return body.payload.additionalText?.trim() || "提交澄清答案";
  }
  if (body.action === "submit_decision") {
    if (body.payload.selectedOption === "confirm") return "确认";
    if (body.payload.selectedOption === "reject") return "拒绝";
    return body.payload.comment ?? "提交修改意见";
  }
  if (body.action === "retry_step") return "重试失败步骤";
  return "取消 workflow";
}

function toMessageDto(message: Awaited<ReturnType<typeof messageRepository.create>>): MessageDto {
  return {
    id: message.id,
    sessionId: message.sessionId,
    agentRunId: message.agentRunId ?? null,
    workflowId: message.workflowId ?? null,
    workflowStepId: message.workflowStepId ?? null,
    role: message.role as MessageDto["role"],
    kind: message.kind as MessageDto["kind"],
    content: message.content,
    attachments: message.attachments as MessageDto["attachments"],
    a2uiEventIds: message.a2uiEventIds as string[],
    metadata: message.metadata as MessageDto["metadata"],
    createdAt: message.createdAt.toISOString(),
  };
}
