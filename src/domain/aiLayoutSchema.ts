import { astToMarkdown } from "./draftStore";
import { stylePresets } from "./stylePresets";
import type { ChatCompletionRequest } from "./aiWriting";
import type { ArticleAst, LayoutRecommendation, StyleOverrides } from "./types";

const allowedStyleIds = new Set(stylePresets.map((preset) => preset.id));
const allowedOverridePrefixes = [
  "palette.",
  "typography.",
  "rhythm.",
  "title.",
  "heading.",
  "quote.",
  "list.",
  "emphasis.",
  "divider.",
  "image.",
];

export function buildLayoutRequest(article: ArticleAst): ChatCompletionRequest {
  return {
    model: "openai-compatible-chat-model",
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "你是微信公众号排版助手。只输出 JSON：styleId、reason、overrides。不要输出 HTML，不要修改正文内容。",
      },
      {
        role: "user",
        content: `请根据文章调性选择最适合的版式。\n可选 styleId：${Array.from(allowedStyleIds).join(", ")}\n返回示例：{"styleId":"listicle_cards","reason":"...","overrides":{"palette.primary":"#2B6CB0"}}\n文章：\n${astToMarkdown(article)}`,
      },
    ],
  };
}

export function coerceLayoutRecommendation(value: unknown): LayoutRecommendation | null {
  if (!isRecord(value)) {
    return null;
  }

  const styleId = value.styleId;
  const reason = value.reason;
  const overrides = value.overrides;

  if (typeof styleId !== "string" || !allowedStyleIds.has(styleId)) {
    return null;
  }

  if (typeof reason !== "string" || reason.trim().length === 0) {
    return null;
  }

  if (!isRecord(overrides)) {
    return null;
  }

  const safeOverrides: StyleOverrides = {};
  for (const [key, overrideValue] of Object.entries(overrides)) {
    if (!isSafeOverridePath(key) || !isSafeOverrideValue(overrideValue)) {
      return null;
    }
    safeOverrides[normalizeComponentPath(key)] = overrideValue;
  }

  return {
    styleId,
    reason: reason.trim(),
    overrides: safeOverrides,
  };
}

function normalizeComponentPath(path: string): string {
  if (
    path.startsWith("title.") ||
    path.startsWith("heading.") ||
    path.startsWith("quote.") ||
    path.startsWith("list.") ||
    path.startsWith("emphasis.") ||
    path.startsWith("divider.") ||
    path.startsWith("image.")
  ) {
    const [component, key] = path.split(".");
    return `components.${component}.${key}`;
  }

  return path;
}

function isSafeOverridePath(path: string): boolean {
  return (
    allowedOverridePrefixes.some((prefix) => path.startsWith(prefix)) &&
    !path.includes("__proto__") &&
    !path.includes("constructor") &&
    !path.includes("prototype")
  );
}

function isSafeOverrideValue(value: unknown): value is string | number | boolean | null {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
