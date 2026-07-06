import { resolveFetchLike } from "./aiClient";

type FetchLike = typeof fetch;

export type ArticleFetchResult =
  | { ok: true; html: string; sourceUrl: string }
  | { ok: false; reason: string; status?: number };

export async function fetchArticleHtml(
  url: string,
  fetcher?: FetchLike
): Promise<ArticleFetchResult> {
  const normalizedUrl = url.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    return { ok: false, reason: "请输入 http 或 https 开头的文章链接。" };
  }

  try {
    const doFetch = fetcher ?? (await resolveFetchLike());
    const response = await doFetch(normalizedUrl);
    const rawHtml = await response.text();
    if (!response.ok) {
      return { ok: false, reason: `文章抓取失败：HTTP ${response.status}`, status: response.status };
    }

    const html = extractArticleBodyHtml(rawHtml);
    if (!html) {
      return { ok: false, reason: "未找到可提取的正文，请改用富文本粘贴入口。" };
    }

    return { ok: true, html, sourceUrl: normalizedUrl };
  } catch (error) {
    const reason =
      error instanceof Error && /cors/i.test(error.message)
        ? "网页版受 CORS 限制，请改用富文本粘贴入口或桌面版。"
        : "文章抓取失败，请改用富文本粘贴入口。";
    return { ok: false, reason };
  }
}

export function extractArticleBodyHtml(rawHtml: string): string {
  const doc = new DOMParser().parseFromString(rawHtml, "text/html");
  const direct = doc.querySelector("#js_content, .rich_media_content");
  if (direct?.innerHTML.trim()) {
    return direct.innerHTML.trim();
  }

  const candidates = Array.from(doc.body.querySelectorAll("article,main,section,div"));
  const best = candidates
    .map((element) => ({ element, length: (element.textContent ?? "").trim().length }))
    .filter((item) => item.length > 20)
    .sort((a, b) => b.length - a.length)[0]?.element;

  return best?.innerHTML.trim() ?? "";
}
