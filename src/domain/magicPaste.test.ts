import { describe, expect, it } from "vitest";
import { htmlToCleanArticle } from "./magicPaste";
import { renderWechatHtml } from "./wechatRenderer";
import { defaultStylePreset } from "./stylePresets";

describe("htmlToCleanArticle", () => {
  it("converts pasted rich HTML to clean article blocks", () => {
    const article = htmlToCleanArticle(`
      <h1 style="color:red" class="dirty">标题</h1>
      <p><strong>重点</strong>正文</p>
      <ul><li>第一项</li><li>第二项</li></ul>
      <table style="width:999px"><tr><th>指标</th><th>结果</th></tr><tr><td>复制</td><td>稳定</td></tr></table>
    `);

    expect(article.meta.title).toBe("标题");
    expect(article.blocks.map((block) => block.type)).toEqual([
      "title",
      "paragraph",
      "list",
      "table",
    ]);
    expect(article.blocks[1]).toMatchObject({ type: "paragraph" });

    const headingArticle = htmlToCleanArticle("<h1>标题</h1><h2>正文小节</h2><p>正文</p>");
    expect(headingArticle.blocks[1]).toMatchObject({ type: "heading", level: 1 });

    const html = renderWechatHtml(article, defaultStylePreset);
    expect(html).toContain("重点");
    expect(html).toContain("<table");
    expect(html).not.toContain("dirty");
    expect(html).not.toContain("width:999px");
  });
});
