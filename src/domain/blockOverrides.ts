import type { ArticleAst, ArticleBlock, BlockOverride } from "./types";

export function setBlockOverride(
  article: ArticleAst,
  blockId: string,
  key: string,
  value: string | number | boolean | null
): ArticleAst {
  return {
    ...article,
    blocks: article.blocks.map((block) =>
      block.id === blockId
        ? {
            ...block,
            style: {
              ...(block.style ?? {}),
              [key]: value,
            },
          }
        : block
    ),
  };
}

export function clearBlockOverrides(article: ArticleAst, blockId: string): ArticleAst {
  return {
    ...article,
    blocks: article.blocks.map((block) =>
      block.id === blockId
        ? {
            ...block,
            style: {},
          }
        : block
    ),
  };
}

export function getBlockLabel(block: ArticleBlock): string {
  if (block.type === "title") {
    return `主标题：${trimText(block.text)}`;
  }

  if (block.type === "heading") {
    return `小标题：${trimText(block.text)}`;
  }

  if (block.type === "paragraph") {
    return `正文：${trimText(block.runs.map((run) => run.text).join(""))}`;
  }

  if (block.type === "quote") {
    return `金句：${trimText(block.text)}`;
  }

  if (block.type === "list") {
    return `列表：${block.items.length} 项`;
  }

  if (block.type === "image") {
    return `图片：${block.caption ?? "配图"}`;
  }

  if (block.type === "imageGrid") {
    return `多图：${block.images.length} 张`;
  }

  if (block.type === "table") {
    return `表格：${block.rows.length} 行`;
  }

  return "分割线";
}

export function toInlineOverride(style: BlockOverride | undefined): Record<string, string> {
  if (!style) {
    return {};
  }

  const allowedKeys = [
    "color",
    "background",
    "text-align",
    "font-size",
    "font-family",
    "line-height",
    "margin-bottom",
    "text-indent",
  ];
  return Object.fromEntries(
    Object.entries(style)
      .filter(([key, value]) => allowedKeys.includes(key) && value !== null)
      .map(([key, value]) => [key, String(value)])
  );
}

function trimText(value: string): string {
  return value.length > 14 ? `${value.slice(0, 14)}...` : value;
}
