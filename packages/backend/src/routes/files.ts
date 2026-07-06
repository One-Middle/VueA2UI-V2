import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { fileService } from "../services/file.service.js";

const upload = multer({ dest: "uploads/", limits: { fileSize: 1 * 1024 * 1024 } });

export const filesRouter = Router();

/**
 * POST /api/sessions/:sessionId/files —— 上传文件
 */
filesRouter.post(
  "/sessions/:sessionId/files",
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: { code: "NO_FILE", message: "未提供文件", details: {} } });
        return;
      }
      const sessionId = req.params.sessionId as string;
      const result = await fileService.upload(sessionId, req.file);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/sessions/:sessionId/files —— 获取文件列表
 */
filesRouter.get(
  "/sessions/:sessionId/files",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.sessionId as string;
      const result = await fileService.listBySession(sessionId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/sessions/:sessionId/files/:fileId —— 获取文件详情
 */
filesRouter.get(
  "/sessions/:sessionId/files/:fileId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.sessionId as string;
      const fileId = req.params.fileId as string;
      const includeContent = req.query.includeContent === "true";
      const result = await fileService.getById(sessionId, fileId, includeContent);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/sessions/:sessionId/files/:fileId —— 删除文件
 */
filesRouter.delete(
  "/sessions/:sessionId/files/:fileId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.sessionId as string;
      const fileId = req.params.fileId as string;
      await fileService.delete(sessionId, fileId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);
