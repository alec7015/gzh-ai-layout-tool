import type { StylePreset } from "./types";

const CUSTOM_STYLES_KEY = "gzh-custom-style-presets";

export interface CustomStyleStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): unknown;
}

export function createCustomStyle(preset: StylePreset, name: string): StylePreset {
  return {
    ...structuredClone(preset),
    id: `custom-${Date.now()}`,
    name: name.trim() || `${preset.name} 调整版`,
    moods: ["自定义", ...preset.moods.filter((mood) => mood !== "自定义")],
  };
}

export function loadCustomStyles(storage: CustomStyleStorage | undefined): StylePreset[] {
  if (!storage) {
    return [];
  }

  const raw = storage.getItem(CUSTOM_STYLES_KEY);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as StylePreset[];
  } catch {
    return [];
  }
}

export function saveCustomStyles(
  storage: CustomStyleStorage | undefined,
  presets: StylePreset[]
): void {
  storage?.setItem(CUSTOM_STYLES_KEY, JSON.stringify(presets));
}
