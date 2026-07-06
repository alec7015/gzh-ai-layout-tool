import { derivePaletteOverrides } from "./paletteDerive";
import { defaultStylePreset, VARIANT_VOCABULARY } from "./stylePresets";
import type { ChatCompletionRequest } from "./aiWriting";
import type { StylePreset } from "./types";
import type { StyleStats } from "./styleExtract";

export interface ExtractedPresetPatch {
  name?: unknown;
  moods?: unknown;
  palette?: unknown;
  typography?: unknown;
  rhythm?: unknown;
  components?: unknown;
}

export function statsToPreset(stats: StyleStats, name = defaultExtractedStyleName()): StylePreset {
  const primary = stats.colors[0]?.hex ?? defaultStylePreset.palette.primary;
  const paletteOverrides = derivePaletteOverrides(primary);
  return {
    ...structuredClone(defaultStylePreset),
    id: `extracted-${Date.now()}`,
    name,
    moods: ["提取", "自定义"],
    palette: {
      ...defaultStylePreset.palette,
      primary: String(paletteOverrides["palette.primary"] ?? primary),
      secondary: String(paletteOverrides["palette.secondary"] ?? defaultStylePreset.palette.secondary),
      accent: String(paletteOverrides["palette.accent"] ?? defaultStylePreset.palette.accent),
      textSub: String(paletteOverrides["palette.textSub"] ?? defaultStylePreset.palette.textSub),
    },
    typography: {
      ...defaultStylePreset.typography,
      bodySize: clampPx(stats.body.fontSize, 13, 18, defaultStylePreset.typography.bodySize),
      h2Size: clampPx(stats.heading.fontSize, 15, 26, defaultStylePreset.typography.h2Size),
      lineHeight: clampNumber(stats.body.lineHeight, 1.5, 2.2, defaultStylePreset.typography.lineHeight),
      letterSpacing: stats.body.letterSpacing ?? defaultStylePreset.typography.letterSpacing,
    },
    rhythm: {
      ...defaultStylePreset.rhythm,
      paragraphGap: clampPx(stats.body.paragraphGap, 10, 32, defaultStylePreset.rhythm.paragraphGap),
      align: stats.body.align === "center" ? "center" : "left",
    },
    components: {
      ...defaultStylePreset.components,
      heading: { variant: legalVariant("heading", stats.heading.variantGuess, defaultStylePreset.components.heading.variant) },
      quote: { variant: legalVariant("quote", stats.quote.variantGuess, defaultStylePreset.components.quote.variant) },
      divider: { variant: legalVariant("divider", stats.divider.variantGuess, defaultStylePreset.components.divider.variant) },
    },
  };
}

export function buildStyleTransferRequest(stats: StyleStats): ChatCompletionRequest {
  const vocabulary = Object.entries(VARIANT_VOCABULARY)
    .map(([key, values]) => `${key}: ${values.join(" / ")}`)
    .join("\n");

  return {
    model: "openai-compatible-chat-model",
    temperature: 0.25,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "你是公众号版式迁移助手。只根据 StyleStats 裁决版式参数，不接收也不复刻原文内容。只输出 JSON patch。",
      },
      {
        role: "user",
        content:
          `StyleStats:\n${JSON.stringify(stats).slice(0, 1400)}\n\n` +
          `可用组件变体：\n${vocabulary}\n\n` +
          `请输出：{"name":"贴切名称","moods":["风格词"],"palette":{"primary":"#1677ff"},"components":{"heading":"left-color-bar"}}`,
      },
    ],
  };
}

export function coerceExtractedPreset(value: unknown): Partial<StylePreset> | null {
  if (!isRecord(value)) {
    return null;
  }

  const result: Partial<StylePreset> = {};
  if (typeof value.name === "string" && value.name.trim()) {
    result.name = value.name.trim().slice(0, 24);
  }
  if (Array.isArray(value.moods)) {
    result.moods = value.moods.filter((item): item is string => typeof item === "string").map((item) => item.slice(0, 12)).slice(0, 4);
  }
  if (isRecord(value.palette)) {
    const primary = value.palette.primary;
    if (typeof primary === "string" && /^#[0-9a-f]{6}$/i.test(primary)) {
      result.palette = { ...defaultStylePreset.palette, primary };
    }
  }
  if (isRecord(value.typography)) {
    result.typography = {
      ...defaultStylePreset.typography,
      ...(typeof value.typography.bodySize === "string" ? { bodySize: clampPx(value.typography.bodySize, 13, 18, defaultStylePreset.typography.bodySize) } : {}),
      ...(typeof value.typography.lineHeight === "number" ? { lineHeight: clampNumber(value.typography.lineHeight, 1.5, 2.2, defaultStylePreset.typography.lineHeight) } : {}),
    };
  }
  if (isRecord(value.components)) {
    const componentPatch = value.components;
    const components = { ...defaultStylePreset.components };
    (["heading", "quote", "list", "divider"] as const).forEach((key) => {
      const variant = componentPatch[key];
      if (typeof variant === "string" && (VARIANT_VOCABULARY[key] as readonly string[]).includes(variant)) {
        components[key] = { variant };
      }
    });
    result.components = components;
  }

  return Object.keys(result).length ? result : null;
}

export function mergeExtractedPatch(base: StylePreset, patch: Partial<StylePreset> | null): StylePreset {
  if (!patch) {
    return base;
  }
  return {
    ...base,
    ...patch,
    palette: { ...base.palette, ...patch.palette },
    typography: { ...base.typography, ...patch.typography },
    rhythm: { ...base.rhythm, ...patch.rhythm },
    components: { ...base.components, ...patch.components },
    decorations: { ...base.decorations, ...patch.decorations },
  };
}

function defaultExtractedStyleName() {
  const date = new Date();
  return `提取版式 · ${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function legalVariant<T extends keyof typeof VARIANT_VOCABULARY>(key: T, value: string | undefined, fallback: string) {
  return value && (VARIANT_VOCABULARY[key] as readonly string[]).includes(value) ? value : fallback;
}

function clampPx(value: string | undefined, min: number, max: number, fallback: string) {
  const parsed = Number.parseFloat(value ?? "");
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return `${Math.round(Math.min(Math.max(parsed, min), max))}px`;
}

function clampNumber(value: number | undefined, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Number(Math.min(Math.max(value as number, min), max).toFixed(2));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
