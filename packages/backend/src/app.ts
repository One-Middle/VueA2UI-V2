/**
 * Express 应用工厂。
 *
 * 职责：
 * - 创建并配置 Express 应用实例
 * - 注册全局中间件（CORS、JSON 解析、调试日志）
 * - 挂载所有路由模块
 * - 注册 404 和全局错误处理中间件
 *
 * 不负责：HTTP 服务监听、数据库连接、业务逻辑。
 */

import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { errorHandler } from "./utils/errors.js";

// 导入所有路由模块
import { sessionsRouter } from "./routes/sessions.js";
import { messagesRouter } from "./routes/messages.js";
import { agentRunsRouter } from "./routes/agent-runs.js";
import { streamRouter } from "./routes/stream.js";
import { filesRouter } from "./routes/files.js";
import { skillsRouter } from "./routes/skills.js";
import { a2uiRouter } from "./routes/a2ui.js";
import { rendererRouter } from "./routes/renderer.js";
import { exportRouter } from "./routes/export.js";
import { workflowsRouter } from "./routes/workflows.js";

/**
 * 创建并配置 Express 应用实例。
 *
 * @returns 配置完成的 Express 应用，可直接传入 app.listen()
 */
export function createApp() {
  const app = express();

  // 仅在 LOG_LEVEL=debug 时打印 HTTP 请求摘要，避免冗长的请求日志
  app.use((req, _res, next) => {
    if (process.env.LOG_LEVEL === "debug") {
      const start = Date.now();
      _res.on("finish", () => {
        const duration = Date.now() - start;
        logger.debug(`${req.method} ${req.originalUrl} → ${_res.statusCode} (${duration}ms)`);
      });
    }
    next();
  });

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  /** 健康检查端点 */
  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      service: "a2ui-agent-platform-backend",
      env: config.nodeEnv,
    });
  });

  /** Runtime 配置端点 */
  app.get("/api/runtime/config", (_req, res) => {
    res.json({
      modelProvider: "openai-compatible",
      modelName: config.openai.model,
      baseUrlConfigured: Boolean(config.openai.baseUrl),
      apiKeyConfigured: Boolean(config.openai.apiKey),
      temperature: 0.2,
      maxTokens: 8192,
      timeoutMs: 60000,
      maxAttempts: 3,
      catalogId: config.catalog.id,
      catalogVersion: config.catalog.version,
      rendererVersion: config.catalog.rendererVersion,
      platformSkillSource: config.skills.platformSource,
    });
  });

  // 挂载路由
  app.use("/api", sessionsRouter);
  app.use("/api", messagesRouter);
  app.use("/api", agentRunsRouter);
  app.use("/api", streamRouter);
  app.use("/api", filesRouter);
  app.use("/api", skillsRouter);
  app.use("/api", a2uiRouter);
  app.use("/api", rendererRouter);
  app.use("/api", exportRouter);
  app.use("/api", workflowsRouter);

  // 404 handler —— 未匹配到任何路由时返回
  app.use((_req, res) => {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "请求的资源不存在",
        details: {},
      },
    });
  });

  // 全局错误处理中间件（必须在所有路由注册之后）
  app.use(errorHandler);

  return app;
}
