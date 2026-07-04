import { describe, expect, it } from "vitest";
import { clearBlockOverrides, getBlockLabel, setBlockOverride } from "./blockOverrides";
import { createSampleArticle } from "./draftStore";
import { defaultStylePreset } from "./stylePresets";
import { renderWechatHtml } from "./wechatRenderer";

describe("blockOverrides", () => {
  it("sets and clears style overrides for a single block", () => {
    const article = createSampleArticle();
    const blockId = article.blocks[1].id;
    const styled = setBlockOverride(article, blockId, "background", "#FFF7ED");

    expect(styled.blocks[1].style?.background).toBe("#FFF7ED");
    expect(styled.blocks[2].style?.background).toBeUndefined();

    const cleared = clearBlockOverrides(styled, blockId);
    expect(cleared.blocks[1].style).toEqual({});
  });

  it("adds block overrides to rendered inline html", () => {
    const article = setBlockOverride(createSampleArticle(), "b-heading-1", "color", "#0F766E");
    const html = renderWechatHtml(article, defaultStylePreset);

    expect(html).toContain("color:#0F766E");
  });

  it("returns readable labels for block picker options", () => {
    const article = createSampleArticle();

    expect(getBlockLabel(article.blocks[0])).toBe("主标题：三个早起技巧");
    expect(getBlockLabel(article.blocks[3])).toBe("列表：3 项");
  });
});
