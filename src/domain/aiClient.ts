import type { AiSettings } from "./aiSettings";
import type { ChatCompletionRequest } from "./aiWriting";
import { extractBalancedJson, extractJsonPayload, precleanModelText } from "./jsonRecovery";

type FetchLike = typeof fetch;

export type AiErrorCode =
  | "missing-key"
  | "cors"
  | "network"
  | "http"
  | "parse"
  | "parse-truncated"
  | "parse-nonjson"
  | "aborted";

export type AiResult<T> =
  | { ok: true; data: T; rawText?: string; finishReason?: string }
  | { ok: false; code: AiErrorCode; message: string; status?: number; rawText?: string };

export interface AiCallOptions {
  signal?: AbortSignal;
  onDelta?: (delta: string) => void;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
    delta?: {
      content?: string;
    };
    finish_reason?: string;
  }>;
}

interface ChatTextResult {
  content: string;
  finishReason?: string;
}

interface JsonRetryState {
  retriedEscalation?: boolean;
  retriedCorrection?: boolean;
}

/** 是否运行在 Tauri 桌面端。桌面端经 tauri-plugin-http 直连模型，不受浏览器 CORS 限制。 */
export function isTauriRuntime(): boolean {
  return (
    typeof window !== "undefined" &&
    ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  );
}

/** 默认 fetch：桌面端优先用 tauri-plugin-http（绕过 CORS），网页端回退浏览器 fetch。 */
export async function resolveFetchLike(): Promise<FetchLike> {
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
  fetcher?: FetchLike,
  options?: AiCallOptions,
  retryState: JsonRetryState = {}
): Promise<AiResult<T>> {
  const textResult = await callChatCompletionsText(settings, request, fetcher, options);
  if (!textResult.ok) {
    return textResult;
  }

  const data = safeJsonParse<T>(textResult.data);
  if (!data) {
    const code = classifyParseFailure(textResult.data, textResult.finishReason);
    if (!retryState.retriedEscalation && code === "parse-truncated") {
      const previousMaxTokens = typeof request.max_tokens === "number" && Number.isFinite(request.max_tokens)
        ? request.max_tokens
        : settings.maxTokens;
      return callChatCompletionsJson<T>(
        settings,
        {
          ...request,
          stream: false,
          max_tokens: Math.min(Math.max(previousMaxTokens * 2, previousMaxTokens + 1024), 32000),
        },
        fetcher,
        options,
        { ...retryState, retriedEscalation: true }
      );
    }
    if (!retryState.retriedCorrection && (code === "parse" || code === "parse-nonjson")) {
      return callChatCompletionsJson<T>(
        settings,
        buildJsonCorrectionRequest(request, textResult.data),
        fetcher,
        options,
        { ...retryState, retriedCorrection: true }
      );
    }
    return {
      ok: false,
      code,
      message: code === "parse-truncated"
        ? "模型返回的 JSON 不完整，可能因为输出被截断。"
        : code === "parse-nonjson"
          ? "模型没有返回 JSON 内容。"
          : "模型返回内容不是可解析的 JSON。",
      rawText: textResult.data,
    };
  }

  return { ok: true, data, rawText: textResult.data, ...(textResult.finishReason ? { finishReason: textResult.finishReason } : {}) };
}

export async function callChatCompletionsText(
  settings: AiSettings,
  request: ChatCompletionRequest,
  fetcher?: FetchLike,
  options: AiCallOptions = {}
): Promise<AiResult<string>> {
  if (!settings.apiKey.trim()) {
    return {
      ok: false,
      code: "missing-key",
      message: "未配置 API Key，请点击顶栏「模型设置」填写。",
    };
  }

  const doFetch = fetcher ?? (await resolveFetchLike());
  const url = `${settings.baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const body = buildRequestBody(settings, request);

  try {
    const response = await doFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiKey}`,
      },
      signal: options.signal,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const rawText = await safeResponseText(response);
      if (shouldRetryWithoutResponseFormat(response.status, rawText, body)) {
        return callChatCompletionsText(
          settings,
          addJsonOnlyInstruction({ ...request, response_format: undefined }),
          doFetch,
          options
        );
      }
      return {
        ok: false,
        code: "http",
        status: response.status,
        message: extractHttpErrorMessage(response.status, rawText),
        rawText,
      };
    }

    const result =
      request.stream && response.body
        ? await readSseText(response.body, options.onDelta)
        : await readChatCompletionText(response);
    return {
      ok: true,
      data: result.content,
      rawText: result.content,
      ...(result.finishReason ? { finishReason: result.finishReason } : {}),
    };
  } catch (error) {
    return mapFetchError(error, options.signal);
  }
}

export function safeJsonParse<T>(input: string): T | null {
  const normalized = extractJsonPayload(input);
  if (!normalized) {
    return null;
  }

  try {
    return JSON.parse(normalized) as T;
  } catch {
    return null;
  }
}

