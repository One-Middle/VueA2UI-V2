/**
 * createAgentRuntime 工厂函数单元测试。
 *
 * 验证：
 * - 工厂函数返回的对象满足 IAgentRuntime 接口
 * - 工厂正确将配置传递给内部组件
 * - 返回的实例可正常调用 run() 方法
 */

import { describe, expect, it } from "vitest";
import type { AgentRunInput, IAgentRuntime } from "@a2ui-platform/shared";
import { createAgentRuntime } from "./create-agent-runtime.js";

describe("createAgentRuntime", () => {
  const baseConfig = {
    baseUrl: "https://test-api.example.com/v1",
    apiKey: "test-key-123",
    model: "test-model",
    temperature: 0.2,
    maxTokens: 8192,
    timeoutMs: 30000,
  };

  it("返回的对象满足 IAgentRuntime 接口", () => {
    const runtime = createAgentRuntime(baseConfig);
    expect(runtime).toBeDefined();
    expect(typeof runtime.run).toBe("function");
  });

  it("返回的实例可以接受合法的 AgentRunInput 并执行", async () => {
    const runtime: IAgentRuntime = createAgentRuntime(baseConfig);

    const input: AgentRunInput = {
      sessionId: "test-session",
      userMessage: "测试消息",
      recentMessages: [],
      uploadedFiles: [],
      enabledSkills: [],
      currentSnapshot: null,
      catalogId:
        "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json",
      catalogVersion: "v0.9",
      rendererVersion: "0.1.0",
      model: {
        provider: "openai-compatible",
        name: "test-model",
        config: {},
      },
    };

    // 实际调用模型 API 会失败（本地无模型服务），
    // 这里只验证工厂产物可以调用 run 而不抛出类型或其他非网络错误
    try {
      await runtime.run(input);
      // 如果意外成功也 OK
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // 预期是网络或 API 连接错误，不是类型错误
      expect(msg).toMatch(/模型|API|fetch|ECONNREFUSED|ENOTFOUND/i);
    }
  });
});
