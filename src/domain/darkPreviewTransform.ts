import { hexToHsl, hslToHex, relativeLuminance } from "./colorMath";
import { normalizeHexColor } from "./styleExtract";

const colorStyleProperties = [
  "color",
  "background",
  "background-color",
  "border-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
] as const;

export function renderDarkPreviewHtml(html: string): string {
  if (!html.trim()) {
    return html;
  }

  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  doc.body.querySelectorAll<HTMLElement>("[style]").forEach((element) => {
    const styleText = element.getAttribute("style");
    if (styleText) {
      element.setAttribute("style", transformInlineStyle(styleText));
    }
  });

  return doc.body.innerHTML;
}

function transformInlineStyle(styleText: string): string {
  return styleText
    .split(";")
    .map((declaration) => {
      const [rawProperty, ...rawValue] = declaration.split(":");
      const property = rawProperty?.trim().toLowerCase();
      const value = rawValue.join(":").trim();
      if (!property || !value) {
        return "";
      }

      if (!shouldMapProperty(property)) {
        return `${property}:${value}`;
      }

      const mapped = value.replace(/#[0-9a-f]{3,6}|rgba?\([^)]+\)/gi, (color) => {
        return mapCssColorForDarkPreview(color, property) ?? color;
      });
      return `${property}:${mapped}`;
    })
    .filter(Boolean)
    .join(";");
}

function shouldMapProperty(property: string): boolean {
  return (
    colorStyleProperties.includes(property as (typeof colorStyleProperties)[number]) ||
    property.startsWith("background") ||
    property.startsWith("border")
  );
}

export function mapCssColorForDarkPreview(value: string, property: string): string | null {
  const hex = normalizeHexColor(value);
  if (!hex) {
    return null;
  }

  const luminance = relativeLuminance(hex);
  const hsl = hexToHsl(hex);
  const isSurface = property.includes("background") || property.includes("border");
  if (isSurface) {
    if (luminance < 0.18) {
      return hex;
    }
    const lightness = luminance > 0.8 ? 10 : luminance > 0.45 ? 16 : 24;
    return hslToHex(hsl.h, hsl.s * 0.45, lightness);
  }

  if (luminance > 0.72) {
    return hex;
  }
  const lightness = luminance < 0.12 ? 92 : 82;
  return hslToHex(hsl.h, Math.min(hsl.s * 0.55, 42), lightness);
}
