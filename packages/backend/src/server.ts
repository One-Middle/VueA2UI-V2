import { createApp } from "./app.js";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { prisma } from "./db.js";

const app = createApp();

// 启动时连接数据库
prisma.$connect().then(() => {
  logger.info("Prisma 已连接到数据库");

  app.listen(config.port, () => {
    logger.info({ port: config.port }, "Backend server started");
  });
}).catch((err: unknown) => {
  logger.error({ err }, "数据库连接失败，服务退出");
  process.exit(1);
});

// 优雅关闭
async function gracefulShutdown(signal: string) {
  logger.info({ signal }, "收到关闭信号，开始优雅退出");
  try {
    await prisma.$disconnect();
    logger.info("Prisma 连接已关闭");
    process.exit(0);
  } catch (err: unknown) {
    logger.error({ err }, "关闭数据库连接时出错");
    process.exit(1);
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
