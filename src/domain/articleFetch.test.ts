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

  it("normalizes WeChat lazy images before style extraction", () => {
    const html = `<div id="js_content"><img data-src="https://img.example/a.jpg" style="width:100%" /><p>正文</p></div>`;

    expect(extractArticleBodyHtml(html)).toContain('src="https://img.example/a.jpg"');
  });

  it("reports WeChat verification pages separately from empty articles", async () => {
    const result = await fetchArticleHtml(
      "https://mp.weixin.qq.com/s/demo",
      async () => new Response("<html><body>当前环境异常，请完成验证</body></html>")
    );

    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.reason).toContain("微信验证");
  });

  it("sends desktop-like headers when fetching article HTML", async () => {
    let headers: HeadersInit | undefined;
    await fetchArticleHtml("https://mp.weixin.qq.com/s/demo", async (_url, init) => {
      headers = init?.headers;
      return new Response(`<div id="js_content"><p>${"正文".repeat(20)}</p></div>`);
    });

    expect(JSON.stringify(headers)).toContain("Accept-Language");
  });
});
