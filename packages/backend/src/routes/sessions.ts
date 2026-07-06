import { Router, type Request, type Response, type NextFunction } from "express";
import { sessionService } from "../services/session.service.js";
import { createSessionSchema, updateSessionSchema, validate } from "../utils/validation.js";

export const sessionsRouter = Router();

/**
 * POST /api/sessions —— 创建新会话
 */
sessionsRouter.post(
  "/sessions",
  validate(createSessionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await sessionService.create(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/sessions —— 获取会话列表（支持分页）
 */
sessionsRouter.get("/sessions", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await sessionService.list({
      status: req.query.status as string | undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      cursor: req.query.cursor as string | null | undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/sessions/:sessionId —— 获取会话详情（含当前快照和已启用 skill）
 */
sessionsRouter.get("/sessions/:sessionId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.params.sessionId as string;
    const result = await sessionService.getById(sessionId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/sessions/:sessionId —— 更新会话
 */
sessionsRouter.patch(
  "/sessions/:sessionId",
  validate(updateSessionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.sessionId as string;
      const result = await sessionService.update(sessionId, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);
