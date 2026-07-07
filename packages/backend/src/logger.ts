/**
 * Backend 日志模块
 *
 * 开发模式使用 pino-pretty 输出人类可读的彩色日志。
 * 生产模式使用 pino 默认 JSON 格式。
 */

import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = isDev
  ? pino({
      level: process.env.LOG_LEVEL ?? "info",
      transport: {
        target: "pino-pretty",
        options: {
          translateTime: "HH:MM:ss",
          ignore: "pid,hostname,req,res,responseTime",
          messageFormat: "{msg}",
          singleLine: true,
          colorize: true,
        },
      },
      serializers: {
        req: () => undefined,
        res: () => undefined,
        err: pino.stdSerializers.err,
      },
    })
  : pino({
      level: process.env.LOG_LEVEL ?? "info",
    });
