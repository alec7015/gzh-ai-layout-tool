export interface AiSettings {
  baseUrl: string;
  model: string;
  apiKey: string;
}

export interface SettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): unknown;
}

const SETTINGS_KEY = "gzh-ai-settings";

export function createDefaultAiSettings(): AiSettings {
  return {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4.1-mini",
    apiKey: "",
  };
}

export function normalizeAiSettings(settings: AiSettings): AiSettings {
  return {
    baseUrl: settings.baseUrl.trim().replace(/\/+$/, ""),
    model: settings.model.trim(),
    apiKey: settings.apiKey.trim(),
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
    return normalizeAiSettings({
      ...createDefaultAiSettings(),
      ...(JSON.parse(raw) as Partial<AiSettings>),
    });
  } catch {
    return createDefaultAiSettings();
  }
}

export function saveAiSettings(
  storage: SettingsStorage | undefined,
  settings: AiSettings
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
