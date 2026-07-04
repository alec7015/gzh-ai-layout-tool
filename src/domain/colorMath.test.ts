import { describe, expect, it } from "vitest";
import { contrastRatio, ensureContrast, hexToHsl, hslToHex } from "./colorMath";
import { derivePaletteOverrides } from "./paletteDerive";

function seededHex(index: number) {
  const value = (index * 1103515245 + 12345) >>> 0;
  return `#${(value & 0xffffff).toString(16).padStart(6, "0")}`;
}

describe("colorMath", () => {
  it.each(["#000000", "#ffffff", "#07C160"])("round trips %s through HSL", (hex) => {
    const hsl = hexToHsl(hex);
    const restored = hslToHex(hsl.h, hsl.s, hsl.l);

    expect(Number.parseInt(restored.slice(1), 16)).toBeCloseTo(Number.parseInt(hex.slice(1), 16), -2);
  });

  it("ensures contrast against a target color", () => {
    const adjusted = ensureContrast("#eeeeee", "#ffffff", 3);

    expect(contrastRatio(adjusted, "#ffffff")).toBeGreaterThanOrEqual(3);
  });

  it("derives accessible palette overrides from arbitrary primary colors", () => {
    for (let index = 0; index < 200; index += 1) {
      const overrides = derivePaletteOverrides(seededHex(index));

      expect(overrides["palette.primary"]).toMatch(/^#[0-9a-f]{6}$/i);
      expect(overrides["palette.secondary"]).toMatch(/^#[0-9a-f]{6}$/i);
      expect(overrides["palette.accent"]).toMatch(/^#[0-9a-f]{6}$/i);
      expect(overrides["palette.textSub"]).toMatch(/^#[0-9a-f]{6}$/i);
      expect(contrastRatio(String(overrides["palette.primary"]), "#ffffff")).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(String(overrides["palette.secondary"]), "#24282B")).toBeGreaterThanOrEqual(7);
      expect(contrastRatio(String(overrides["palette.accent"]), "#ffffff")).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(String(overrides["palette.textSub"]), "#ffffff")).toBeGreaterThanOrEqual(4.5);
    }
  });
});
