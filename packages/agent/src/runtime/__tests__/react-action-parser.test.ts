import { describe, expect, it } from "vitest";
import { parseAgentAction } from "../react-action-parser.js";

describe("parseAgentAction", () => {
  it("解析合法 tool_call", () => {
    const result = parseAgentAction(
      JSON.stringify({
        type: "tool_call",
        reasoningSummary: "需要获取 skill 内容",
        tool: "getSkillContent",
        arguments: { skill: "skill-1" },
      }),
    );

    expect(result.ok).toBe(true);
    if (result.ok && result.action.type === "tool_call") {
      expect(result.action.tool).toBe("getSkillContent");
      expect(result.action.reasoningSummary).toBe("需要获取 skill 内容");
      expect(result.action.arguments).toEqual({ skill: "skill-1" });
    }
  });

  it("解析合法 final_draft", () => {
    const result = parseAgentAction(
      JSON.stringify({
        type: "final_draft",
        reasoningSummary: "产出候选",
        finalKind: "candidate_a2ui_messages",
        draft: { messages: [] },
      }),
    );

    expect(result.ok).toBe(true);
    if (result.ok && result.action.type === "final_draft") {
      expect(result.action.finalKind).toBe("candidate_a2ui_messages");
    }
  });

  it("解析合法 give_up", () => {
    const result = parseAgentAction(
      JSON.stringify({
        type: "give_up",
        reasoningSummary: "无法继续",
        reason: "缺少必要信息",
        recoverable: true,
      }),
    );

    expect(result.ok).toBe(true);
    if (result.ok && result.action.type === "give_up") {
      expect(result.action.recoverable).toBe(true);
    }
  });

  it("拒绝非 JSON", () => {
    const result = parseAgentAction("这不是 JSON，是普通文本");
    expect(result.ok).toBe(false);
  });

  it("拒绝数组（多 action 输出）", () => {
    const result = parseAgentAction(
      JSON.stringify([
        { type: "tool_call", reasoningSummary: "a", tool: "getSkillContent", arguments: {} },
        { type: "final_draft", reasoningSummary: "b", finalKind: "decision_form", draft: {} },
      ]),
    );
    expect(result.ok).toBe(false);
  });

  it("拒绝缺少 reasoningSummary 的 tool_call", () => {
    const result = parseAgentAction(
      JSON.stringify({ type: "tool_call", tool: "getSkillContent", arguments: {} }),
    );
    expect(result.ok).toBe(false);
  });

  it("拒绝未知 action type", () => {
    const result = parseAgentAction(
      JSON.stringify({ type: "observation", reasoningSummary: "x" }),
    );
    expect(result.ok).toBe(false);
  });

  it("拒绝模型生成的 observation（无 type 字段）", () => {
    const result = parseAgentAction(JSON.stringify({ observation: "我看到了一些东西" }));
    expect(result.ok).toBe(false);
  });

  it("拒绝缺少 type 字段", () => {
    const result = parseAgentAction(JSON.stringify({ reasoningSummary: "x" }));
    expect(result.ok).toBe(false);
  });

  it("拒绝非法 tool 名", () => {
    const result = parseAgentAction(
      JSON.stringify({ type: "tool_call", reasoningSummary: "x", tool: "unknownTool", arguments: {} }),
    );
    expect(result.ok).toBe(false);
  });

  it("拒绝缺少 arguments 的 tool_call", () => {
    const result = parseAgentAction(
      JSON.stringify({ type: "tool_call", reasoningSummary: "x", tool: "getSkillContent" }),
    );
    expect(result.ok).toBe(false);
  });

  it("拒绝非法 finalKind", () => {
    const result = parseAgentAction(
      JSON.stringify({ type: "final_draft", reasoningSummary: "x", finalKind: "unknown_kind", draft: {} }),
    );
    expect(result.ok).toBe(false);
  });

  it("拒绝缺少 draft 的 final_draft", () => {
    const result = parseAgentAction(
      JSON.stringify({ type: "final_draft", reasoningSummary: "x", finalKind: "decision_form" }),
    );
    expect(result.ok).toBe(false);
  });

  it("拒绝缺 recoverable 的 give_up", () => {
    const result = parseAgentAction(
      JSON.stringify({ type: "give_up", reasoningSummary: "x", reason: "y" }),
    );
    expect(result.ok).toBe(false);
  });

  it("接受 ```json 围栏包裹的 JSON", () => {
    const result = parseAgentAction(
      "```json\n" +
        JSON.stringify({ type: "give_up", reasoningSummary: "r", reason: "x", recoverable: false }) +
        "\n```",
    );
    expect(result.ok).toBe(true);
  });

  it("拒绝围栏外有额外内容的输出", () => {
    const result = parseAgentAction('好的：\n```json\n{"type":"give_up","reasoningSummary":"r","reason":"x","recoverable":false}\n```');
    expect(result.ok).toBe(false);
  });

  it("拒绝旧 tool-call 文本格式（无 type 字段）", () => {
    const result = parseAgentAction(
      JSON.stringify({ tool: "askClarification", arguments: { fields: [] } }),
    );
    expect(result.ok).toBe(false);
  });
});
