/**
 * 后端错误处理模块。
 *
 * 职责：
 * - 定义统一的应用层错误类（AppError），携带 HTTP 状态码和错误码
 * - 提供语义化的错误工厂函数（notFound、badRequest、conflict 等）
 * - 提供 Express 全局错误处理中间件，统一 JSON 错误响应格式
 *
 * 引用：
 * - logger (backend/logger)
 * 被引用：
 * - 所有 service 层和 route 层
 * 注意：
 * - 所有业务错误统一抛出 AppError，由 errorHandler 中间件捕获并转换为 JSON 响应
 * - 不要在各路由中单独 try-catch 返回错误 JSON
 */

import type { JsonObject } from "@a2ui-platform/shared";
import { logger } from "../logger.js";

/**
 * 统一的应用层错误，包含 HTTP 状态码、错误码和消息。
 *
 * 所有 service 层校验失败或业务异常统一抛出此类型的错误，
 * 由全局 errorHandler 中间件统一捕获并转换为 JSON 错误响应。
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: JsonObject;

  constructor(statusCode: number, code: string, message: string, details?: JsonObject) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * 创建"资源不存在"错误（HTTP 404）。
 *
 * @param entity - 实体名称（如 "Session"、"AgentRun"）
 * @param id - 实体 ID，用于在错误消息中指明具体资源
 * @returns AppError 实例，statusCode=404, code="NOT_FOUND"
 */
export function notFound(entity: string, id?: string): AppError {
  const msg = id ? `${entity} (${id}) 不存在` : `${entity} 不存在`;
  return new AppError(404, "NOT_FOUND", msg);
}

/**
 * 创建"请求参数不合法"错误（HTTP 400）。
 *
 * @param message - 人类可读的错误描述
 * @param code - 业务错误码
 * @param details - 附加的上下文信息（如字段级校验详情）
 * @returns AppError 实例，statusCode=400
 */
export function badRequest(message: string, code = "BAD_REQUEST", details?: JsonObject): AppError {
  return new AppError(400, code, message, details);
}

/**
 * 创建"资源冲突"错误（HTTP 409）。
 *
 * 典型场景：同一会话同时有多个进行中的 Workflow、重复创建同名资源等。
 *
 * @param message - 人类可读的错误描述
 * @param code - 业务错误码
 * @param details - 附加的上下文信息
 * @returns AppError 实例，statusCode=409
 */
export function conflict(message: string, code = "CONFLICT", details?: JsonObject): AppError {
  return new AppError(409, code, message, details);
}

/**
 * 创建"参数校验失败"错误（HTTP 400）。
 *
 * 用于 Zod schema 校验失败场景，details 中记录各字段的错误信息。
 *
 * @param message - 人类可读的错误描述
 * @param details - 字段级校验错误映射
 * @returns AppError 实例，statusCode=400, code="VALIDATION_FAILED"
 */
export function validationFailed(message: string, details?: JsonObject): AppError {
  return new AppError(400, "VALIDATION_FAILED", message, details);
}

/**
 * 创建"无法处理的实体"错误（HTTP 422）。
 *
 * 用于请求格式正确但业务逻辑上无法处理的场景。
 *
 * @param message - 人类可读的错误描述
 * @param code - 业务错误码
 * @param details - 附加的上下文信息
 * @returns AppError 实例，statusCode=422
 */
export function unprocessableEntity(message: string, code = "UNPROCESSABLE_ENTITY", details?: JsonObject): AppError {
  return new AppError(422, code, message, details);
}

/**
 * 创建"会话已归档"错误（HTTP 409）。
 *
 * 用于当用户尝试向 archived/deleted 状态的会话发送消息时统一提示。
 *
 * @param sessionId - 归档的会话 ID
 * @returns AppError 实例，statusCode=409, code="SESSION_ARCHIVED"
 */
export function sessionArchived(sessionId: string): AppError {
  return new AppError(409, "SESSION_ARCHIVED", `会话 ${sessionId} 已归档，不能进行操作`);
}

/**
 * 全局错误处理中间件。
 */
export function errorHandler(
  err: unknown,
  _req: import("express").Request,
  res: import("express").Response,
  _next: import("express").NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details ?? {},
      },
    });
    return;
  }

  // 处理 multer 文件过大错误
  if (err && typeof err === "object" && "code" in err && (err as Record<string, unknown>).code === "LIMIT_FILE_SIZE") {
    res.status(413).json({
      error: {
        code: "FILE_TOO_LARGE",
        message: "上传文件过大",
        details: {},
      },
    });
    return;
  }

  // 未知错误
  logger.error({ err }, "Unhandled error");
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "服务器内部错误",
      details: {},
    },
  });
}
