import { ensureContrast, hexToHsl, hslToHex } from "./colorMath";
import type { StyleOverrides } from "./types";

export function derivePaletteOverrides(primary: string): StyleOverrides {
  const primaryHsl = hexToHsl(primary);
  const safePrimary = ensureContrast(primary, "#ffffff", 3);
  const secondary = ensureContrast(
    hslToHex(primaryHsl.h, primaryHsl.s * 0.3, 96.5),
    "#24282B",
    7
  );
  const accent = ensureContrast(
    hslToHex(primaryHsl.h + 24, primaryHsl.s * 0.85, 42),
    "#ffffff",
    3
  );
  const textSub = ensureContrast(hslToHex(primaryHsl.h, 8, 52), "#ffffff", 4.5);

  return {
    "palette.primary": safePrimary,
    "palette.secondary": secondary,
    "palette.accent": accent,
    "palette.textSub": textSub,
  };
}
