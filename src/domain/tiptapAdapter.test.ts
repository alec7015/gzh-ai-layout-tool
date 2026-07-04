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
});
