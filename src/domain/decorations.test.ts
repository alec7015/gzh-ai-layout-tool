import { describe, expect, it } from "vitest";
import { createSampleArticle } from "./draftStore";
import { stylePresets } from "./stylePresets";
import { renderWechatHtml } from "./wechatRenderer";

describe("style decorations", () => {
  it("does not render hard-coded footer text by default", () => {
    const preset = stylePresets.find((item) => item.id === "listicle_cards");
    expect(preset).toBeDefined();

    const html = renderWechatHtml(createSampleArticle(), preset!);

    expect(html).not.toContain("感谢阅读");
    expect(html).not.toContain("关注");
    expect(html).not.toContain("class=");
  });

  it("renders custom footer text when configured", () => {
    const preset = stylePresets.find((item) => item.id === "minimal_editorial");
    expect(preset).toBeDefined();

    const html = renderWechatHtml(createSampleArticle(), {
      ...preset!,
      decorations: {
        ...preset!.decorations,
        footer: "follow-card",
        footerText: "欢迎留言交流你的看法。",
      },
    });

    expect(html).toContain("欢迎留言交流你的看法。");
    expect(html).not.toContain("感谢阅读");
  });
});
