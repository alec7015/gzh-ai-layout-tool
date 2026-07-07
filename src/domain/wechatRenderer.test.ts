import { describe, expect, it } from "vitest";
import { defaultStylePreset } from "./stylePresets";
import { stylePresets } from "./stylePresets";
import { mergeStylePreset } from "./styleEngine";
import { renderWechatHtml } from "./wechatRenderer";
import { scanWechatHtmlCompliance } from "./wechatCompliance";
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

  it("does not auto-number default listicle headings", () => {
    const html = renderWechatHtml(
      {
        meta: { title: "默认无编号" },
        blocks: [
          { id: "title-1", type: "title", text: "默认无编号", style: {} },
          { id: "h-1", type: "heading", text: "背景介绍", level: 1, style: {} },
        ],
      },
      defaultStylePreset
    );

    expect(html).toContain("背景介绍");
    expect(html).not.toContain(">1</span>背景介绍");
    expect(html).not.toContain(">01</span>背景介绍");
  });

  it("numbers only level-one headings for explicit numbered variants", () => {
    const preset = mergeStylePreset(defaultStylePreset, {
      "components.heading.variant": "number-badge",
    });
    const html = renderWechatHtml(
      {
        meta: { title: "编号回归" },
        blocks: [
          { id: "title-1", type: "title", text: "编号回归", style: {} },
          { id: "h-1", type: "heading", text: "第一章", level: 1, style: {} },
          { id: "h-2", type: "heading", text: "二级 A", level: 2, style: {} },
          { id: "h-3", type: "heading", text: "二级 B", level: 2, style: {} },
          { id: "h-4", type: "heading", text: "第二章", level: 1, style: {} },
        ],
      },
      preset
    );

    expect(html).toContain(">1</span>第一章");
    expect(html).toContain(">2</span>第二章");
    expect(html).not.toContain(">4</span>第二章");
  });

  it("renders tip cards and keeps image placeholders out of copied HTML", () => {
    const articleWithRoles: ArticleAst = {
      meta: { title: "角色测试" },
      blocks: [
        { id: "title-1", type: "title", text: "角色测试", style: {} },
        { id: "p-tip", type: "paragraph", runs: [{ text: "这里需要注意" }], role: "tip", style: {} },
        {
          id: "p-img",
          type: "paragraph",
          runs: [{ text: "这里适合配图" }],
          role: "imageSlot",
          roleHint: "放一张产品对比图",
          style: {},
        },
      ],
    };

    const previewHtml = renderWechatHtml(articleWithRoles, defaultStylePreset, { includePlaceholders: true });
    const copyHtml = renderWechatHtml(articleWithRoles, defaultStylePreset, { includePlaceholders: false });

    expect(previewHtml).toContain("💡 提示");
    expect(previewHtml).toContain("📷 建议配图：放一张产品对比图");
    expect(copyHtml).toContain("💡 提示");
    expect(copyHtml).not.toContain("建议配图");
  });

  it("keeps all preset and role render output compatible with WKWebView-safe inline HTML", () => {
    const roleArticle: ArticleAst = {
      meta: { title: "兼容扫描" },
      blocks: [
        { id: "title-1", type: "title", text: "兼容扫描", style: {} },
        { id: "p-summary", type: "paragraph", runs: [{ text: "小结内容" }], role: "summary", style: {} },
        { id: "p-tip", type: "paragraph", runs: [{ text: "提示内容" }], role: "tip", style: {} },
        { id: "q-key", type: "quote", text: "关键引用", role: "keyQuote", style: {} },
        { id: "divider-1", type: "divider", style: {} },
      ],
    };

    const html = stylePresets.map((preset) => renderWechatHtml(roleArticle, preset, { includePlaceholders: true })).join("\n");

    expect(html).not.toMatch(/url\(["']?data:image\/svg\+xml,[^"')]*[#<>"\s]/i);
    expect(html).not.toMatch(/(?:color-mix|oklch|lab)\(/i);
    expect(html).not.toContain("backdrop-filter");
    expect(html).toContain("小结");
    expect(html).toContain("💡 提示");
  });

  it("renders V13 component roles with deterministic original visuals", () => {
    const html = renderWechatHtml(
      {
        meta: { title: "V13 角色" },
        blocks: [
          { id: "title-1", type: "title", text: "V13 角色", style: {} },
          { id: "h-1", type: "heading", text: "准备工作", level: 1, style: {} },
          { id: "h-2", type: "heading", text: "操作步骤", level: 1, style: {} },
          { id: "toc-1", type: "paragraph", runs: [{ text: "目录" }], role: "toc", style: {} },
          { id: "quote-1", type: "quote", text: "好工具会把复杂留给自己。", role: "pullquote", style: {} },
          { id: "p-center", type: "paragraph", runs: [{ text: "保持克制，也保持锋利。" }], role: "quoteCenter", style: {} },
          { id: "p-data", type: "paragraph", runs: [{ text: "效率提升 42%，复制错误减少 18%" }], role: "data", style: {} },
          { id: "list-step", type: "list", ordered: true, items: ["粘贴内容", "选择角色"], role: "step", style: {} },
          { id: "p-tool", type: "paragraph", runs: [{ text: "Tauri 桌面端复制更稳定" }], role: "toolLabel", style: {} },
          { id: "p-side", type: "paragraph", runs: [{ text: "旁注用于补充名词解释" }], role: "sidenote", style: {} },
          { id: "p-editor", type: "paragraph", runs: [{ text: "这一段适合先读" }], role: "editorNote", style: {} },
          { id: "p-sign", type: "paragraph", runs: [{ text: "Alec｜个人效率工具实践者" }], role: "signature", style: {} },
        ],
      },
      defaultStylePreset
    );

    expect(html).toContain("目录");
    expect(html).toContain("准备工作");
    expect(html).toContain("引言");
    expect(html).toContain("42%");
    expect(html).toContain("步骤 1");
    expect(html).toContain("工具");
    expect(html).toContain("旁注");
    expect(html).toContain("编者按");
    expect(html).toContain("作者");
    expect(html).not.toContain("class=");
  });

  it("renders drop cap without float and skips rich-text-leading paragraphs", () => {
    const dropArticle: ArticleAst = {
      meta: { title: "首字下沉" },
      blocks: [
        { id: "title-1", type: "title", text: "首字下沉", style: {} },
        { id: "p-1", type: "paragraph", runs: [{ text: "第一段正文应该有首字样式" }], style: {} },
        { id: "p-2", type: "paragraph", runs: [{ text: "加粗开头", marks: ["bold"] }, { text: "不应拆标签" }], style: {} },
      ],
    };

    const html = renderWechatHtml(dropArticle, stylePresets[0]);

    expect(html).not.toContain("float:");
    expect(html).toContain("font-size:38px");
    expect(html).not.toContain("><</span>");
    expect(scanWechatHtmlCompliance(html).violations).toEqual([]);
  });

  it("renders code blocks as WeChat-safe section lines", () => {
    const html = renderWechatHtml(
      {
        meta: { title: "代码" },
        blocks: [
          { id: "title-1", type: "title", text: "代码", style: {} },
          { id: "code-1", type: "code", language: "js", text: "function hi() {\n  return \"ok\";\n}", style: {} },
        ],
      },
      defaultStylePreset
    );

    expect(html).toContain("function hi()");
    expect(html).toContain("　　return");
    expect(html).not.toContain("<pre");
    expect(html).not.toContain("white-space");
    expect(scanWechatHtmlCompliance(html).violations).toEqual([]);
  });
});
