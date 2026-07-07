import { isTauriRuntime, resolveFetchLike } from "./aiClient";

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
    const response = await doFetch(normalizedUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.6",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      },
    });
    const rawHtml = await response.text();
    if (!response.ok) {
      return { ok: false, reason: `文章抓取失败：HTTP ${response.status}`, status: response.status };
    }

    if (isWechatVerificationPage(rawHtml)) {
      return { ok: false, reason: "微信验证页拦截了抓取，请在浏览器打开文章后改用富文本粘贴入口。" };
    }

    const html = extractArticleBodyHtml(rawHtml);
    if (!html) {
      return { ok: false, reason: "未找到可提取的正文，请改用富文本粘贴入口。" };
    }

    return { ok: true, html, sourceUrl: normalizedUrl };
  } catch (error) {
    const reason =
      !fetcher && !isTauriRuntime()
        ? "网页版受 CORS 限制或目标站点反爬，请改用富文本粘贴入口或桌面版。"
        : error instanceof Error && /cors/i.test(error.message)
        ? "网页版受 CORS 限制，请改用富文本粘贴入口或桌面版。"
        : "文章抓取失败，请改用富文本粘贴入口。";
    return { ok: false, reason };
  }
}

export function extractArticleBodyHtml(rawHtml: string): string {
  const doc = new DOMParser().parseFromString(rawHtml, "text/html");
  const direct = doc.querySelector("#js_content, .rich_media_content");
  if (direct?.innerHTML.trim()) {
    return normalizeArticleBody(direct).innerHTML.trim();
  }

  const candidates = Array.from(doc.body.querySelectorAll("article,main,section,div"));
  const best = candidates
    .map((element) => ({ element, length: (element.textContent ?? "").trim().length }))
    .filter((item) => item.length > 20)
    .sort((a, b) => b.length - a.length)[0]?.element;

  return best ? normalizeArticleBody(best).innerHTML.trim() : "";
}

function normalizeArticleBody(element: Element): Element {
  const clone = element.cloneNode(true) as Element;
  clone.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
    const lazySrc = image.getAttribute("data-src") || image.getAttribute("data-original");
    if (lazySrc && !image.getAttribute("src")) {
      image.setAttribute("src", lazySrc);
    }
  });
  clone.querySelectorAll<HTMLElement>("[style]").forEach((node) => {
    const style = node.getAttribute("style") ?? "";
    const cleaned = style
      .split(";")
      .map((part) => part.trim())
      .filter((part) => part && !/^visibility\s*:\s*hidden/i.test(part) && !/^display\s*:\s*none/i.test(part))
      .join("; ");
    if (cleaned) {
      node.setAttribute("style", cleaned);
    } else {
      node.removeAttribute("style");
    }
  });
  return clone;
}

function isWechatVerificationPage(html: string): boolean {
  return /当前环境异常|环境异常|请完成验证|访问频率过高|安全验证/i.test(html);
}
