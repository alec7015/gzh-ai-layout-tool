import type { AiSettings } from "./aiSettings";
import type { ChatCompletionRequest } from "./aiWriting";

type FetchLike = typeof fetch;

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export async function callChatCompletionsJson<T>(
  settings: AiSettings,
  request: ChatCompletionRequest,
  fetcher: FetchLike = fetch
): Promise<T | null> {
  if (!settings.apiKey.trim()) {
    return null;
  }

  try {
    const response = await fetcher(`${settings.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        ...request,
        model: request.model === "openai-compatible-chat-model" ? settings.model : request.model,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ChatCompletionResponse;
    const content = payload.choices?.[0]?.message?.content;
    return content ? safeJsonParse<T>(content) : null;
  } catch {
    return null;
  }
}

export function safeJsonParse<T>(input: string): T | null {
  const normalized = input
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(normalized) as T;
  } catch {
    return null;
  }
}
