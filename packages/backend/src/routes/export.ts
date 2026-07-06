import { Router, type Request, type Response, type NextFunction } from "express";
import { exportService } from "../services/export.service.js";

export const exportRouter = Router();

/**
 * GET /api/sessions/:sessionId/export —— 导出完整会话数据
 */
exportRouter.get(
  "/sessions/:sessionId/export",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.sessionId as string;
      const result = await exportService.exportSession(sessionId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/sessions/:sessionId/export/a2ui.jsonl —— 导出 JSONL 格式
 */
exportRouter.get(
  "/sessions/:sessionId/export/a2ui.jsonl",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.sessionId as string;
      const jsonl = await exportService.exportA2UIJSONL(sessionId);
      res.setHeader("Content-Type", "application/x-ndjson");
      res.setHeader("Content-Disposition", `attachment; filename="a2ui-${sessionId}.jsonl"`);
      res.send(jsonl);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/sessions/:sessionId/export/snapshot.json —— 导出快照 JSON
 */
exportRouter.get(
  "/sessions/:sessionId/export/snapshot.json",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.sessionId as string;
      const snapshot = await exportService.exportSnapshot(sessionId);
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="snapshot-${sessionId}.json"`
      );
      res.send(snapshot);
    } catch (err) {
      next(err);
    }
  }
);
