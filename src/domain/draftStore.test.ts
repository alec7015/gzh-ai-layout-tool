import { describe, expect, it } from "vitest";
import {
  astToMarkdown,
  astToPlainText,
  createSampleArticle,
  loadDraft,
  markdownToAst,
  plainTextToAst,
  saveDraft,
} from "./draftStore";
import type { ArticleAst } from "./types";

describe("draftStore", () => {
  it("converts plain article text into a content-only AST", () => {
    const ast = plainTextToAst("三个早起技巧\n\n先把目标降下来\n不要一上来就五点起。\n- 把手机放远\n- 提前准备早餐\n> 稳定来自小动作");

    expect(ast.meta.title).toBe("三个早起技巧");
    expect(ast.blocks.map((block) => block.type)).toEqual([
      "title",
      "heading",
      "paragraph",
      "list",
      "quote",
    ]);
  });

  it("round trips an AST through plain text for the writing surface", () => {
    const text = astToPlainText(createSampleArticle());

    expect(text).toContain("三个早起技巧");
    expect(text).toContain("- 把手机放远");
    expect(text).toContain("> 稳定的早晨");
  });

  it("saves and loads the current draft from storage", () => {
    const storage = new Map<string, string>();
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    };
    const article = createSampleArticle();

    saveDraft(adapter, article);

    expect(loadDraft(adapter).meta.title).toBe(article.meta.title);
  });

  it("round trips structured markdown without losing headings, marks, images, grids, or tables", () => {
    const article: ArticleAst = {
      meta: { title: "结构化文章" },
      blocks: [
        { id: "title-1", type: "title", text: "结构化文章", style: {} },
        { id: "heading-1", type: "heading", text: "第一部分", style: {} },
        {
          id: "paragraph-1",
          type: "paragraph",
          runs: [
            { text: "这是一段" },
            { text: "重点", marks: ["bold"] },
            { text: "和" },
            { text: "提示", marks: ["italic"] },
          ],
          style: {},
        },
        { id: "list-1", type: "list", ordered: true, items: ["第一步", "第二步"], style: {} },
        { id: "quote-1", type: "quote", text: "引用保留", style: {} },
        { id: "image-1", type: "image", src: "data:image/png;base64,a", caption: "单图", style: {} },
        {
          id: "grid-1",
          type: "imageGrid",
          layout: "three",
          gap: 6,
          radius: 8,
          images: [
            { src: "data:image/png;base64,b", alt: "图一" },
            { src: "data:image/png;base64,c", alt: "图二" },
          ],
          style: {},
        },
        {
          id: "table-1",
          type: "table",
          rows: [
            { cells: ["字段", "值"], header: true },
            { cells: ["状态", "保留"] },
          ],
          style: {},
        },
      ],
    };

    const markdown = astToMarkdown(article);
    const restored = markdownToAst(markdown, { strictHeadings: true });

    expect(markdown).toContain("# 结构化文章");
    expect(markdown).toContain("# 第一部分");
    expect(markdown).toContain("这是一段**重点**和*提示*");
    expect(markdown).toContain("1. 第一步");
    expect(restored.blocks.map((block) => block.type)).toEqual([
      "title",
      "heading",
      "paragraph",
      "list",
      "quote",
      "image",
      "image",
      "image",
      "table",
    ]);
    expect(restored.blocks[2]).toMatchObject({
      type: "paragraph",
      runs: [
        { text: "这是一段" },
        { text: "重点", marks: ["bold"] },
        { text: "和" },
        { text: "提示", marks: ["italic"] },
      ],
    });
    expect(restored.blocks[3]).toMatchObject({ type: "list", ordered: true });
    expect(restored.blocks[8]).toMatchObject({ type: "table" });
  });

  it("uses explicit heading markers only in strict heading mode", () => {
    const strict = markdownToAst("# 标题\n\n短句标题\n\n这是正文。", { strictHeadings: true });
    const loose = markdownToAst("标题\n\n短句标题\n\n这是正文。");

    expect(strict.blocks[1]).toMatchObject({ type: "paragraph" });
    expect(loose.blocks[1]).toMatchObject({ type: "heading" });
  });

  it("splits an overlong imported title into title and paragraph content", () => {
    const longTitle = `${"这是一个非常长的标题".repeat(12)}\n第二段正文\n第三段正文`;
    const article = plainTextToAst(longTitle);

    expect(article.meta.title.length).toBeLessThanOrEqual(120);
    expect(article.blocks[0]).toMatchObject({ type: "title" });
    expect(article.blocks[1]).toMatchObject({ type: "paragraph" });
    expect(article.blocks[1].type === "paragraph" ? article.blocks[1].runs[0].text : "").toContain("第二段正文");
  });

  it("does not create an empty paragraph for a title exactly at the limit", () => {
    const exactTitle = "标".repeat(120);
    const article = markdownToAst(exactTitle, { strictHeadings: true });

    expect(article.meta.title).toBe(exactTitle);
    expect(article.blocks).toHaveLength(1);
  });

  it("preserves markdown heading levels from # to ###", () => {
    const restored = markdownToAst("# 主标题\n\n# 一级标题\n\n## 二级标题\n\n### 三级标题", {
      strictHeadings: true,
    });
    const markdown = astToMarkdown(restored);

    expect(restored.blocks[1]).toMatchObject({ type: "heading", level: 1, text: "一级标题" });
    expect(restored.blocks[2]).toMatchObject({ type: "heading", level: 2, text: "二级标题" });
    expect(restored.blocks[3]).toMatchObject({ type: "heading", level: 3, text: "三级标题" });
    expect(markdown).toContain("# 一级标题");
    expect(markdown).toContain("## 二级标题");
    expect(markdown).toContain("### 三级标题");
  });
});
