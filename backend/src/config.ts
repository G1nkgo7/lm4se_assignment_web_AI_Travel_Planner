import dotenv from "dotenv";

dotenv.config();

function readEnv(key: string, fallback = "") {
  const value = process.env[key];
  if (!value && !fallback) {
    console.warn(`CONFIG WARN: environment variable ${key} 未设置，将使用空字符串。`);
  }
  return value ?? fallback;
}

export const config = {
  port: Number(process.env.PORT ?? 8080),
  supabase: {
    url: readEnv("SUPABASE_PROJECT_URL"),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  },
  llm: {
    provider: readEnv("LLM_PROVIDER", "mock"),
    apiKey: process.env.LLM_API_KEY ?? "",
    model: process.env.LLM_MODEL ?? "qwen-turbo",
    apiBaseUrl: readEnv("LLM_API_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions")
  },
  mapApiKey: process.env.MAP_API_KEY ?? "",
  speechApiKey: process.env.SPEECH_API_KEY ?? "",
  cacheRedisUrl: process.env.CACHE_REDIS_URL ?? ""
};
