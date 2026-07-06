import type { ChatCompletionRequest } from "./aiWriting";
import type { Palette } from "./types";

const allowedElements = new Set(["svg", "g", "path", "circle", "rect", "line", "ellipse", "polygon", "defs", "linearGradient", "stop"]);
const allowedAttrs = new Set([
  "d",
  "cx",
  "cy",
  "r",
  "x",
  "y",
  "width",
  "height",
  "x1",
  "y1",
  "x2",
  "y2",
  "points",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "opacity",
  "transform",
  "viewBox",
  "offset",
  "stop-color",
  "gradientUnits",
  "id",
]);

export type SvgSanitizeResult =
  | { ok: true; svg: string }
  | { ok: false; reason: string };

export function buildOrnamentRequest(
  articleTopic: string,
  palette: Pick<Palette, "primary" | "secondary" | "accent">,
  style = "简约几何"
): ChatCompletionRequest {
  return {
    model: "openai-compatible-chat-model",
    temperature: 0.35,
    messages: [
      {
        role: "system",
        content:
          `只输出一个 <svg viewBox="0 0 680 120">。只允许 path / circle / rect / line / g 元素。` +
          `只使用这些颜色：${palette.primary}/${palette.secondary}/${palette.accent}/#FFFFFF。` +
          `禁止 text / image / script / foreignObject / style / 外部引用。`,
      },
      {
        role: "user",
        content: `为公众号文章「${articleTopic || "未命名文章"}」生成一条${style}风格的小装饰图。`,
      },
    ],
  };
}

export function sanitizeSvg(raw: string): SvgSanitizeResult {
  if (/on[a-z]+\s*=|href\s*=|xlink:href\s*=/i.test(raw)) {
    return { ok: false, reason: "SVG 含事件或外部引用，已拒绝。" };
  }

  const doc = new DOMParser().parseFromString(raw.trim(), "image/svg+xml");
  const root = doc.documentElement;
  if (!root || root.tagName !== "svg" || root.querySelector("parsererror")) {
    return { ok: false, reason: "模型返回内容不是合法 SVG。" };
  }

  sanitizeElement(root);
  if (!root.getAttribute("viewBox")) {
    root.setAttribute("viewBox", "0 0 680 120");
  }
  return { ok: true, svg: new XMLSerializer().serializeToString(root) };
}

export function svgToPngDataUrl(svg: string, options: { width?: number } = {}): Promise<string> {
  const width = options.width ?? 1360;
  const height = Math.round(width / (680 / 120));
  const encoded = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 不可用，无法生成装饰图。"));
        return;
      }
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => reject(new Error("SVG 装饰图加载失败。"));
    image.src = encoded;
  });
}

function sanitizeElement(element: Element): void {
  Array.from(element.children).forEach((child) => {
    if (!allowedElements.has(child.tagName)) {
      child.remove();
      return;
    }
    sanitizeElement(child);
  });

  Array.from(element.attributes).forEach((attr) => {
    if (!allowedAttrs.has(attr.name) || /^on/i.test(attr.name) || /href/i.test(attr.name)) {
      element.removeAttribute(attr.name);
    }
  });
}
