import { Router, type Request, type Response, type NextFunction } from "express";
import { streamService } from "../services/stream.service.js";

export const streamRouter = Router();

/**
 * GET /api/sessions/:sessionId/stream —— SSE 连接
 * 客户端通过此端点建立长连接，接收实时事件推送。
 */
streamRouter.get(
  "/sessions/:sessionId/stream",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.sessionId as string;
      streamService.connect(sessionId, res);
    } catch (err) {
      next(err);
    }
  }
);
