export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL,
  openai: {
    baseUrl: process.env.OPENAI_COMPAT_BASE_URL ?? "https://api.openai.com/v1",
    apiKey: process.env.OPENAI_COMPAT_API_KEY ?? "",
    model: process.env.OPENAI_COMPAT_MODEL ?? "gpt-4.1"
  },
  catalog: {
    id: "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json",
    version: "v0.9",
    rendererVersion: "vue3-v0.9"
  }
};
