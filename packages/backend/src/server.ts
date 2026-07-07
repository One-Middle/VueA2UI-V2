import type { Server } from "node:http";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./db.js";
import { logger } from "./logger.js";

const app = createApp();
let server: Server | null = null;
let shuttingDown = false;

try {
  await prisma.$connect();
  logger.info("Prisma connected");

  server = app.listen(config.port, () => {
    logger.info({ port: config.port }, "Backend server started");
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      logger.error({ port: config.port }, "Backend port is already in use");
      void gracefulShutdown("EADDRINUSE", 1);
      return;
    }

    logger.error({ err }, "Backend server error");
    void gracefulShutdown("SERVER_ERROR", 1);
  });
} catch (err: unknown) {
  logger.error({ err }, "Database connection failed");
  process.exit(1);
}

async function gracefulShutdown(signal: string, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({ signal }, "Graceful shutdown started");

  try {
    if (server?.listening) {
      await new Promise<void>((resolve, reject) => {
        server?.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      logger.info("HTTP server closed");
    }

    await prisma.$disconnect();
    logger.info("Prisma disconnected");
    process.exit(exitCode);
  } catch (err: unknown) {
    logger.error({ err }, "Graceful shutdown failed");
    process.exit(1);
  }
}

process.on("SIGTERM", () => void gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => void gracefulShutdown("SIGINT"));
