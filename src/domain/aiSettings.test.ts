import { describe, expect, it } from "vitest";
import {
  AI_PROVIDER_PRESETS,
  createDefaultAiSettings,
  loadAiSettings,
  maskApiKey,
  normalizeAiSettings,
  saveAiSettings,
} from "./aiSettings";

describe("aiSettings", () => {
  it("normalizes OpenAI-compatible endpoint settings", () => {
    const settings = normalizeAiSettings({
      baseUrl: "https://api.example.com/v1/",
      model: " deepseek-chat ",
      apiKey: " sk-test ",
    });

    expect(settings.baseUrl).toBe("https://api.example.com/v1");
    expect(settings.model).toBe("deepseek-chat");
    expect(settings.apiKey).toBe("sk-test");
    expect(settings.temperature).toBe(0.7);
    expect(settings.maxTokens).toBe(4096);
  });

  it("persists settings with a storage adapter", () => {
    const storage = new Map<string, string>();
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    };

    saveAiSettings(adapter, {
      baseUrl: "https://api.example.com/v1",
      model: "kimi-k2",
      apiKey: "secret-key",
    });

    expect(loadAiSettings(adapter).model).toBe("kimi-k2");
  });

  it("falls back to defaults and masks keys safely", () => {
    const defaults = createDefaultAiSettings();

    expect(defaults.baseUrl).toContain("/v1");
    expect(maskApiKey("sk-abcdefghijklmnopqrstuvwxyz")).toBe("sk-a...wxyz");
    expect(maskApiKey("short")).toBe("已设置");
  });

  it("provides editable provider presets for common OpenAI-compatible services", () => {
    expect(AI_PROVIDER_PRESETS.map((preset) => preset.provider)).toEqual([
      "openai",
      "deepseek",
      "kimi",
      "qwen",
      "zai",
      "custom",
    ]);
    expect(AI_PROVIDER_PRESETS.find((preset) => preset.provider === "kimi")).toMatchObject({
      baseUrl: "https://api.moonshot.cn/v1",
      model: "kimi-k2.6",
    });
  });

  it("migrates older saved settings to the extended shape", () => {
    const storage = new Map<string, string>();
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    };
    storage.set(
      "gzh-ai-settings",
      JSON.stringify({ baseUrl: "https://api.deepseek.com/v1/", model: "deepseek-chat", apiKey: " secret " })
    );

    expect(loadAiSettings(adapter)).toMatchObject({
      provider: "custom",
      baseUrl: "https://api.deepseek.com/v1",
      model: "deepseek-chat",
      apiKey: "secret",
      temperature: 0.7,
      maxTokens: 4096,
    });
  });
});
