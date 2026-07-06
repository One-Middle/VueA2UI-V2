import { Router, type Request, type Response, type NextFunction } from "express";
import { skillService } from "../services/skill.service.js";
import { createSkillSchema, updateSkillSchema, validate } from "../utils/validation.js";

export const skillsRouter = Router();

/**
 * POST /api/skills —— 创建 Skill
 */
skillsRouter.post(
  "/skills",
  validate(createSkillSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await skillService.create(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/skills —— 获取 Skill 列表
 */
skillsRouter.get("/skills", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await skillService.list(req.query as Record<string, unknown>);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/skills/:skillId —— 更新 Skill
 */
skillsRouter.patch(
  "/skills/:skillId",
  validate(updateSkillSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const skillId = req.params.skillId as string;
      const result = await skillService.update(skillId, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/sessions/:sessionId/skills/:skillId/enable —— 为 session 启用 skill
 */
skillsRouter.post(
  "/sessions/:sessionId/skills/:skillId/enable",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.sessionId as string;
      const skillId = req.params.skillId as string;
      const result = await skillService.enableForSession(sessionId, skillId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/sessions/:sessionId/skills/:skillId/disable —— 为 session 禁用 skill
 */
skillsRouter.post(
  "/sessions/:sessionId/skills/:skillId/disable",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.sessionId as string;
      const skillId = req.params.skillId as string;
      const result = await skillService.disableForSession(sessionId, skillId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);
