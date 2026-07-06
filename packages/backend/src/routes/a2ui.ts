import { Router, type Request, type Response, type NextFunction } from "express";
import { a2uiEventRepository } from "../repositories/a2ui-event.repository.js";
import { surfaceSnapshotRepository } from "../repositories/surface-snapshot.repository.js";

export const a2uiRouter = Router();

/**
 * GET /api/sessions/:sessionId/a2ui-events —— 获取 A2UI 事件列表
 */
a2uiRouter.get(
  "/sessions/:sessionId/a2ui-events",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.sessionId as string;
      const fromSequence = req.query.fromSequence ? Number(req.query.fromSequence) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const events = await a2uiEventRepository.findBySessionId(sessionId, {
        fromSequence,
        limit,
      });
      const items = events.map((e: Record<string, unknown>) => ({
        id: e.id,
        sessionId: e.sessionId,
        agentRunId: e.agentRunId,
        messageId: e.messageId,
        sequence: e.sequence,
        status: e.status as "committed" | "reverted" | "ignored",
        catalogId: e.catalogId,
        catalogVersion: e.catalogVersion,
        rendererVersion: e.rendererVersion,
        surfaceIds: e.surfaceIds,
        messages: e.messages as Record<string, unknown>[],
        validationResult: e.validationResult as Record<string, unknown>,
        createdAt: (e.createdAt as Date).toISOString(),
      }));
      res.json({ items });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/sessions/:sessionId/surface-snapshots —— 获取快照列表
 */
a2uiRouter.get(
  "/sessions/:sessionId/surface-snapshots",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.sessionId as string;
      const snapshots = await surfaceSnapshotRepository.findBySessionId(sessionId);
      const items = snapshots.map((s: Record<string, unknown>) => ({
        id: s.id,
        sessionId: s.sessionId,
        a2uiEventId: s.a2uiEventId,
        agentRunId: s.agentRunId,
        sequence: s.sequence,
        isCurrent: s.isCurrent,
        catalogId: s.catalogId,
        catalogVersion: s.catalogVersion,
        rendererVersion: s.rendererVersion,
        surfaceCount: s.surfaceCount,
        componentCount: s.componentCount,
        snapshot: s.snapshot as Record<string, unknown>,
        summary: s.summary,
        createdAt: (s.createdAt as Date).toISOString(),
      }));
      res.json({ items });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/sessions/:sessionId/surface-snapshots/current —— 获取当前快照
 */
a2uiRouter.get(
  "/sessions/:sessionId/surface-snapshots/current",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.sessionId as string;
      const snapshot = await surfaceSnapshotRepository.findCurrentBySessionId(sessionId);
      if (!snapshot) {
        res.status(404).json({
          error: { code: "NOT_FOUND", message: "当前快照不存在", details: {} },
        });
        return;
      }
      res.json({
        id: snapshot.id,
        sessionId: snapshot.sessionId,
        a2uiEventId: snapshot.a2uiEventId,
        agentRunId: snapshot.agentRunId,
        sequence: snapshot.sequence,
        isCurrent: snapshot.isCurrent,
        catalogId: snapshot.catalogId,
        catalogVersion: snapshot.catalogVersion,
        rendererVersion: snapshot.rendererVersion,
        surfaceCount: snapshot.surfaceCount,
        componentCount: snapshot.componentCount,
        snapshot: snapshot.snapshot as Record<string, unknown>,
        summary: snapshot.summary,
        createdAt: snapshot.createdAt.toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
);
