import { describe, expect, it } from "vitest";
import { createSampleArticle } from "./draftStore";
import { astToTiptapDoc, tiptapDocToPlainText } from "./tiptapAdapter";

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
});
