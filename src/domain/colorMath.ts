export interface HslColor {
  h: number;
  s: number;
  l: number;
}

export function hexToHsl(hex: string): HslColor {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;

  if (delta === 0) {
    return { h: 0, s: 0, l: l * 100 };
  }

  const s = delta / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (max === rn) {
    h = 60 * (((gn - bn) / delta) % 6);
  } else if (max === gn) {
    h = 60 * ((bn - rn) / delta + 2);
  } else {
    h = 60 * ((rn - gn) / delta + 4);
  }

  return {
    h: normalizeHue(h),
    s: s * 100,
    l: l * 100,
  };
}

export function hslToHex(h: number, s: number, l: number): string {
  const hue = normalizeHue(h);
  const saturation = clamp(s, 0, 100) / 100;
  const lightness = clamp(l, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lightness - chroma / 2;
  let [r, g, b] = [0, 0, 0];

  if (hue < 60) {
    [r, g, b] = [chroma, x, 0];
  } else if (hue < 120) {
    [r, g, b] = [x, chroma, 0];
  } else if (hue < 180) {
    [r, g, b] = [0, chroma, x];
  } else if (hue < 240) {
    [r, g, b] = [0, x, chroma];
  } else if (hue < 300) {
    [r, g, b] = [x, 0, chroma];
  } else {
    [r, g, b] = [chroma, 0, x];
  }

  return rgbToHex({
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  });
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const [rs, gs, bs] = [r, g, b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function ensureContrast(hex: string, against: string, target: number): string {
  if (contrastRatio(hex, against) >= target) {
    return normalizeHex(hex);
  }

  const hsl = hexToHsl(hex);
  const againstIsLight = relativeLuminance(against) >= 0.5;
  let nextLightness = hsl.l;

  for (let step = 0; step <= 50; step += 1) {
    nextLightness = againstIsLight ? nextLightness - 2 : nextLightness + 2;
    const candidate = hslToHex(hsl.h, hsl.s, clamp(nextLightness, 0, 100));
    if (contrastRatio(candidate, against) >= target) {
      return candidate;
    }
  }

  return againstIsLight ? "#000000" : "#ffffff";
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = normalizeHex(hex);
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  return `#${[r, g, b].map((channel) => clamp(channel, 0, 255).toString(16).padStart(2, "0")).join("")}`;
}

function normalizeHex(hex: string) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return hex.toLowerCase();
}

function normalizeHue(h: number) {
  return ((h % 360) + 360) % 360;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
