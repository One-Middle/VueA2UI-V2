/**
 * 后端运行配置。
 *
 * 职责：
 * - 从环境变量读取后端运行所需配置。
 * - 为模型、Catalog、平台 Skill 来源提供集中配置入口。
 *
 * 注意：
 * - development 默认从代码读取 platform Skill，便于开发时快速调整。
 * - 非 development 默认从数据库读取 platform Skill，保证生产环境可审计和可管理。
 */

const nodeEnv = process.env.NODE_ENV ?? "development";
const defaultPlatformSkillSource = nodeEnv === "development" ? "code" : "db";
const platformSkillSource = parsePlatformSkillSource(
  process.env.PLATFORM_SKILL_SOURCE ?? defaultPlatformSkillSource,
);

export const config = {
  nodeEnv,
  port: Number(process.env.PORT ?? 3100),
  databaseUrl: process.env.DATABASE_URL,
  skills: {
    platformSource: platformSkillSource,
  },
  openai: {
    baseUrl: process.env.OPENAI_COMPAT_BASE_URL ?? "https://api.openai.com/v1",
    apiKey: process.env.OPENAI_COMPAT_API_KEY ?? "",
    model: process.env.OPENAI_COMPAT_MODEL ?? "gpt-4.1",
    temperature: Number(process.env.OPENAI_COMPAT_TEMPERATURE ?? 0.2),
    maxTokens: Number(process.env.OPENAI_COMPAT_MAX_TOKENS ?? 8192),
    timeoutMs: Number(process.env.OPENAI_COMPAT_TIMEOUT_MS ?? 60000)
  },
  catalog: {
    id: "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json",
    version: "v0.9",
    rendererVersion: "vue3-v0.9"
  }
};

/**
 * 解析 platform Skill 来源配置。
 *
 * @param value - 环境变量 PLATFORM_SKILL_SOURCE 的原始值
 * @returns 规范化后的来源，code 表示代码种子，db 表示数据库
 */
function parsePlatformSkillSource(value: string): "code" | "db" {
  if (value === "code" || value === "db") return value;
  throw new Error(
    `Invalid PLATFORM_SKILL_SOURCE: ${value}. Expected "code" or "db".`,
  );
}
