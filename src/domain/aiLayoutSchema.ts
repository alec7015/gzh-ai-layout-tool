import { astToMarkdown } from "./draftStore";
import { stylePresets, VARIANT_VOCABULARY } from "./stylePresets";
import type { ChatCompletionRequest } from "./aiWriting";
import type {
  ArticleAst,
  ArticleBlock,
  BlockRole,
  LayoutPlan,
  LayoutRecommendation,
  StyleOverrides,
  StylePreset,
} from "./types";

const allowedStyleIds = new Set(stylePresets.map((preset) => preset.id));
const allowedOverridePrefixes = [
  "palette.",
  "typography.",
  "rhythm.",
  "components.",
  "decorations.footerText",
];
const legacyComponentPrefix = /^(title|heading|quote|list|emphasis|divider|image)\./;
const blockRoles: BlockRole[] = ["lead", "keyQuote", "emphasis", "steps", "summary"];
const roleQuota: Record<BlockRole, number> = {
  lead: 1,
  keyQuote: 2,
  emphasis: 3,
  steps: 2,
  summary: 1,
};

export function buildLayoutRequest(article: ArticleAst): ChatCompletionRequest {
  const styleOptions = stylePresets
    .map((preset) => `${preset.id}｜${preset.name}｜${preset.moods.join("、")}`)
    .join("\n");
  const articleMarkdown = astToMarkdown(article).slice(0, 3000);

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
        content: `请根据文章调性选择最适合的版式。\n可选 styleId｜名称｜moods：\n${styleOptions}\n返回示例：{"styleId":"listicle_cards","reason":"...","overrides":{"palette.primary":"#2B6CB0"}}\n文章：\n${articleMarkdown}`,
      },
    ],
  };
}

export function buildLayoutPlanRequest(
  article: ArticleAst,
  presets: StylePreset[] = stylePresets
): ChatCompletionRequest {
  const styleOptions = presets
    .map((preset) => `${preset.id}｜${preset.name}｜${preset.moods.join("、")}`)
    .join("\n");
  const blockList = serializeBlocksForPlan(article);
  const componentVocabulary = Object.entries(VARIANT_VOCABULARY)
    .map(([component, variants]) => `${component}: ${variants.join(" / ")}`)
    .join("\n");

  return {
    model: "openai-compatible-chat-model",
    temperature: 0.35,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "你是微信公众号排版设计师。只输出 JSON：{\"plans\":[...]}。不要输出 HTML，不要改正文。每套方案应有不同基底、主色或组件变体。",
      },
      {
        role: "user",
        content:
          `请生成 2-3 套排版方案。\n` +
          `可选 styleId｜名称｜moods：\n${styleOptions}\n\n` +
          `组件变体词汇表：\n${componentVocabulary}\n\n` +
          `role 枚举：lead(首段) / keyQuote(金句) / emphasis(重点段) / steps(步骤列表) / summary(小结)。role 宁缺毋滥。\n` +
          `输出示例：{"plans":[{"styleId":"listicle_cards","reason":"干货结构清晰","palette":{"primary":"#2B6CB0"},"components":{"heading":"chapter-badge","quote":"golden-card"},"blocks":[{"blockId":"p-1","role":"lead"}]}]}\n\n` +
          `文章块：\n${blockList}`,
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
    const normalizedKey = normalizeComponentPath(key);
    if (!isSafeOverridePath(normalizedKey) || !isSafeOverrideValue(overrideValue)) {
      return null;
    }
    safeOverrides[normalizedKey] = overrideValue;
  }

  return {
    styleId,
    reason: reason.trim(),
    overrides: safeOverrides,
  };
}

