import type { JsonObject } from "@a2ui-platform/shared";

/**
 * 统一的应用层错误，包含 HTTP 状态码、错误码和消息。
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

export function notFound(entity: string, id?: string): AppError {
  const msg = id ? `${entity} (${id}) 不存在` : `${entity} 不存在`;
  return new AppError(404, "NOT_FOUND", msg);
}

export function badRequest(message: string, code = "BAD_REQUEST", details?: JsonObject): AppError {
  return new AppError(400, code, message, details);
}

export function conflict(message: string, code = "CONFLICT", details?: JsonObject): AppError {
  return new AppError(409, code, message, details);
}

export function validationFailed(message: string, details?: JsonObject): AppError {
  return new AppError(400, "VALIDATION_FAILED", message, details);
}

export function unprocessableEntity(message: string, code = "UNPROCESSABLE_ENTITY", details?: JsonObject): AppError {
  return new AppError(422, code, message, details);
}

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
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "服务器内部错误",
      details: {},
    },
  });
}
