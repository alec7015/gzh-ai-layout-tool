import { describe, expect, it, vi } from "vitest";
import { callChatCompletionsJson, safeJsonParse } from "./aiClient";
import { createDefaultAiSettings } from "./aiSettings";
import { buildWritingRequest } from "./aiWriting";

describe("aiClient", () => {
  it("parses JSON from plain or fenced model output", () => {
    expect(safeJsonParse<{ ok: boolean }>('{"ok":true}')?.ok).toBe(true);
    expect(safeJsonParse<{ ok: boolean }>('```json\n{"ok":true}\n```')?.ok).toBe(true);
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

    expect(result).toEqual({ title: "测试" });
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

    expect(result).toBeNull();
  });
});
