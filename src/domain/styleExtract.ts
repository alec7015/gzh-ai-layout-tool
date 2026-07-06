export interface WeightedColor {
  hex: string;
  weight: number;
}

export interface StyleStats {
  colors: WeightedColor[];
  body: {
    fontSize?: string;
    lineHeight?: number;
    paragraphGap?: string;
    align?: string;
    letterSpacing?: string;
  };
  heading: {
    variantGuess: string;
    fontSize?: string;
  };
  quote: {
    variantGuess?: string;
  };
  divider: {
    variantGuess?: string;
  };
}

export function extractStyleStats(html: string): StyleStats {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const elements = Array.from(doc.body.querySelectorAll<HTMLElement>("*"));
  const colorWeights = new Map<string, number>();
  const bodyNodes = elements.filter((element) => textLength(element) > 30);
  const bodyFontSize = mode(bodyNodes.map((element) => pxStyle(element, "font-size")).filter(Boolean));
  const bodyLineHeight = modeNumber(bodyNodes.map((element) => lineHeightStyle(element)).filter(isFiniteNumber));
  const paragraphGap = mode(bodyNodes.map((element) => pxStyle(element, "margin-bottom")).filter(Boolean));
  const align = mode(bodyNodes.map((element) => element.style.textAlign).filter(Boolean));
  const letterSpacing = mode(bodyNodes.map((element) => pxStyle(element, "letter-spacing")).filter(Boolean));

  elements.forEach((element) => {
    const weight = Math.max(1, textLength(element));
    collectColor(element.style.color, weight, colorWeights);
    collectColor(element.style.backgroundColor || element.style.background, weight * 0.8, colorWeights);
    collectColor(element.style.borderColor, weight * 0.6, colorWeights);
    collectColor(element.style.borderLeftColor, weight * 1.2, colorWeights);
    collectColor(colorFromBorder(element.style.borderLeft), weight * 1.2, colorWeights);
  });
  html.match(/#[0-9a-f]{3,6}|rgba?\([^)]+\)/gi)?.forEach((color) => collectColor(color, 1, colorWeights));

  const bodyPx = Number.parseFloat(bodyFontSize || "15");
  const headingCandidates = elements.filter((element) => {
    const size = Number.parseFloat(pxStyle(element, "font-size") || "0");
    const text = (element.textContent ?? "").trim();
    return text.length > 0 && text.length < 30 && size > bodyPx * 1.15;
  });
  const headingNode = headingCandidates[0] ?? elements.find((element) => /^H[1-4]$/i.test(element.tagName));

  return {
    colors: Array.from(colorWeights.entries())
      .map(([hex, weight]) => ({ hex, weight }))
      .sort((a, b) => b.weight - a.weight),
    body: {
      fontSize: clampPxString(bodyFontSize, 13, 18),
      lineHeight: clampNumber(bodyLineHeight, 1.5, 2.2),
      paragraphGap: clampPxString(paragraphGap, 10, 32),
      align: align === "center" ? "center" : align === "right" ? "right" : "left",
      letterSpacing: letterSpacing || undefined,
    },
    heading: {
      variantGuess: headingNode ? guessHeadingVariant(headingNode) : "plain-bold",
      fontSize: clampPxString(headingNode ? pxStyle(headingNode, "font-size") : "", 15, 26),
    },
    quote: { variantGuess: guessQuoteVariant(elements) },
    divider: { variantGuess: guessDividerVariant(elements) },
  };
}

export function normalizeHexColor(value: string): string | null {
  const input = value.trim().toLowerCase();
  const shortHex = input.match(/^#([0-9a-f]{3})$/i);
  if (shortHex) {
    return `#${shortHex[1].split("").map((char) => `${char}${char}`).join("")}`;
  }
  if (/^#[0-9a-f]{6}$/i.test(input)) {
    return input;
  }

  const rgb = input.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!rgb) {
    return null;
  }
  return `#${[rgb[1], rgb[2], rgb[3]]
    .map((part) => Number(part).toString(16).padStart(2, "0"))
    .join("")}`;
}

function collectColor(value: string, weight: number, map: Map<string, number>) {
  const hex = normalizeHexColor(value);
  if (!hex || isGrayScale(hex)) {
    return;
  }
  map.set(hex, (map.get(hex) ?? 0) + weight);
}

function guessHeadingVariant(element: HTMLElement) {
  const styleText = element.getAttribute("style") ?? "";
  const childStyle = Array.from(element.querySelectorAll<HTMLElement>("span,i,b")).map((child) => child.getAttribute("style") ?? "").join(";");
  if (/border-left/i.test(styleText)) {
    return "left-color-bar";
  }
  if (/linear-gradient\(transparent/i.test(styleText)) {
    return "gradient-underline";
  }
  if (/border-radius/i.test(childStyle) && /background/i.test(childStyle)) {
    return "number-badge";
  }
  if (/background/i.test(styleText) && !/transparent/i.test(styleText)) {
    return "block-fill";
  }
  if (element.style.textAlign === "center" && /[✦❖◆]/.test(element.textContent ?? "")) {
    return "center-ornament";
  }
  return "plain-bold";
}

function guessQuoteVariant(elements: HTMLElement[]) {
  if (elements.some((element) => element.tagName.toLowerCase() === "blockquote")) {
    return "left-line";
  }
  if (elements.some((element) => /border-left/i.test(element.getAttribute("style") ?? "") && /background/i.test(element.getAttribute("style") ?? ""))) {
    return "large-quote-card";
  }
  return undefined;
}

function guessDividerVariant(elements: HTMLElement[]) {
  if (elements.some((element) => element.tagName.toLowerCase() === "hr")) {
    return "thin-gray-line";
  }
  if (elements.some((element) => /^[✦❖◆•·]+$/.test((element.textContent ?? "").trim()))) {
    return "ornament";
  }
  return undefined;
}

function pxStyle(element: HTMLElement, key: string) {
  return element.style.getPropertyValue(key);
}

function lineHeightStyle(element: HTMLElement) {
  const lineHeight = element.style.lineHeight;
  const parsed = Number.parseFloat(lineHeight);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return lineHeight.endsWith("px") ? parsed / Math.max(1, Number.parseFloat(element.style.fontSize || "15")) : parsed;
}

function colorFromBorder(value: string) {
  return value.match(/#[0-9a-f]{3,6}|rgba?\([^)]+\)/i)?.[0] ?? "";
}

function textLength(element: Element) {
  return (element.textContent ?? "").trim().length;
}

function mode(values: string[]) {
  return frequency(values)[0]?.value;
}

function modeNumber(values: number[]) {
  return frequency(values.map((value) => String(Number(value.toFixed(2)))))[0]?.valueAsNumber;
}

function frequency(values: string[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, valueAsNumber: Number(value), count }))
    .sort((a, b) => b.count - a.count);
}

function clampPxString(value: string | undefined, min: number, max: number) {
  const parsed = Number.parseFloat(value ?? "");
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return `${Math.round(clamp(parsed, min, max))}px`;
}

function clampNumber(value: number | undefined, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return undefined;
  }
  return Number(clamp(value as number, min, max).toFixed(2));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function isGrayScale(hex: string) {
  const [r, g, b] = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((part) => Number.parseInt(part, 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const saturation = max === min ? 0 : lightness > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
  return saturation < 0.15 || lightness > 0.92 || lightness < 0.1;
}

function isFiniteNumber(value: number | undefined): value is number {
  return Number.isFinite(value);
}
