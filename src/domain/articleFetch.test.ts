import { describe, expect, it } from "vitest";
import { extractArticleBodyHtml, fetchArticleHtml } from "./articleFetch";

describe("articleFetch", () => {
  it("extracts the WeChat article body when js_content exists", () => {
    const html = `<html><body><div id="js_content"><p>公众号正文</p></div><aside>旁栏</aside></body></html>`;

    expect(extractArticleBodyHtml(html)).toBe("<p>公众号正文</p>");
  });

  it("falls back to the largest text container for non-WeChat pages", () => {
    const html = `<main><section><p>${"长正文".repeat(40)}</p></section><nav>短</nav></main>`;

    expect(extractArticleBodyHtml(html)).toContain("长正文");
  });

  it("returns a typed failure when fetching empty article HTML", async () => {
    const result = await fetchArticleHtml("https://example.com/empty", async () => new Response("<html />"));

    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.reason).toContain("未找到");
  });
});
