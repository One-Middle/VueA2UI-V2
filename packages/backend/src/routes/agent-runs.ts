import { Router, type Request, type Response, type NextFunction } from "express";
import { agentRunService } from "../services/agent-run.service.js";

export const agentRunsRouter = Router();

/**
 * GET /api/sessions/:sessionId/agent-runs —— 获取 agent run 列表
 */
agentRunsRouter.get(
  "/sessions/:sessionId/agent-runs",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.sessionId as string;
      const result = await agentRunService.getRuns(sessionId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/sessions/:sessionId/agent-runs/:agentRunId —— 获取 agent run 详情
 */
agentRunsRouter.get(
  "/sessions/:sessionId/agent-runs/:agentRunId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.sessionId as string;
      const agentRunId = req.params.agentRunId as string;
      const result = await agentRunService.getRunDetail(sessionId, agentRunId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);
