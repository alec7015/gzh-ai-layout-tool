import { describe, expect, it } from "vitest";
import { VARIANT_VOCABULARY } from "./stylePresets";
import {
  buildStyleTransferRequest,
  coerceExtractedPreset,
  statsToPreset,
  type ExtractedPresetPatch,
} from "./styleTransfer";
import type { StyleStats } from "./styleExtract";

const stats: StyleStats = {
  colors: [{ hex: "#1677ff", weight: 120 }],
  body: { fontSize: "28px", lineHeight: 3.2, paragraphGap: "80px", align: "left" },
  heading: { variantGuess: "left-color-bar", fontSize: "34px" },
  quote: { variantGuess: "left-line" },
  divider: { variantGuess: "thin-gray-line" },
};

describe("styleTransfer", () => {
  it("converts stats into a clamped legal preset", () => {
    const preset = statsToPreset(stats, "提取版式 · 07-05");

    expect(preset.name).toBe("提取版式 · 07-05");
    expect(preset.palette.primary).toBe("#1677ff");
    expect(preset.typography.bodySize).toBe("18px");
    expect(preset.typography.lineHeight).toBe(2.2);
    expect(preset.rhythm.paragraphGap).toBe("32px");
    expect(preset.components.heading.variant).toBe("left-color-bar");
  });

  it("builds an AI request from stats and variant vocabulary only", () => {
    const request = buildStyleTransferRequest(stats);
    const content = request.messages.map((message) => message.content).join("\n");

    expect(content).toContain("StyleStats");
    expect(content).toContain(VARIANT_VOCABULARY.heading[0]);
    expect(content).not.toContain("<section");
  });

  it("coerces extracted preset patches through a whitelist", () => {
    const patch = coerceExtractedPreset({
      name: "蓝色清单",
      moods: ["清爽", "教程", "x".repeat(50)],
      palette: { primary: "#1677ff", secondary: "bad" },
      typography: { bodySize: "11px", lineHeight: 4 },
      components: { heading: "block-fill", quote: "nope" },
      unsafe: true,
    } satisfies ExtractedPresetPatch & { unsafe: boolean });

    expect(patch).toMatchObject({
      name: "蓝色清单",
      palette: { primary: "#1677ff" },
      typography: { bodySize: "13px", lineHeight: 2.2 },
      components: { heading: { variant: "block-fill" } },
    });
    expect(patch?.components?.quote).toEqual({ variant: "card" });
  });
});