function classifyParseFailure(
  input: string,
  finishReason?: string
): Extract<AiErrorCode, "parse" | "parse-truncated" | "parse-nonjson"> {
  if (finishReason === "length") {
    return "parse-truncated";
  }
  const cleaned = precleanModelText(input);
  if (/^\s*[{[]/.test(cleaned) && !extractBalancedJson(cleaned)) {
    return "parse-truncated";
  }
  return /[{[]/.test(cleaned) ? "parse" : "parse-nonjson";
}

function addJsonOnlyInstruction(request: ChatCompletionRequest): ChatCompletionRequest {
  return {
    ...request,
    messages: [
      {
        role: "system",
        content: "严格只输出 JSON 本体：以 { 开始、以 } 结束，禁止任何解释、思考过程与 markdown 围栏。",
      },
      ...request.messages,
    ],
  };
}

function buildJsonCorrectionRequest(request: ChatCompletionRequest, rawText: string): ChatCompletionRequest {
  return {
    ...request,
    stream: false,
    messages: [
      ...request.messages,
      { role: "assistant", content: rawText.slice(0, 4000) },
      {
        role: "user",
        content: "上一次输出不是完整 JSON。请修正为完整 JSON，只输出 JSON，不要解释，不要 Markdown 围栏。",
      },
    ],
  };
}

function buildRequestBody(settings: AiSettings, request: ChatCompletionRequest): Record<string, unknown> {
  const requestedMaxTokens =
    typeof request.max_tokens === "number" && Number.isFinite(request.max_tokens)
      ? request.max_tokens
      : settings.maxTokens;
  const body: Record<string, unknown> = {
    ...request,
    model: request.model === "openai-compatible-chat-model" ? settings.model : request.model,
    max_tokens: Math.max(settings.maxTokens, requestedMaxTokens),
  };

  if (!shouldOmitTemperature(settings)) {
    body.temperature = settings.temperature;
  } else {
    delete body.temperature;
  }

  if (!request.response_format) {
    delete body.response_format;
  }

  if (!request.stream) {
    delete body.stream;
  }

  return body;
}

function shouldOmitTemperature(settings: AiSettings): boolean {
  return settings.provider === "kimi" && settings.model.trim().toLowerCase() === "kimi-k2.6";
}

async function readChatCompletionText(response: Response): Promise<ChatTextResult> {
  if (typeof response.json === "function") {
    const payload = (await response.json()) as ChatCompletionResponse;
    const choice = payload.choices?.[0];
    return {
      content: choice?.message?.content ?? "",
      ...(choice?.finish_reason ? { finishReason: choice.finish_reason } : {}),
    };
  }

  const raw = await safeResponseText(response);
  const payload = safeJsonParse<ChatCompletionResponse>(raw);
  const choice = payload?.choices?.[0];
  return {
    content: choice?.message?.content ?? raw,
    ...(choice?.finish_reason ? { finishReason: choice.finish_reason } : {}),
  };
}

async function readSseText(body: ReadableStream<Uint8Array>, onDelta?: (delta: string) => void): Promise<ChatTextResult> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let output = "";
  let finishReason: string | undefined;

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split(/\n\n/);
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const parsed = parseSsePart(part);
      if (parsed === null) {
        continue;
      }
      output += parsed.content;
      finishReason = parsed.finishReason ?? finishReason;
      if (parsed.content) {
        onDelta?.(parsed.content);
      }
    }
  }

  const tail = parseSsePart(buffer);
  if (tail) {
    output += tail.content;
    finishReason = tail.finishReason ?? finishReason;
    if (tail.content) {
      onDelta?.(tail.content);
    }
  }

  return { content: output, ...(finishReason ? { finishReason } : {}) };
}

function parseSsePart(part: string): ChatTextResult | null {
  const dataLines = part
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace(/^data:\s*/, ""));

  let content = "";
  let finishReason: string | undefined;
  for (const data of dataLines) {
    if (!data || data === "[DONE]") {
      continue;
    }

    const payload = safeJsonParse<ChatCompletionResponse>(data);
    const choice = payload?.choices?.[0];
    content += choice?.delta?.content ?? choice?.message?.content ?? "";
    finishReason = choice?.finish_reason ?? finishReason;
  }

  return content || finishReason ? { content, ...(finishReason ? { finishReason } : {}) } : null;
}

async function safeResponseText(response: Response): Promise<string> {
  try {
    return typeof response.text === "function" ? await response.text() : "";
  } catch {
    return "";
  }
}

function shouldRetryWithoutResponseFormat(
  status: number,
  rawText: string,
  body: Record<string, unknown>
): boolean {
  return (
    status === 400 &&
    "response_format" in body &&
    /response_format|json_object|unsupported|not support|不支持/i.test(rawText)
  );
}

function extractHttpErrorMessage(status: number, rawText: string): string {
  const parsed = safeJsonParse<{ error?: { message?: string }; message?: string }>(rawText);
  const message = parsed?.error?.message ?? parsed?.message ?? rawText.trim();
  return message ? `模型接口返回 ${status}：${message}` : `模型接口返回 ${status}。`;
}

function mapFetchError(error: unknown, signal?: AbortSignal): AiResult<string> {
  if (signal?.aborted || (error instanceof DOMException && error.name === "AbortError")) {
    return { ok: false, code: "aborted", message: "已停止生成。" };
  }

  if (!isTauriRuntime()) {
    return {
      ok: false,
      code: "cors",
      message: "浏览器无法直连模型（CORS），请使用桌面版或配置代理。",
    };
  }

  return {
    ok: false,
    code: "network",
    message: "网络请求失败，请检查接口地址与本机网络。",
  };
}
