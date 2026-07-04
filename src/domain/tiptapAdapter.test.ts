import { describe, expect, it } from "vitest";
import { createSampleArticle } from "./draftStore";
import { astToTiptapDoc, tiptapDocToAst, tiptapDocToPlainText } from "./tiptapAdapter";
import type { ArticleAst } from "./types";

describe("tiptapAdapter", () => {
  it("converts article AST to a Tiptap document", () => {
    const doc = astToTiptapDoc(createSampleArticle());

    expect(doc.type).toBe("doc");
    expect(doc.content[0].type).toBe("heading");
    expect(doc.content.some((node) => node.type === "bulletList")).toBe(true);
    expect(doc.content.some((node) => node.type === "blockquote")).toBe(true);
  });

  it("converts a Tiptap document back to plain text syntax", () => {
    const text = tiptapDocToPlainText(astToTiptapDoc(createSampleArticle()));

    expect(text).toContain("三个早起技巧");
    expect(text).toContain("- 把手机放远");
    expect(text).toContain("> 稳定的早晨");
  });

  it("round trips image grid and table blocks without flattening them to text", () => {
    const article: ArticleAst = {
      meta: { title: "图文排版" },
      blocks: [
        { id: "title-1", type: "title", text: "图文排版", style: {} },
        {
          id: "grid-1",
          type: "imageGrid",
          images: [
            { src: "data:image/png;base64,a", alt: "A" },
            { src: "data:image/png;base64,b", alt: "B" },
          ],
          layout: "two",
          gap: 6,
          radius: 8,
          style: {},
        },
        {
          id: "table-1",
          type: "table",
          rows: [
            { cells: ["指标", "结果"], header: true },
            { cells: ["复制", "不塌陷"] },
          ],
          style: {},
        },
      ],
    };

    const restored = tiptapDocToAst(astToTiptapDoc(article), article);

    expect(restored.blocks[1]).toMatchObject({ type: "imageGrid", layout: "two" });
    expect(restored.blocks[2]).toMatchObject({
      type: "table",
      rows: [
        { cells: ["指标", "结果"], header: true },
        { cells: ["复制", "不塌陷"] },
      ],
    });
  });

  it("does not emit empty text nodes for blank paragraphs", () => {
    const doc = astToTiptapDoc({
      meta: { title: "空段落" },
      blocks: [
        { id: "title-1", type: "title", text: "空段落", style: {} },
        { id: "p-empty", type: "paragraph", runs: [{ text: "" }], style: {} },
      ],
    });

    expect(JSON.stringify(doc)).not.toContain('"text":""');
  });

  it("does not emit empty text nodes for blank quotes, list items, or table cells", () => {
    const article: ArticleAst = {
      meta: { title: "空节点" },
      blocks: [
        { id: "title-1", type: "title", text: "空节点", style: {} },
        { id: "quote-empty", type: "quote", text: "", style: {} },
        { id: "list-empty", type: "list", ordered: false, items: ["", "保留"], style: {} },
        {
          id: "table-empty",
          type: "table",
          rows: [
            { cells: ["", "", ""], header: true },
            { cells: ["", "内容", ""] },
          ],
          style: {},
        },
      ],
    };

    const doc = astToTiptapDoc(article);
    const restored = tiptapDocToAst(doc, article);

    expect(JSON.stringify(doc)).not.toContain('"text":""');
    expect(restored.blocks[1]).toMatchObject({ type: "quote", text: "" });
    expect(restored.blocks[2]).toMatchObject({ type: "list", items: ["保留"] });
    expect(restored.blocks[3]).toMatchObject({
      type: "table",
      rows: [
        { cells: ["", "", ""], header: true },
        { cells: ["", "内容", ""] },
      ],
    });
  });

  it("preserves block ids, block styles, and rich text attrs across round trips", () => {
    const article: ArticleAst = {
      meta: { title: "样式保留" },
      blocks: [
        { id: "title-keep", type: "title", text: "样式保留", style: { "text-align": "center" } },
        {
          id: "p-keep",
          type: "paragraph",
          runs: [
            {
              text: "彩色重点",
              marks: ["bold", "underline", "strike"],
              attrs: { color: "#dc2626", background: "#fef3c7", fontSize: "18px" },
            },
          ],
          style: { background: "#fff7ed", "text-align": "center" },
        },
      ],
    };

    const doc = astToTiptapDoc(article);
    const restored = tiptapDocToAst(doc, article);

    expect(doc.content[1].attrs).toMatchObject({
      blockId: "p-keep",
      blockStyle: { background: "#fff7ed", "text-align": "center" },
      textAlign: "center",
    });
    expect(restored.blocks[1]).toMatchObject({
      id: "p-keep",
      style: { background: "#fff7ed", "text-align": "center" },
    });
    expect(restored.blocks[1]).toMatchObject({
      type: "paragraph",
      runs: [
        {
          text: "彩色重点",
          marks: ["bold", "underline", "strike"],
          attrs: { color: "#dc2626", background: "#fef3c7", fontSize: "18px" },
        },
      ],
    });
  });

  it("preserves block roles across Tiptap round trips", () => {
    const article: ArticleAst = {
      meta: { title: "角色标注" },
      blocks: [
        { id: "title-1", type: "title", text: "角色标注", style: {} },
        { id: "p-lead", type: "paragraph", runs: [{ text: "开头引言" }], role: "lead", style: {} },
        { id: "quote-key", type: "quote", text: "关键金句", role: "keyQuote", style: {} },
      ],
    };

    const doc = astToTiptapDoc(article);
    const restored = tiptapDocToAst(doc, article);

    expect(doc.content[1].attrs).toMatchObject({ blockRole: "lead" });
    expect(doc.content[2].attrs).toMatchObject({ blockRole: "keyQuote" });
    expect(restored.blocks[1]).toMatchObject({ role: "lead" });
    expect(restored.blocks[2]).toMatchObject({ role: "keyQuote" });
  });
});