function normalizeComponentPath(path: string): string {
  if (legacyComponentPrefix.test(path)) {
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

export function coerceLayoutPlan(
  value: unknown,
  article: ArticleAst,
  presets: StylePreset[] = stylePresets
): LayoutPlan[] | null {
  if (!isRecord(value) || !Array.isArray(value.plans)) {
    return null;
  }

  const allowedPlanStyleIds = new Set(presets.map((preset) => preset.id));
  const blockMap = new Map(article.blocks.map((block) => [block.id, block]));
  const plans = value.plans
    .slice(0, 3)
    .map((item): LayoutPlan | null => {
      if (!isRecord(item) || typeof item.styleId !== "string" || !allowedPlanStyleIds.has(item.styleId)) {
        return null;
      }

      const components = coerceComponents(item.components);
      const blocks = coercePlanBlocks(item.blocks, blockMap);
      const primary = isRecord(item.palette) && typeof item.palette.primary === "string" && isHex(item.palette.primary)
        ? item.palette.primary
        : undefined;

      return {
        styleId: item.styleId,
        reason: typeof item.reason === "string" && item.reason.trim() ? item.reason.trim().slice(0, 28) : "AI 推荐方案",
        ...(primary ? { palette: { primary } } : {}),
        ...(Object.keys(components).length ? { components } : {}),
        ...(blocks.length ? { blocks } : {}),
      };
    })
    .filter((plan): plan is LayoutPlan => Boolean(plan));

  return plans.length ? plans : null;
}

function coerceComponents(value: unknown): NonNullable<LayoutPlan["components"]> {
  if (!isRecord(value)) {
    return {};
  }

  const result: NonNullable<LayoutPlan["components"]> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!isPlanComponent(key) || typeof item !== "string") {
      continue;
    }
    if ((VARIANT_VOCABULARY[key] as readonly string[]).includes(item)) {
      result[key] = item;
    }
  }
  return result;
}

function coercePlanBlocks(value: unknown, blockMap: Map<string, ArticleBlock>) {
  if (!Array.isArray(value)) {
    return [];
  }

  const counts: Record<BlockRole, number> = {
    lead: 0,
    keyQuote: 0,
    emphasis: 0,
    steps: 0,
    summary: 0,
  };
  const result: NonNullable<LayoutPlan["blocks"]> = [];

  value.forEach((item) => {
    if (!isRecord(item) || typeof item.blockId !== "string" || !isBlockRole(item.role)) {
      return;
    }
    const block = blockMap.get(item.blockId);
    if (!block || !isRoleCompatible(item.role, block)) {
      return;
    }
    if (counts[item.role] >= roleQuota[item.role]) {
      return;
    }
    counts[item.role] += 1;
    result.push({ blockId: item.blockId, role: item.role });
  });

  return result;
}

function serializeBlocksForPlan(article: ArticleAst) {
  return article.blocks
    .map((block) => `[${block.id}|${blockLabel(block)}] ${blockText(block).slice(0, 80)}`)
    .join("\n")
    .slice(0, 6000);
}

function blockLabel(block: ArticleBlock) {
  if (block.type === "list") {
    return `list·${block.ordered ? "ordered" : "unordered"}`;
  }
  return block.type;
}

function blockText(block: ArticleBlock) {
  if (block.type === "paragraph") {
    return block.runs.map((run) => run.text).join("");
  }
  if (block.type === "list") {
    return block.items.join(" / ");
  }
  if (block.type === "table") {
    return block.rows.map((row) => row.cells.join(" / ")).join(" | ");
  }
  if ("text" in block) {
    return block.text;
  }
  if (block.type === "image") {
    return block.caption ?? "图片";
  }
  if (block.type === "imageGrid") {
    return `多图 ${block.images.length} 张`;
  }
  return "---";
}

function isRoleCompatible(role: BlockRole, block: ArticleBlock) {
  if (role === "lead") {
    return block.type === "paragraph";
  }
  if (role === "keyQuote") {
    return block.type === "quote" || block.type === "paragraph";
  }
  if (role === "emphasis") {
    return block.type === "paragraph";
  }
  if (role === "steps") {
    return block.type === "list";
  }
  return block.type === "paragraph" || block.type === "list";
}

function isPlanComponent(value: string): value is keyof NonNullable<LayoutPlan["components"]> {
  return (
    value === "title" ||
    value === "heading" ||
    value === "quote" ||
    value === "list" ||
    value === "emphasis" ||
    value === "divider"
  );
}

function isBlockRole(value: unknown): value is BlockRole {
  return typeof value === "string" && blockRoles.includes(value as BlockRole);
}

function isHex(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value);
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
