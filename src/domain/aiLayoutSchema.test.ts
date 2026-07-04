import { describe, expect, it } from "vitest";
import { coerceLayoutRecommendation, buildLayoutRequest } from "./aiLayoutSchema";
import { createSampleArticle } from "./draftStore";

describe("aiLayoutSchema", () => {
  it("accepts valid model layout recommendations", () => {
    const recommendation = coerceLayoutRecommendation({
      styleId: "listicle_cards",
      reason: "结构清晰",
      overrides: {
        "palette.primary": "#2B6CB0",
        "rhythm.paragraphGap": "16px",
      },
    });

    expect(recommendation?.styleId).toBe("listicle_cards");
    expect(recommendation?.overrides["palette.primary"]).toBe("#2B6CB0");
  });

  it("rejects unknown style ids and unsafe override paths", () => {
    expect(coerceLayoutRecommendation({ styleId: "unknown", reason: "x", overrides: {} })).toBeNull();
    expect(
      coerceLayoutRecommendation({
        styleId: "listicle_cards",
        reason: "x",
        overrides: { "__proto__.polluted": "yes" },
      })
    ).toBeNull();
  });

  it("builds a JSON-only adaptive layout request", () => {
    const request = buildLayoutRequest(createSampleArticle());

    expect(request.response_format).toEqual({ type: "json_object" });
    expect(request.messages[1].content).toContain("三个早起技巧");
    expect(request.messages[1].content).toContain("styleId");
  });
});
