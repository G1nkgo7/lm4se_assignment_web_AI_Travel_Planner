import axios, { AxiosError } from "axios";
import { config } from "../config";

type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface CompletionChoice {
  message?: {
    content?: string;
  };
}

interface CompletionResponse {
  choices?: CompletionChoice[];
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

function createRequestBody(messages: ChatMessage[]) {
  return {
    model: config.llm.model,
    messages,
    temperature: 0.3,
    response_format: { type: "json_object" }
  };
}

function buildAuthHeader(): string {
  if (!config.llm.apiKey) {
    throw new Error("LLM_API_KEY 未配置");
  }
  return `Bearer ${config.llm.apiKey}`;
}

export async function runChatCompletion(messages: ChatMessage[]): Promise<string> {
  const endpoint = config.llm.apiBaseUrl;
  try {
    const response = await axios.post<CompletionResponse>(endpoint, createRequestBody(messages), {
      headers: {
        Authorization: buildAuthHeader(),
        "Content-Type": "application/json"
      },
      timeout: 25000
    });

    if (response.data?.error) {
      const { message, code } = response.data.error;
      throw new Error(`百炼API错误: ${code ?? "unknown"} ${message ?? ""}`.trim());
    }

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("百炼API未返回内容");
    }

    return content;
  } catch (error) {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const detail = typeof error.response?.data === "string" ? error.response?.data : JSON.stringify(error.response?.data);
      throw new Error(`百炼API请求失败(${status ?? "unknown"}): ${detail ?? error.message}`);
    }
    throw error;
  }
}
