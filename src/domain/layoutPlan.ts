import { derivePaletteOverrides } from "./paletteDerive";
import type { ArticleAst, LayoutPlan, StyleOverrides } from "./types";

export function planToOverrides(plan: LayoutPlan): StyleOverrides {
  const paletteOverrides = plan.palette?.primary ? derivePaletteOverrides(plan.palette.primary) : {};
  const componentOverrides = Object.fromEntries(
    Object.entries(plan.components ?? {}).map(([key, value]) => [`components.${key}.variant`, value])
  );
  return {
    ...paletteOverrides,
    ...componentOverrides,
  };
}

export function applyRolesToArticle(article: ArticleAst, roles: NonNullable<LayoutPlan["blocks"]> = []): ArticleAst {
  const roleMap = new Map(roles.map((item) => [item.blockId, item]));
  return {
    ...article,
    blocks: article.blocks.map((block) => {
      const next = roleMap.get(block.id);
      if (!next) {
        const { role: _role, roleHint: _roleHint, ...rest } = block;
        return rest;
      }
      return { ...block, role: next.role, roleHint: next.hint };
    }),
  };
}

export function hasAnyRole(article: ArticleAst | null): boolean {
  return Boolean(article?.blocks.some((block) => block.role));
}
