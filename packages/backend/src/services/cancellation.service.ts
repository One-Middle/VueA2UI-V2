/**
 * AgentRun 取消令牌注册表。
 *
 * 职责：
 * - 记录当前进程内正在执行的 AgentRun 取消状态。
 * - 为用户主动停止提供快速内存信号。
 *
 * 不负责：持久化取消事实；数据库中的 AgentRun / Workflow 状态仍是事实源。
 */

type CancellationToken = {
  agentRunId: string;
  cancelled: boolean;
  reason: string | null;
};

const tokens = new Map<string, CancellationToken>();

export const cancellationService = {
  /** 注册一个运行中的 AgentRun。 */
  register(agentRunId: string) {
    const token: CancellationToken = {
      agentRunId,
      cancelled: false,
      reason: null,
    };
    tokens.set(agentRunId, token);
    return token;
  },

  /** 标记 AgentRun 已请求取消。 */
  cancel(agentRunId: string, reason = "user_cancelled") {
    const token = tokens.get(agentRunId);
    if (token) {
      token.cancelled = true;
      token.reason = reason;
    }
  },

  /** 判断 AgentRun 是否已请求取消。 */
  isCancelled(agentRunId: string) {
    return tokens.get(agentRunId)?.cancelled === true;
  },

  /** 注销运行结束的 AgentRun。 */
  unregister(agentRunId: string) {
    tokens.delete(agentRunId);
  },

  /** 当前进程是否仍认为 AgentRun 正在运行。 */
  has(agentRunId: string) {
    return tokens.has(agentRunId);
  },
};
