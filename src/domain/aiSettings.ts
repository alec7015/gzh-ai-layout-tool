export type AiProvider = "openai" | "deepseek" | "kimi" | "qwen" | "zai" | "custom";

export interface AiSettings {
  provider: AiProvider;
  baseUrl: string;
  model: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
}

export interface SettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): unknown;
}

const SETTINGS_KEY = "gzh-ai-settings";
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 4096;

export interface AiProviderPreset {
  provider: AiProvider;
  label: string;
  baseUrl: string;
  model: string;
}

export const AI_PROVIDER_PRESETS: AiProviderPreset[] = [
  {
    provider: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4.1-mini",
  },
  {
    provider: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
  },
  {
    provider: "kimi",
    label: "Kimi",
    baseUrl: "https://api.moonshot.cn/v1",
    model: "kimi-k2.6",
  },
  {
    provider: "qwen",
    label: "Qwen",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-plus",
  },
  {
    provider: "zai",
    label: "Z.AI",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    model: "glm-5.2",
  },
  {
    provider: "custom",
    label: "Custom",
    baseUrl: "https://api.openai.com/v1",
    model: "openai-compatible-chat-model",
  },
];

export function createDefaultAiSettings(): AiSettings {
  return {
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4.1-mini",
    apiKey: "",
    temperature: DEFAULT_TEMPERATURE,
    maxTokens: DEFAULT_MAX_TOKENS,
  };
}

export function normalizeAiSettings(settings: Partial<AiSettings>): AiSettings {
  const defaults = createDefaultAiSettings();
  const provider = isAiProvider(settings.provider) ? settings.provider : "custom";
  return {
    provider,
    baseUrl: (settings.baseUrl ?? defaults.baseUrl).trim().replace(/\/+$/, ""),
    model: (settings.model ?? defaults.model).trim(),
    apiKey: (settings.apiKey ?? "").trim(),
    temperature: clampNumber(settings.temperature, 0, 1, DEFAULT_TEMPERATURE),
    maxTokens: Math.round(clampNumber(settings.maxTokens, 256, 32000, DEFAULT_MAX_TOKENS)),
  };
}

export function loadAiSettings(storage: SettingsStorage | undefined): AiSettings {
  if (!storage) {
    return createDefaultAiSettings();
  }

  const raw = storage.getItem(SETTINGS_KEY);
  if (!raw) {
    return createDefaultAiSettings();
  }

  try {
    return normalizeAiSettings(JSON.parse(raw) as Partial<AiSettings>);
  } catch {
    return createDefaultAiSettings();
  }
}

export function saveAiSettings(
  storage: SettingsStorage | undefined,
  settings: Partial<AiSettings>
): void {
  storage?.setItem(SETTINGS_KEY, JSON.stringify(normalizeAiSettings(settings)));
}

export function maskApiKey(apiKey: string): string {
  const value = apiKey.trim();

  if (!value) {
    return "未设置";
  }

  if (value.length < 12) {
    return "已设置";
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function presetToSettings(
  preset: AiProviderPreset,
  current: AiSettings = createDefaultAiSettings()
): AiSettings {
  return normalizeAiSettings({
    ...current,
    provider: preset.provider,
    baseUrl: preset.baseUrl,
    model: preset.model,
  });
}

function isAiProvider(value: unknown): value is AiProvider {
  return (
    value === "openai" ||
    value === "deepseek" ||
    value === "kimi" ||
    value === "qwen" ||
    value === "zai" ||
    value === "custom"
  );
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numberValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, numberValue));
}
