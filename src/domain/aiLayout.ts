import { defaultStylePreset } from "./stylePresets";
import type {
  ArticleAnalysis,
  ArticleAst,
  ArticleBlock,
  LayoutRecommendation,
  StyleOverrides,
} from "./types";

const genreStyleMap: Record<string, { primary: string; fallback: string }> = {
  情感: { primary: "magazine_essay", fallback: "warm_centered" },
  故事: { primary: "magazine_essay", fallback: "warm_centered" },
  干货: { primary: "listicle_cards", fallback: "knowledge_explainer" },
  教程: { primary: "listicle_cards", fallback: "knowledge_explainer" },
  盘点: { primary: "listicle_cards", fallback: "knowledge_explainer" },
  科普: { primary: "knowledge_explainer", fallback: "listicle_cards" },
  解释: { primary: "knowledge_explainer", fallback: "listicle_cards" },
  资讯: { primary: "business_brief", fallback: "minimal_editorial" },
  职场: { primary: "business_brief", fallback: "minimal_editorial" },
  日常: { primary: "social_bubble", fallback: "magazine_essay" },
  种草: { primary: "social_bubble", fallback: "magazine_essay" },
  深度: { primary: "minimal_editorial", fallback: "magazine_essay" },
  文化: { primary: "classic_chinese", fallback: "magazine_essay" },
};

export function analyzeArticle(article: ArticleAst): ArticleAnalysis {
  const text = collectText(article.blocks);
  const paragraphLengths = article.blocks
    .filter((block) => block.type === "paragraph")
    .map((block) => block.runs.map((run) => run.text).join("").length);

  const avgParaLen =
    paragraphLengths.length === 0
      ? 0
      : Math.round(
          paragraphLengths.reduce((total, current) => total + current, 0) /
            paragraphLengths.length
        );

  const hasList = article.blocks.some((block) => block.type === "list");
  const strongQuotes = article.blocks.filter((block) => block.type === "quote").length;
  const genre = inferGenre(text, article.blocks, hasList);

  return {
    genre,
    tone: inferTone(genre),
    hasList,
    strongQuotes,
    avgParaLen,
    length: text.length > 1800 ? "长" : text.length > 520 ? "中" : "短",
    keywords: extractKeywords(text),
  };
}

export function recommendLayout(article: ArticleAst): LayoutRecommendation {
  const analysis = analyzeArticle(article);
  const mapped = genreStyleMap[analysis.genre];
  const styleId = mapped?.primary ?? defaultStylePreset.id;

  return {
    styleId,
    reason: buildReason(analysis),
    overrides: buildAdaptiveOverrides(analysis),
  };
}

function inferGenre(text: string, blocks: ArticleBlock[], hasList: boolean): string {
  if (/文化|传统|古典|国风|诗词|历史/.test(text)) {
    return "文化";
  }

  if (/行业|会议|通知|报告|趋势|市场|公司|职场|业务/.test(text)) {
    return "职场";
  }

  if (/科学|原理|解释|研究|实验|概念|知识|科普/.test(text)) {
    return "科普";
  }

  if (/日常|好物|种草|分享|朋友|生活/.test(text)) {
    return "日常";
  }

  if (hasList || /技巧|方法|步骤|清单|教程|指南|如何|要点/.test(text)) {
    return "干货";
  }

  if (blocks.some((block) => block.type === "quote") || /心情|故事|治愈|温暖|难过|喜欢/.test(text)) {
    return "情感";
  }

  return "深度";
}

function inferTone(genre: string): string {
  const toneMap: Record<string, string> = {
    干货: "冷静专业",
    教程: "清晰实用",
    科普: "清楚可信",
    职场: "克制正式",
    日常: "轻松友好",
    情感: "温柔走心",
    文化: "雅致沉静",
    深度: "克制深度",
  };

  return toneMap[genre] ?? "清晰自然";
}

function buildAdaptiveOverrides(analysis: ArticleAnalysis): StyleOverrides {
  const overrides: StyleOverrides = {};

  if (analysis.hasList) {
    overrides["list.variant"] = "number-circle-card";
  }

  if (analysis.strongQuotes >= 2) {
    overrides["quote.variant"] = "center-large-text";
    overrides["typography.bodySize"] = "16px";
  }

  if (analysis.genre === "情感" && analysis.avgParaLen <= 80) {
    overrides["rhythm.align"] = "center";
    overrides["rhythm.paragraphGap"] = "22px";
    overrides["palette.primary"] = "#B45337";
  }

  if (analysis.genre === "干货") {
    overrides["emphasis.variant"] = "highlight-bg";
    overrides["palette.primary"] = "#2B6CB0";
    overrides["rhythm.paragraphGap"] = "16px";
  }

  if (analysis.genre === "文化") {
    overrides["palette.primary"] = "#9F2F24";
    overrides["divider.variant"] = "seal-divider";
  }

  return overrides;
}

function buildReason(analysis: ArticleAnalysis): string {
  if (analysis.genre === "干货") {
    return "结构清晰的方法类干货，适合强结构卡片版式。";
  }

  if (analysis.genre === "科普") {
    return "文章偏解释和知识传递，适合用信息卡与步骤结构降低理解成本。";
  }

  if (analysis.genre === "职场") {
    return "内容偏正式信息传达，适合克制、对齐明确的简报版式。";
  }

  if (analysis.genre === "情感") {
    return "文章含走心表达，适合留白更多、阅读节奏更柔和的版式。";
  }

  return `文章调性偏${analysis.tone}，已选择更贴合的基础版式。`;
}

function collectText(blocks: ArticleBlock[]): string {
  return blocks
    .map((block) => {
      if (block.type === "paragraph") {
        return block.runs.map((run) => run.text).join("");
      }

      if (block.type === "list") {
        return block.items.join("");
      }

      if ("text" in block) {
        return block.text;
      }

      return "";
    })
    .join("\n");
}

function extractKeywords(text: string): string[] {
  const candidates = text
    .replace(/[，。！？、；：“”《》（）\s]/g, " ")
    .split(" ")
    .map((item) => item.trim())
    .filter((item) => item.length >= 2 && item.length <= 8);

  return Array.from(new Set(candidates)).slice(0, 6);
}
