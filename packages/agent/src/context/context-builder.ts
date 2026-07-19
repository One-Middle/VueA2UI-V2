import type { AgentRunInput } from "@a2ui-platform/shared";
import { A2UI_GENERATION_SKILL } from "../skills/a2ui-v0.9-generation.js";

/** Agent Runtime 可用的 Skill 数据。 */
export type AgentContextSkill = AgentRunInput["enabledSkills"][number];

// ─── AgentContext 接口 ──────────────────────────────────────

/** 构建完成的 Agent 上下文，供 Prompt 使用。 */
export interface AgentContext {
  /** 原始用户消息 */
  userMessage: string;
  /** 格式化的最近消息历史文本 */
  recentMessages: string;
  /** 上传文件内容拼接文本 */
  uploadedFiles: string;
  /** 启用的 Skills 内容拼接文本 */
  enabledSkills: string;
  /** 启用的 Skill 原始列表，供 Runtime 按需披露内容 */
  enabledSkillList: AgentContextSkill[];
  /** 当前 snapshot 的 JSON 摘要 */
  currentSnapshotSummary: string;
  /** 可用组件名称列表 */
  catalogSummary: string;
}

// ─── 常量 ──────────────────────────────────────────────────

/** 最近消息条数上限 */
const MAX_RECENT_MESSAGES = 20;
/** 单文件内容截断上限（字符数） */
const MAX_FILE_CONTENT_LENGTH = 8000;

// ─── AgentContextBuilder ────────────────────────────────────

export class AgentContextBuilder {
  /**
   * 根据 AgentRunInput 构建完整的 AgentContext。
   */
  buildContext(input: AgentRunInput): AgentContext {
    const enabledSkills = this.mergeBuiltinSkills(input.enabledSkills);

    return {
      userMessage: input.userMessage,
      recentMessages: this.buildRecentMessages(input.recentMessages),
      uploadedFiles: this.buildUploadedFiles(input.uploadedFiles),
      enabledSkills: this.buildEnabledSkills(enabledSkills),
      enabledSkillList: enabledSkills,
      currentSnapshotSummary: this.buildSnapshotSummary(input.currentSnapshot),
      catalogSummary: this.buildCatalogSummary(input.catalogId),
    };
  }

  // ─── 私有辅助方法 ──────────────────────────────────────

  /**
   * 格式化最近消息历史（最近 20 条）。
   */
  private buildRecentMessages(
    messages: Array<{ role: string; content: string }>,
  ): string {
    if (!messages || messages.length === 0) {
      return "（无历史消息）";
    }

    const recent = messages.slice(-MAX_RECENT_MESSAGES);

    const lines: string[] = ["## 最近消息历史"];
    for (let i = 0; i < recent.length; i++) {
      const m = recent[i]!;
      const roleLabel = this.translateRole(m.role);
      // 截断过长的消息内容
      const content =
        m.content.length > 2000
          ? m.content.slice(0, 2000) + "...（已截断）"
          : m.content;
      lines.push(`[${i + 1}] ${roleLabel}：${content}`);
    }

    return lines.join("\n");
  }

  /**
   * 拼接上传文件的内容，每个文件截断到 8000 字符。
   */
  private buildUploadedFiles(
    files: Array<{ id: string; originalName: string; content: string }>,
  ): string {
    if (!files || files.length === 0) {
      return "（无上传文件）";
    }

    const parts: string[] = ["## 上传文件内容"];
    for (let i = 0; i < files.length; i++) {
      const f = files[i]!;
      const truncated =
        f.content.length > MAX_FILE_CONTENT_LENGTH
          ? f.content.slice(0, MAX_FILE_CONTENT_LENGTH) + "\n...（文件过长，已截断）"
          : f.content;
      parts.push(`### 文件 ${i + 1}：${f.originalName}`);
      parts.push(truncated);
      parts.push("");
    }

    return parts.join("\n");
  }

  /**
   * 拼接启用的 Skills 内容。
   */
  private buildEnabledSkills(
    skills: AgentContextSkill[],
  ): string {
    if (!skills || skills.length === 0) {
      return "（无启用的 Skills）";
    }

    const parts: string[] = ["## 启用的 Skills 摘要"];
    for (const s of skills) {
      parts.push(`- id: ${s.id}`);
      parts.push(`  name: ${s.name}`);
      parts.push(`  description: ${s.description?.trim() || "（无描述）"}`);
      parts.push("");
    }

    return parts.join("\n");
  }

  /**
   * 合并运行时始终可用的基础 Skill，并避免与后端传入的同 id/name Skill 重复。
   */
  private mergeBuiltinSkills(skills: AgentContextSkill[]): AgentContextSkill[] {
    const hasA2uiGenerationSkill = skills.some(
      (skill) =>
        skill.id === A2UI_GENERATION_SKILL.id ||
        skill.name === A2UI_GENERATION_SKILL.name,
    );

    if (hasA2uiGenerationSkill) {
      return skills;
    }

    return [A2UI_GENERATION_SKILL, ...skills];
  }

  /**
   * 从当前 snapshot 生成文本摘要。
   */
  private buildSnapshotSummary(snapshot: AgentRunInput["currentSnapshot"]): string {
    if (!snapshot) {
      return "（当前无 UI 状态）";
    }

    const surfaces = snapshot.surfaces ?? {};
    const surfaceIds = Object.keys(surfaces);
    if (surfaceIds.length === 0) {
      return "（当前无 UI 状态）";
    }

    const parts: string[] = ["## 当前 UI 状态摘要"];

    for (const surfaceId of surfaceIds) {
      const surface = surfaces[surfaceId];
      if (!surface) continue;

      const componentIds = Object.keys(surface.components ?? {});
      parts.push(`- Surface: "${surfaceId}"，catalog: ${surface.catalogId}`);
      parts.push(`  包含 ${componentIds.length} 个组件：${componentIds.join(", ")}`);
    }

    return parts.join("\n");
  }

  /**
   * 生成 Catalog 摘要信息。
   */
  private buildCatalogSummary(catalogId: string): string {
    return `当前使用的 Catalog: ${catalogId}`;
  }

  /**
   * 将角色翻译为中文。
   */
  private translateRole(role: string): string {
    switch (role) {
      case "user":
        return "用户";
      case "assistant":
        return "助手";
      case "system":
        return "系统";
      case "tool":
        return "工具";
      default:
        return role;
    }
  }
}
