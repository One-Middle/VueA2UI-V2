/**
 * 消息业务服务。
 *
 * 职责：
 * - 创建用户消息并初始化 Agent Run 或 Workflow
 * - 根据消息内容判断是否需要启动 Agent Workflow（匹配 UI 生成意图）
 * - 按会话分页查询消息列表
 * - 校验会话状态（仅 active 状态允许发送消息）
 *
 * 引用：
 * - message / agentRun / session 各 repository
 * - workflow.service（Workflow 生命周期管理）
 * 被引用：
 * - messages 路由
 * 注意：
 * - 若存在进行中的 Workflow，新消息优先挂到该 Workflow 下，不创建新 Agent Run
 * - Workflow 消息仅返回 workflow 信息，不创建 agentRun；普通消息才走 Agent Run 流程
 */

import type { MessageDto, SendMessageResponse } from "@a2ui-platform/shared";
import type { Prisma } from "@prisma/client";
import { logger } from "../logger.js";
import { messageRepository } from "../repositories/message.repository.js";
import { agentRunRepository } from "../repositories/agent-run.repository.js";
import { sessionRepository } from "../repositories/session.repository.js";
import { sessionArchived } from "../utils/errors.js";
import { parsePagination, buildPageResult } from "../utils/pagination.js";
import { workflowService } from "./workflow.service.js";

/**
 * 截取 ID 前 8 位用于日志展示。
 *
 * @param id - 完整 UUID
 * @returns 前 8 位字符
 */
const SID = (id: string) => id.slice(0, 8);

/**
 * 匹配 UI 生成意图的正则表达式。
 *
 * 当消息内容匹配这些关键词时，自动触发 Agent Workflow（如"生成一个登录页"），
 * 而非走常规的 Agent Run 流程。
 */
const WORKFLOW_INTENT_RE =
  /a2ui|ui|页面|界面|组件|生成|创建|修改|调整|改成|预览/i;

/**
 * 判断一条用户消息是否需要启动 Agent Workflow。
 *
 * 优先检查传入的 intent 参数，其次通过正则匹配消息内容中的 UI 生成关键词。
 *
 * @param content - 用户消息文本内容
 * @param intent - 前端传入的 intent 标识（可选）
 * @returns true 表示应启动 Workflow
 */
function shouldStartWorkflow(content: string, intent?: string): boolean {
  if (intent && /a2ui|ui|create_ui|generate|modify|workflow/i.test(intent))
    return true;
  return WORKFLOW_INTENT_RE.test(content);
}

/**
 * 将 Prisma Message 实体转换为 MessageDto。
 *
 * @param m - Prisma 查询返回的 Message 实体（可能为 null）
 * @returns 转换后的 DTO，实体不存在时返回 null
 */
function toMessageDto(
  m: Awaited<ReturnType<typeof messageRepository.findById>>,
): MessageDto | null {
  if (!m) return null;
  return {
    id: m.id,
    sessionId: m.sessionId,
    agentRunId: m.agentRunId,
    workflowId: m.workflowId,
    workflowStepId: m.workflowStepId,
    role: m.role as MessageDto["role"],
    kind: m.kind as MessageDto["kind"],
    content: m.content,
    attachments: m.attachments as MessageDto["attachments"],
    a2uiEventIds: m.a2uiEventIds as string[],
    metadata: m.metadata as MessageDto["metadata"],
    createdAt: m.createdAt.toISOString(),
  };
}

