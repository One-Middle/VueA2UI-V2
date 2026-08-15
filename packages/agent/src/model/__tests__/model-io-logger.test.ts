/**
 * Model IO Logging 纯函数单元测试。
 *
 * 职责：
 * - 验证日志模式解析、文本截断、role 统计、脱敏和 requestId 生成规则
 *
 * 引用：
 * - vitest
 * - model-io-logger
 * 被引用：
 * - Vitest 测试运行器
 * 注意：
 * - 不写入真实日志文件，避免测试污染本地开发 trace。
 */

import { describe, expect, it, vi } from "vitest";
import {
  createModelIORequestId,
  redactSecrets,
  resolveModelIOLogMode,
  summarizeRoles,
  truncateForModelIO,
} from "../model-io-logger.js";

describe("model-io-logger", () => {
  it("解析 MODEL_IO_LOG 模式，未知值按 off 处理", () => {
    expect(resolveModelIOLogMode("summary")).toBe("summary");
    expect(resolveModelIOLogMode("debug")).toBe("debug");
    expect(resolveModelIOLogMode("full")).toBe("full");
    expect(resolveModelIOLogMode("unknown")).toBe("off");
    expect(resolveModelIOLogMode(undefined)).toBe("off");
  });

  it("截断长文本时保留原始长度提示", () => {
    expect(truncateForModelIO("abc", 5)).toBe("abc");
    expect(truncateForModelIO("abcdef", 3)).toContain("原长 6");
  });

  it("统计不同 role 的消息数量和字符数", () => {
    const stats = summarizeRoles([
      { role: "system", content: "abc" },
      { role: "user", content: "hello" },
      { role: "user", content: "世界" },
    ]);

    expect(stats["system"]).toEqual({ count: 1, chars: 3 });
    expect(stats["user"]).toEqual({ count: 2, chars: 7 });
  });

  it("脱敏常见 token 和 key-like 字段", () => {
    const text = [
      "Authorization: Bearer abc.def",
      "Bearer token123",
      "sk-live-secret",
      '"apiKey":"secret-value"',
      "OPENAI_API_KEY=secret",
    ].join("\n");

    const redacted = redactSecrets(text);

    expect(redacted).not.toContain("abc.def");
    expect(redacted).not.toContain("token123");
    expect(redacted).not.toContain("sk-live-secret");
    expect(redacted).not.toContain("secret-value");
    expect(redacted).not.toContain("OPENAI_API_KEY=secret");
    expect(redacted).toContain("[REDACTED]");
  });

  it("生成带日期前缀的 requestId", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.123456);
    expect(createModelIORequestId(new Date("2026-08-14T00:00:00.000Z"))).toMatch(
      /^mi_20260814_/,
    );
    vi.restoreAllMocks();
  });
});
