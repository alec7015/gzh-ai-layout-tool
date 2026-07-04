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

/** 是否运行在 Tauri 桌面端。桌面端经 tauri-plugin-http 直连模型，不受浏览器 CORS 限制。 */
export function isTauriRuntime(): boolean {
  return (
    typeof window !== "undefined" &&
    ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  );
}

/** 默认 fetch：桌面端优先用 tauri-plugin-http（绕过 CORS），网页端回退浏览器 fetch。 */
async function resolveDefaultFetch(): Promise<FetchLike> {
  if (isTauriRuntime()) {
    try {
      const httpModule = await import("@tauri-apps/plugin-http");
      return httpModule.fetch as unknown as FetchLike;
    } catch {
      // 忽略：回退浏览器 fetch
    }
  }
  return fetch;
}

export async function callChatCompletionsJson<T>(
  settings: AiSettings,
  request: ChatCompletionRequest,
  fetcher?: FetchLike
): Promise<T | null> {
  if (!settings.apiKey.trim()) {
    return null;
  }

  const doFetch = fetcher ?? (await resolveDefaultFetch());

  try {
    const response = await doFetch(`${settings.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
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
