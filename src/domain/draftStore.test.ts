import { describe, expect, it } from "vitest";
import { astToPlainText, createSampleArticle, loadDraft, plainTextToAst, saveDraft } from "./draftStore";

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
});
