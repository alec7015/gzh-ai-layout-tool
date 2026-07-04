import { describe, expect, it } from "vitest";
import {
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
});
