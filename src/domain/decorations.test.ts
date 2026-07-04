import { describe, expect, it } from "vitest";
import { createSampleArticle } from "./draftStore";
import { stylePresets } from "./stylePresets";
import { renderWechatHtml } from "./wechatRenderer";

describe("style decorations", () => {
  it("renders configured follow card decorations as inline html", () => {
    const preset = stylePresets.find((item) => item.id === "listicle_cards");
    expect(preset).toBeDefined();

    const html = renderWechatHtml(createSampleArticle(), preset!);

    expect(html).toContain("感谢阅读");
    expect(html).toContain("关注");
    expect(html).not.toContain("class=");
  });

  it("omits footer decoration when the preset does not define one", () => {
    const preset = stylePresets.find((item) => item.id === "minimal_editorial");
    expect(preset).toBeDefined();

    const html = renderWechatHtml(createSampleArticle(), preset!);

    expect(html).not.toContain("感谢阅读");
  });
});
