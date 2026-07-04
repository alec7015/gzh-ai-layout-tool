import { afterEach, describe, expect, it, vi } from "vitest";
import { inlineExternalImages, reshapeForWechat } from "./wechatCopyPipeline";

describe("reshapeForWechat", () => {
  it("wraps list content and inlines table styles for WeChat copy", () => {
    const box = document.createElement("div");
    box.innerHTML = `
      <ul><li>第一项</li></ul>
      <table><thead><tr><th>指标</th></tr></thead><tbody><tr><td>结果</td></tr></tbody></table>
    `;

    reshapeForWechat(box, "#3aa675");

    expect(box.querySelector("li > span[data-wx]")?.textContent).toBe("第一项");
    expect(box.querySelector("table")?.getAttribute("style")).toContain("border-collapse:collapse");
    expect(box.querySelector("th")?.getAttribute("style")).toContain("border:1px solid");
    expect(box.querySelector("td")?.getAttribute("style")).toContain("padding:8px 10px");
  });
});

describe("inlineExternalImages", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("converts external images to data URLs before copying", async () => {
    const box = document.createElement("div");
    box.innerHTML = '<img src="https://example.com/a.png" />';
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("abc", { headers: { "Content-Type": "image/png" } }))
    );

    await inlineExternalImages(box);

    expect(box.querySelector("img")?.getAttribute("src")).toMatch(/^data:image\/png;base64,/);
  });

  it("keeps the original URL when an external image cannot be fetched", async () => {
    const box = document.createElement("div");
    box.innerHTML = '<img src="https://example.com/missing.png" />';
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("cors")));

    await inlineExternalImages(box);

    expect(box.querySelector("img")?.getAttribute("src")).toBe("https://example.com/missing.png");
  });
});
