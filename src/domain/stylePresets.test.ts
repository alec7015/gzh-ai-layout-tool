import { describe, expect, it } from "vitest";
import { defaultStylePreset, VARIANT_LABELS, VARIANT_VOCABULARY } from "./stylePresets";

describe("stylePresets variant labels", () => {
  it("provides user-facing labels for component variant dropdowns", () => {
    expect(VARIANT_LABELS.heading["plain-bold"]).toBe("无装饰加粗");
    expect(VARIANT_LABELS.heading["number-badge"]).toBe("序号章（自动编号）");
    expect(VARIANT_LABELS.heading["chapter-badge"]).toBe("章节徽标（自动编号）");
    expect(Object.keys(VARIANT_LABELS.heading)).toEqual(expect.arrayContaining([...VARIANT_VOCABULARY.heading]));
  });

  it("does not enable automatic heading numbering by default", () => {
    expect(defaultStylePreset.id).toBe("listicle_cards");
    expect(defaultStylePreset.components.heading.variant).toBe("left-color-bar");
  });
});
