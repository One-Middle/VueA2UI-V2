import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import { validationFailed } from "./errors.js";

const skillReferenceSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),
  description: z.string().max(1000).nullable().optional(),
});

/**
 * Session 创建校验。
 */
export const createSessionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  modelName: z.string().max(100).optional(),
});

/**
 * Session 更新校验。
 */
export const updateSessionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  status: z.enum(["active", "archived", "deleted"]).optional(),
});

/**
 * 发送消息校验。
 */
export const sendMessageSchema = z.object({
  content: z.string().min(1, "消息内容不能为空").max(10000),
  attachmentFileIds: z.array(z.string().uuid()).max(10).optional(),
  options: z
    .object({
      intent: z.string().max(50).optional(),
    })
    .optional(),
});

/**
 * Workflow action 校验。
 */
const submitClarificationWorkflowActionSchema = z.object({
  action: z.literal("submit_clarification"),
  workflowStepId: z.string().uuid().optional(),
  artifactId: z.string().uuid(),
  message: z.string().min(1).max(10000).optional(),
  payload: z.object({
    answers: z.record(z.unknown()),
    additionalText: z.string().max(10000).optional(),
  }),
});

const submitDecisionWorkflowActionSchema = z.object({
  action: z.literal("submit_decision"),
  workflowStepId: z.string().uuid().optional(),
  artifactId: z.string().uuid(),
  message: z.string().min(1).max(10000).optional(),
  payload: z.discriminatedUnion("selectedOption", [
    z.object({
      selectedOption: z.literal("confirm"),
      comment: z.never().optional(),
    }),
    z.object({
      selectedOption: z.literal("revise"),
      comment: z.string().trim().min(1).max(10000),
    }),
    z.object({
      selectedOption: z.literal("reject"),
      comment: z.string().max(10000).optional(),
    }),
  ]),
});

const retryWorkflowActionSchema = z.object({
  action: z.literal("retry_step"),
  workflowStepId: z.string().uuid().optional(),
  message: z.string().min(1).max(10000).optional(),
  payload: z.record(z.unknown()).optional(),
});

const cancelWorkflowActionSchema = z.object({
  action: z.literal("cancel"),
  workflowStepId: z.string().uuid().optional(),
  message: z.string().min(1).max(10000).optional(),
  payload: z.record(z.unknown()).optional(),
});

export const workflowActionSchema = z.discriminatedUnion("action", [
  submitClarificationWorkflowActionSchema,
  submitDecisionWorkflowActionSchema,
  retryWorkflowActionSchema,
  cancelWorkflowActionSchema,
]);

/**
 * 创建 Skill 校验。
 */
export const createSkillSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  content: z.string().min(1).max(50000),
  references: z.array(skillReferenceSchema).max(20).optional(),
});

/**
 * 更新 Skill 校验。
 */
export const updateSkillSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  content: z.string().min(1).max(50000).optional(),
  references: z.array(skillReferenceSchema).max(20).optional(),
  isActive: z.boolean().optional(),
});

/**
 * 更新 Runtime 配置校验。
 */
export const updateRuntimeConfigSchema = z.object({
  modelName: z.string().max(100).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().max(128000).optional(),
  timeoutMs: z.number().int().positive().max(300000).optional(),
  maxAttempts: z.number().int().min(1).max(10).optional(),
});

/**
 * 创建 Zod 校验中间件工厂。
 */
export function validate<T>(schema: z.ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.reduce(
        (acc, issue) => {
          const path = issue.path.join(".");
          acc[path || "_"] = issue.message;
          return acc;
        },
        {} as Record<string, string>
      );
      next(validationFailed("请求参数不合法", details));
      return;
    }
    req.body = result.data;
    next();
  };
}
