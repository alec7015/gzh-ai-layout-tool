import { describe, expect, it } from "vitest";
import { defaultStylePreset } from "./stylePresets";
import { mergeStylePreset } from "./styleEngine";
import { renderWechatHtml } from "./wechatRenderer";
import type { ArticleAst } from "./types";

const article: ArticleAst = {
  meta: { title: "排版测试" },
  blocks: [
    { id: "title-1", type: "title", text: "排版测试", style: {} },
    { id: "p-lead", type: "paragraph", runs: [{ text: "首段引言" }], role: "lead", style: {} },
    { id: "h-1", type: "heading", text: "第一章", style: {} },
    { id: "q-1", type: "quote", text: "重要金句", role: "keyQuote", style: {} },
    { id: "p-summary", type: "paragraph", runs: [{ text: "最后总结" }], role: "summary", style: {} },
    { id: "list-1", type: "list", ordered: true, items: ["第一步", "第二步"], role: "steps", style: {} },
    { id: "divider-1", type: "divider", style: {} },
  ],
};

describe("wechatRenderer", () => {
  it("renders new component variants with WeChat-safe inline styles", () => {
    const preset = mergeStylePreset(defaultStylePreset, {
      "components.title.variant": "gradient-band",
      "components.heading.variant": "chapter-badge",
      "components.quote.variant": "golden-card",
      "components.list.variant": "arrow-accent",
      "components.divider.variant": "ornament",
      "components.emphasis.variant": "highlight",
    });

    const html = renderWechatHtml(article, preset);

    expect(html).toContain("01");
    expect(html).toContain("❝");
    expect(html).toContain("❖");
    expect(html).toContain("linear-gradient");
    expect(html).toContain("inline-block");
    expect(html).not.toContain("class=");
    expect(html).not.toContain("display:flex");
    expect(html).not.toContain("display:grid");
  });

  it("renders semantic role decorations and keeps manual styles above role styles", () => {
    const html = renderWechatHtml(
      {
        ...article,
        blocks: article.blocks.map((block) =>
          block.id === "p-summary" ? { ...block, style: { background: "#fff7ed" } } : block
        ),
      },
      defaultStylePreset
    );

    expect(html).toContain("小结");
    expect(html).toContain("首段引言");
    expect(html).toContain("background:#fff7ed");
  });

  it("does not render empty image captions and emits explicit italic style", () => {
    const html = renderWechatHtml(
      {
        meta: { title: "图片与斜体" },
        blocks: [
          { id: "title-1", type: "title", text: "图片与斜体", style: {} },
          {
            id: "p-1",
            type: "paragraph",
            runs: [{ text: "斜体文字", marks: ["italic"] }],
            style: {},
          },
          { id: "img-1", type: "image", src: "data:image/jpeg;base64,abc", caption: "   ", style: {} },
        ],
      },
      defaultStylePreset
    );

    expect(html).toContain("font-style:italic");
    expect(html).not.toContain("<p style=\"margin:8px 0 0");
  });
});
