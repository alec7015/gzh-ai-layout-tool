import { describe, expect, it, vi } from "vitest";
import {
  callChatCompletionsJson,
  callChatCompletionsText,
  safeJsonParse,
  type AiResult,
} from "./aiClient";
import { createDefaultAiSettings } from "./aiSettings";
import { buildWritingRequest } from "./aiWriting";

describe("aiClient", () => {
  it("parses JSON from plain or fenced model output", () => {
    expect(safeJsonParse<{ ok: boolean }>('{"ok":true}')?.ok).toBe(true);
    expect(safeJsonParse<{ ok: boolean }>('```json\n{"ok":true}\n```')?.ok).toBe(true);
    expect(safeJsonParse<{ ok: boolean }>('解释：{"ok":true,}')).toEqual({ ok: true });
    expect(safeJsonParse("not json")).toBeNull();
  });

  it("calls an OpenAI-compatible chat completions endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"title":"测试"}' } }],
      }),
    });
    const settings = {
      ...createDefaultAiSettings(),
      baseUrl: "https://api.example.com/v1",
      apiKey: "secret",
    };

    const result = await callChatCompletionsJson<{ title: string }>(
      settings,
      buildWritingRequest({ topic: "测试", style: "清晰", words: 500 }),
      fetchMock
    );

    expect(result).toEqual({ ok: true, data: { title: "测试" }, rawText: '{"title":"测试"}' });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer secret" }),
      })
    );
  });

  it("returns null when settings do not contain an api key", async () => {
    const result = await callChatCompletionsJson(
      createDefaultAiSettings(),
      buildWritingRequest({ topic: "测试", style: "清晰", words: 500 }),
      vi.fn()
    );

    expect(result).toMatchObject({ ok: false, code: "missing-key" });
  });

  it("maps browser fetch failures to a CORS error", async () => {
    const result = await callChatCompletionsText(
      {
        ...createDefaultAiSettings(),
        apiKey: "secret",
      },
      buildWritingRequest({ topic: "测试", style: "清晰", words: 500 }),
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))
    );

    expect(result).toMatchObject({ ok: false, code: "cors" });
  });

  it("maps http failures with status and provider message", async () => {
    const result = await callChatCompletionsText(
      {
        ...createDefaultAiSettings(),
        apiKey: "secret",
      },
      buildWritingRequest({ topic: "测试", style: "清晰", words: 500 }),
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ error: { message: "invalid key" } }),
      })
    );

    expect(result).toMatchObject({ ok: false, code: "http", status: 401 });
    expect((result as Extract<AiResult<string>, { ok: false }>).message).toContain("invalid key");
  });

  it("retries once without response_format when a provider rejects it", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => "response_format is not supported",
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "重试成功" } }] }),
      });

    const result = await callChatCompletionsText(
      {
        ...createDefaultAiSettings(),
        apiKey: "secret",
      },
      {
        ...buildWritingRequest({ topic: "测试", style: "清晰", words: 500 }),
        response_format: { type: "json_object" },
      },
      fetchMock
    );

    expect(result).toEqual({ ok: true, data: "重试成功", rawText: "重试成功" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retryBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(retryBody).not.toHaveProperty("response_format");
    expect(retryBody.messages[0].content).toContain("严格只输出 JSON 本体");
  });

  it("parses streamed SSE chat completion chunks", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"你"}}]}\n\n'));
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"好"}}]}\n\n'));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
    const onDelta = vi.fn();

    const result = await callChatCompletionsText(
      {
        ...createDefaultAiSettings(),
        apiKey: "secret",
      },
      {
        ...buildWritingRequest({ topic: "测试", style: "清晰", words: 500 }),
        stream: true,
      },
      vi.fn().mockResolvedValue({ ok: true, body: stream }),
      { onDelta }
    );

    expect(result).toEqual({ ok: true, data: "你好", rawText: "你好" });
    expect(onDelta).toHaveBeenCalledWith("你");
    expect(onDelta).toHaveBeenCalledWith("好");
  });

  it("omits temperature for Kimi K2.6 requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "ok" } }] }),
    });

    await callChatCompletionsText(
      {
        ...createDefaultAiSettings(),
        provider: "kimi",
        model: "kimi-k2.6",
        apiKey: "secret",
      },
      buildWritingRequest({ topic: "测试", style: "清晰", words: 500 }),
      fetchMock
    );

    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).not.toHaveProperty("temperature");
  });

  it("escalates max tokens for truncated JSON without replaying partial assistant output", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "不是 JSON 但被截断" }, finish_reason: "length" }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '{"title":"修复"}' } }] }),
      });

    const result = await callChatCompletionsJson<{ title: string }>(
      { ...createDefaultAiSettings(), apiKey: "secret" },
      { ...buildWritingRequest({ topic: "测试", style: "清晰", words: 500 }), max_tokens: 4096, response_format: { type: "json_object" } },
      fetchMock
    );

    expect(result).toEqual({ ok: true, data: { title: "修复" }, rawText: '{"title":"修复"}' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retryBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(retryBody.max_tokens).toBe(8192);
    expect(retryBody.messages.at(-1)).toMatchObject({
      role: "user",
      content: expect.not.stringContaining("修正为完整 JSON"),
    });
  });

  it("retries non-json parse failures once with correction instructions", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "不是 JSON" } }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '{"title":"纠正"}' } }] }),
      });

    const result = await callChatCompletionsJson<{ title: string }>(
      { ...createDefaultAiSettings(), apiKey: "secret" },
      buildWritingRequest({ topic: "测试", style: "清晰", words: 500 }),
      fetchMock
    );

    expect(result).toEqual({ ok: true, data: { title: "纠正" }, rawText: '{"title":"纠正"}' });
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body)).messages.at(-1)).toMatchObject({
      role: "user",
      content: expect.stringContaining("修正为完整 JSON"),
    });
  });

  it("classifies non-json parse failures after a failed correction retry", async () => {
    const result = await callChatCompletionsJson<{ title: string }>(
      { ...createDefaultAiSettings(), apiKey: "secret" },
      buildWritingRequest({ topic: "测试", style: "清晰", words: 500 }),
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: "不是 JSON" } }] }) })
    );

    expect(result).toMatchObject({ ok: false, code: "parse-nonjson" });
  });
});
