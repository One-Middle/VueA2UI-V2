import cors from "cors";
import express from "express";
import pinoHttp from "pino-http";
import { config } from "./config";
import { logger } from "./logger";

export function createApp() {
  const app = express();

  app.use(pinoHttp({ logger }));
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      service: "a2ui-agent-platform-backend",
      env: config.nodeEnv
    });
  });

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
      rendererVersion: config.catalog.rendererVersion
    });
  });

  return app;
}
