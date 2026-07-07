import type { ArticleType, BlockRole } from "./types";

export interface Recipe {
  id: ArticleType;
  allowedRoles: BlockRole[];
  quotas: Partial<Record<BlockRole, number>>;
  keywordDensity: { maxPerParagraph: number; targetParagraphRatio: number };
  defaults: { enableToc: boolean; chapterNumbering: boolean };
}

export const RECIPES: Record<ArticleType, Recipe> = {
  tutorial: {
    id: "tutorial",
    allowedRoles: ["step", "tip", "toolLabel", "summary", "toc"],
    quotas: { tip: 3, summary: 1, toc: 1 },
    keywordDensity: { maxPerParagraph: 3, targetParagraphRatio: 0.35 },
    defaults: { enableToc: true, chapterNumbering: true },
  },
  review: {
    id: "review",
    allowedRoles: ["data", "toolLabel", "quoteCenter", "summary"],
    quotas: { data: 4, quoteCenter: 1, summary: 1 },
    keywordDensity: { maxPerParagraph: 3, targetParagraphRatio: 0.3 },
    defaults: { enableToc: false, chapterNumbering: true },
  },
  opinion: {
    id: "opinion",
    allowedRoles: ["pullquote", "quoteCenter", "editorNote", "summary"],
    quotas: { pullquote: 2, quoteCenter: 1, editorNote: 1, summary: 1 },
    keywordDensity: { maxPerParagraph: 3, targetParagraphRatio: 0.25 },
    defaults: { enableToc: false, chapterNumbering: false },
  },
  news: {
    id: "news",
    allowedRoles: ["quoteCenter", "sidenote", "summary"],
    quotas: { quoteCenter: 2, sidenote: 2, summary: 2 },
    keywordDensity: { maxPerParagraph: 3, targetParagraphRatio: 0.2 },
    defaults: { enableToc: false, chapterNumbering: false },
  },
  listicle: {
    id: "listicle",
    allowedRoles: ["tip", "toolLabel", "summary", "toc"],
    quotas: { tip: 5, summary: 1, toc: 1 },
    keywordDensity: { maxPerParagraph: 3, targetParagraphRatio: 0.35 },
    defaults: { enableToc: true, chapterNumbering: true },
  },
  generic: {
    id: "generic",
    allowedRoles: ["summary", "tip", "quoteCenter"],
    quotas: { summary: 2, tip: 2, quoteCenter: 2 },
    keywordDensity: { maxPerParagraph: 3, targetParagraphRatio: 0.2 },
    defaults: { enableToc: false, chapterNumbering: false },
  },
};

export function getRecipe(type: ArticleType): Recipe {
  return RECIPES[type] ?? RECIPES.generic;
}

export function clampRolesToRecipe<T extends { index: number; role?: BlockRole }>(
  articleType: ArticleType,
  blocks: T[]
): T[] {
  const recipe = getRecipe(articleType);
  const counts: Partial<Record<BlockRole, number>> = {};
  return blocks.filter((block) => {
    if (!block.role || !recipe.allowedRoles.includes(block.role)) {
      return false;
    }
    const limit = recipe.quotas[block.role] ?? Number.POSITIVE_INFINITY;
    const current = counts[block.role] ?? 0;
    if (current >= limit) {
      return false;
    }
    counts[block.role] = current + 1;
    return true;
  });
}
