import { describe, expect, it } from "vitest";
import { astToPlainText, createSampleArticle, plainTextToAst } from "./draftStore";
import { appendImageBlock, isSupportedImageFile } from "./imageAssets";

describe("imageAssets", () => {
  it("accepts common image files only", () => {
    expect(isSupportedImageFile({ type: "image/png" } as File)).toBe(true);
    expect(isSupportedImageFile({ type: "image/jpeg" } as File)).toBe(true);
    expect(isSupportedImageFile({ type: "text/plain" } as File)).toBe(false);
  });

  it("creates and appends image blocks", () => {
    const article = createSampleArticle();
    const next = appendImageBlock(article, "data:image/png;base64,abc", "配图");
    const image = next.blocks.at(-1);

    expect(next.blocks).toHaveLength(article.blocks.length + 1);
    expect(image?.type).toBe("image");
    expect(image?.id).toMatch(/^image-/);
    expect(image && "src" in image ? image.src : "").toBe("data:image/png;base64,abc");
  });

  it("round trips markdown image syntax through draft text", () => {
    const ast = plainTextToAst("标题\n\n![图注](data:image/png;base64,abc)");
    const image = ast.blocks.at(-1);

    expect(image?.type).toBe("image");
    expect(astToPlainText(ast)).toContain("![图注](data:image/png;base64,abc)");
  });
});
