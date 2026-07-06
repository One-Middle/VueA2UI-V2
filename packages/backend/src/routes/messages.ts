import { Router, type Request, type Response, type NextFunction } from "express";
import { messageService } from "../services/message.service.js";
import { agentRunService } from "../services/agent-run.service.js";
import { sendMessageSchema, validate } from "../utils/validation.js";

export const messagesRouter = Router();

/**
 * GET /api/sessions/:sessionId/messages —— 获取消息列表（分页）
 */
messagesRouter.get(
  "/sessions/:sessionId/messages",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.sessionId as string;
      const result = await messageService.listBySession(sessionId, req.query as Record<string, unknown>);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/sessions/:sessionId/messages —— 发送用户消息，触发 agent run
 * 返回 202，异步启动 agent 执行。
 */
messagesRouter.post(
  "/sessions/:sessionId/messages",
  validate(sendMessageSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { content, attachmentFileIds, options } = req.body;
      const sessionId = req.params.sessionId as string;

      // 创建用户消息和 pending agent_run
      const result = await messageService.createUserMessageAndAgentRun(
        sessionId,
        content,
        attachmentFileIds,
        options
      );

      // 异步启动 agent run（不阻塞响应）
      agentRunService.executeRun(result.agentRun.id, sessionId, content);

      res.status(202).json(result);
    } catch (err) {
      next(err);
    }
  }
);
