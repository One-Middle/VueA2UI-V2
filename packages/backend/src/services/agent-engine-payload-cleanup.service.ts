import { agentEngineRepository } from "../repositories/agent-engine.repository.js";
import { logger } from "../logger.js";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
let timer: ReturnType<typeof setInterval> | undefined;

/**
 * 清除已到期的失败原生 payload 密文。
 * 普通语义事件与脱敏摘要不会删除；此服务只履行完整原生 payload 的七天保留策略。
 */
export const agentEnginePayloadCleanupService = {
  async runOnce(now = new Date()): Promise<number> {
    const result = await agentEngineRepository.clearExpiredPayloads(now);
    if (result.count > 0) logger.info({ count: result.count }, "Expired agent engine native payloads cleared");
    return result.count;
  },

  /** 启动每日清理。timer 不阻止 Node 进程正常退出。 */
  start(): void {
    if (timer) return;
    timer = setInterval(() => {
      void this.runOnce().catch((err) => logger.error({ err }, "Agent engine payload cleanup failed"));
    }, ONE_DAY_MS);
    timer.unref?.();
  },

  /** 用于优雅关闭与测试隔离。 */
  stop(): void {
    if (!timer) return;
    clearInterval(timer);
    timer = undefined;
  },
};
