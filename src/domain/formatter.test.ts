import { describe, expect, it } from "vitest";
import { analyzeArticle, recommendLayout } from "./aiLayout";
import { mergeStylePreset } from "./styleEngine";
import { renderWechatHtml } from "./wechatRenderer";
import { stylePresets } from "./stylePresets";
import type { ArticleAst } from "./types";

const sampleArticle: ArticleAst = {
  meta: {
    title: "三个早起技巧",
    digest: "用更轻的方式把早晨拿回来。",
  },
  blocks: [
    { id: "t1", type: "title", text: "三个早起技巧", style: {} },
    { id: "h1", type: "heading", text: "先把目标降下来", style: {} },
    {
      id: "p1",
      type: "paragraph",
      runs: [{ text: "不要一上来就要求自己五点起床，先提前十五分钟。" }],
      style: {},
    },
    {
      id: "l1",
      type: "list",
      ordered: true,
      items: ["把手机放远", "提前准备早餐", "醒来先喝水"],
      style: {},
    },
    { id: "q1", type: "quote", text: "稳定的早晨，来自可重复的小动作。", style: {} },
  ],
};

describe("AI layout recommendation", () => {
  it("recommends the listicle layout for structured how-to articles", () => {
    const analysis = analyzeArticle(sampleArticle);
    const recommendation = recommendLayout(sampleArticle);

    expect(analysis.genre).toBe("干货");
    expect(analysis.hasList).toBe(true);
    expect(recommendation.styleId).toBe("listicle_cards");
    expect(recommendation.reason).toContain("方法");
    expect(recommendation.overrides["list.variant"]).toBe("number-circle-card");
  });
});

describe("style merging", () => {
  it("applies base preset, AI overrides, then user overrides in priority order", () => {
    const base = stylePresets.find((preset) => preset.id === "listicle_cards");
    expect(base).toBeDefined();

    const merged = mergeStylePreset(
      base!,
      { "palette.primary": "#2B6CB0", "rhythm.paragraphGap": "18px" },
      { "palette.primary": "#0F766E" }
    );

    expect(merged.palette.primary).toBe("#0F766E");
    expect(merged.rhythm.paragraphGap).toBe("18px");
    expect(merged.components.list.variant).toBe("number-circle-card");
  });
});

describe("WeChat renderer", () => {
  it("renders inline styled HTML without classes, style tags, or scripts", () => {
    const preset = stylePresets.find((item) => item.id === "listicle_cards");
    expect(preset).toBeDefined();

    const html = renderWechatHtml(sampleArticle, preset!);

    expect(html).toContain("style=");
    expect(html).toContain("三个早起技巧");
    expect(html).toContain("稳定的早晨");
    expect(html).toContain(">1</span>");
    expect(html).not.toContain("class=");
    expect(html).not.toContain("<style");
    expect(html).not.toContain("<script");
  });

  it("renders text run attrs and extended marks as inline WeChat styles", () => {
    const preset = stylePresets.find((item) => item.id === "minimal_editorial");
    expect(preset).toBeDefined();

    const html = renderWechatHtml(
      {
        meta: { title: "行内样式" },
        blocks: [
          { id: "title-1", type: "title", text: "行内样式", style: {} },
          {
            id: "p-1",
            type: "paragraph",
            runs: [
              {
                text: "彩色重点",
                marks: ["bold", "underline", "strike"],
                attrs: { color: "#dc2626", background: "#fef3c7", fontSize: "18px" },
              },
            ],
            style: {},
          },
        ],
      },
      preset!
    );

    expect(html).toContain("color:#dc2626");
    expect(html).toContain("background-color:#fef3c7");
    expect(html).toContain("font-size:18px");
    expect(html).toContain("text-decoration:line-through");
    expect(html).toContain("text-decoration:underline");
  });
});
