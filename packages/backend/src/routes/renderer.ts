import { Router, type Request, type Response, type NextFunction } from "express";
import { rendererEventService } from "../services/renderer-event.service.js";

export const rendererRouter = Router();

/**
 * POST /api/sessions/:sessionId/renderer/action —— 记录 renderer action
 */
rendererRouter.post(
  "/sessions/:sessionId/renderer/action",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.sessionId as string;
      const result = await rendererEventService.recordAction(sessionId, req.body);
      res.status(202).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/sessions/:sessionId/renderer/error —— 记录 renderer error
 */
rendererRouter.post(
  "/sessions/:sessionId/renderer/error",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.sessionId as string;
      const result = await rendererEventService.recordError(sessionId, req.body);
      res.status(202).json(result);
    } catch (err) {
      next(err);
    }
  }
);
