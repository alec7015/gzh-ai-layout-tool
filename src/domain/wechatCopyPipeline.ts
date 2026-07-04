type ImageFetcher = (url: string) => Promise<Blob>;

export function reshapeForWechat(root: HTMLElement, primary = "#3aa675"): void {
  root.querySelectorAll("li").forEach((li) => {
    if (li.querySelector(":scope > span[data-wx]")) {
      return;
    }

    const span = document.createElement("span");
    span.setAttribute("data-wx", "1");
    span.setAttribute("style", "display:inline;font-size:inherit;color:inherit;line-height:inherit;");
    while (li.firstChild) {
      span.appendChild(li.firstChild);
    }
    li.appendChild(span);
    li.style.margin = "6px 0";
  });

  root.querySelectorAll("ul,ol").forEach((list) => {
    (list as HTMLElement).setAttribute("style", "margin:12px 0;padding-left:1.4em;");
  });

  root.querySelectorAll("table").forEach((table) => {
    (table as HTMLElement).setAttribute(
      "style",
      "border-collapse:collapse;width:100%;margin:16px 0;font-size:14px;"
    );
  });

  root.querySelectorAll("th").forEach((cell) => {
    (cell as HTMLElement).setAttribute(
      "style",
      `border:1px solid #e2e5ea;padding:8px 10px;background:${primary}14;font-weight:600;text-align:left;`
    );
  });

  root.querySelectorAll("td").forEach((cell) => {
    (cell as HTMLElement).setAttribute("style", "border:1px solid #e2e5ea;padding:8px 10px;");
  });
}

export async function inlineExternalImages(
  root: HTMLElement,
  fetcher: ImageFetcher = fetchImageBlob
): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(async (image) => {
      const src = image.getAttribute("src") ?? "";
      if (!src || src.startsWith("data:")) {
        return;
      }

      try {
        const blob = await fetcher(src);
        image.setAttribute("src", await blobToDataUrl(blob));
      } catch {
        image.setAttribute("src", src);
      }
    })
  );
}

export async function prepareWechatHtml(html: string, primary?: string): Promise<string> {
  const box = document.createElement("div");
  box.innerHTML = html;
  box.style.position = "fixed";
  box.style.left = "-99999px";
  box.style.top = "0";
  document.body.appendChild(box);

  try {
    reshapeForWechat(box, primary);
    await inlineExternalImages(box);
    return box.innerHTML;
  } finally {
    box.remove();
  }
}

async function fetchImageBlob(url: string): Promise<Blob> {
  const tauriFetch = await getTauriFetch();
  if (tauriFetch) {
    const response = await tauriFetch(url);
    return await response.blob();
  }

  const response = await fetch(url, { mode: "cors" });
  if (!response.ok) {
    throw new Error(`Image fetch failed: ${response.status}`);
  }
  return await response.blob();
}

async function getTauriFetch(): Promise<null | ((url: string) => Promise<Response>)> {
  if (!("__TAURI_INTERNALS__" in window) && !("__TAURI__" in window)) {
    return null;
  }

  try {
    const mod = await import("@tauri-apps/plugin-http");
    return mod.fetch as unknown as (url: string) => Promise<Response>;
  } catch {
    return null;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(blob);
  });
}