export const messageService = {
  /**
   * 创建用户消息并初始化一个 pending agent_run。
   * 仅当会话状态为 "active" 时允许发送。
   */
  async createUserMessageAndAgentRun(
    sessionId: string,
    content: string,
    attachmentFileIds?: string[],
    options?: { intent?: string },
  ): Promise<SendMessageResponse> {
    const session = await sessionRepository.findById(sessionId);
    if (!session) {
      throw sessionArchived(sessionId);
    }
    if (session.status !== "active") {
      throw sessionArchived(sessionId);
    }

    const activeWorkflow = await workflowService.getActiveWorkflow(sessionId);
    const isNewWorkflow =
      !activeWorkflow && shouldStartWorkflow(content, options?.intent);
    const workflow =
      activeWorkflow ??
      (isNewWorkflow
        ? await workflowService.createWorkflow({
            sessionId,
            title: content.slice(0, 60),
            intent: options?.intent ?? "CREATE_UI",
          })
        : null);

    const message = await messageRepository.create({
      session: { connect: { id: sessionId } },
      workflow: workflow ? { connect: { id: workflow.id } } : undefined,
      role: "user",
      kind: "chat",
      content,
      attachments: attachmentFileIds ?? [],
      metadata: activeWorkflow?.status === "failed_retryable"
        ? { workflowResume: true, resumeWorkflowId: activeWorkflow.id }
        : undefined,
    });

    if (workflow) {
      logger.info(
        `收到 workflow 消息 → session=${SID(sessionId)}, workflow=${SID(workflow.id)}, content=${content.length}字`,
      );

      if (
        activeWorkflow?.status === "failed_retryable" ||
        activeWorkflow?.status === "interrupted"
      ) {
        const resumed =
          activeWorkflow.status === "interrupted"
            ? await workflowService.resumeInterruptedWorkflowFromMessage({
                sessionId,
                workflowId: workflow.id,
                messageId: message.id,
                userMessage: content,
              })
            : await workflowService.resumeFailedStepFromMessage({
                sessionId,
                workflowId: workflow.id,
                messageId: message.id,
                userMessage: content,
              });

        return {
          message: {
            id: message.id,
            role: message.role as MessageDto["role"],
            content: message.content,
          },
          agentRun: resumed.agentRun
            ? {
                id: resumed.agentRun.id,
                status: resumed.agentRun.status,
              }
            : null,
          workflow: resumed.workflow
            ? {
                id: resumed.workflow.id,
                status: resumed.workflow.status,
                currentStepType: resumed.workflow.currentStepType,
              }
            : {
                id: workflow.id,
                status: workflow.status as NonNullable<
                  SendMessageResponse["workflow"]
                >["status"],
                currentStepType: workflow.currentStepType as NonNullable<
                  SendMessageResponse["workflow"]
                >["currentStepType"],
              },
          streamUrl: `/api/sessions/${sessionId}/stream`,
        };
      }

      const advancedWorkflow = isNewWorkflow
        ? await workflowService.startInitialPlanning({
            sessionId,
            workflowId: workflow.id,
            userMessage: content,
          })
        : workflow;

      return {
        message: {
          id: message.id,
          role: message.role as MessageDto["role"],
          content: message.content,
        },
        agentRun: null,
        workflow: {
          id: advancedWorkflow?.id ?? workflow.id,
          status: (advancedWorkflow?.status ?? workflow.status) as NonNullable<
            SendMessageResponse["workflow"]
          >["status"],
          currentStepType: (advancedWorkflow?.currentStepType ??
            workflow.currentStepType) as NonNullable<
            SendMessageResponse["workflow"]
          >["currentStepType"],
        },
        streamUrl: `/api/sessions/${sessionId}/stream`,
      };
    }

    const agentRun = await agentRunRepository.create({
      session: { connect: { id: sessionId } },
      triggerMessageId: message.id,
      status: "pending",
      intent: options?.intent ?? null,
      modelProvider: session.modelProvider,
      modelName: session.modelName,
      modelConfig: session.modelConfig as unknown as Prisma.InputJsonValue,
      attemptCount: 0,
      maxAttempts: 3,
    });

    logger.info(
      `收到用户消息 → session=${SID(sessionId)}, content=${content.length}字, agentRun=${SID(agentRun.id)}`,
    );

    return {
      message: {
        id: message.id,
        role: message.role as MessageDto["role"],
        content: message.content,
      },
      agentRun: {
        id: agentRun.id,
        status: agentRun.status as NonNullable<
          SendMessageResponse["agentRun"]
        >["status"],
      },
      streamUrl: `/api/sessions/${sessionId}/stream`,
    };
  },

  /**
   * 按 session 分页查询消息列表。
   */
  async listBySession(sessionId: string, query: Record<string, unknown>) {
    const { limit, cursor } = parsePagination(query);
    const messages = await messageRepository.findBySessionId(sessionId, {
      limit,
      cursor,
    });
    const items = messages.map((m) => toMessageDto(m)!).filter(Boolean);
    return buildPageResult(items, items.length, limit, (item) => item.id);
  },
};
