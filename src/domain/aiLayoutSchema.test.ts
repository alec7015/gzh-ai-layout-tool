import { describe, expect, it } from "vitest";
import {
  buildLayoutPlanRequest,
  buildLayoutRequest,
  coerceLayoutPlan,
  coerceLayoutRecommendation,
} from "./aiLayoutSchema";
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

  it("accepts full components override paths and maps legacy component paths", () => {
    const recommendation = coerceLayoutRecommendation({
      styleId: "listicle_cards",
      reason: "结构清晰",
      overrides: {
        "components.quote.variant": "golden-card",
        "list.variant": "card-items",
      },
    });

    expect(recommendation?.overrides).toMatchObject({
      "components.quote.variant": "golden-card",
      "components.list.variant": "card-items",
    });
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
    const userContent = request.messages[1].content;

    expect(request.response_format).toEqual({ type: "json_object" });
    expect(userContent).toContain("三个早起技巧");
    expect(userContent).toContain("styleId");
    expect(userContent).toContain("listicle_cards｜");
    expect(userContent).toContain("干货");
  });

  it("limits long article content in the layout prompt", () => {
    const article = {
      ...createSampleArticle(),
      blocks: [
        ...createSampleArticle().blocks,
        {
          id: "long",
          type: "paragraph" as const,
          runs: [{ text: "很长".repeat(2000) }],
          style: {},
        },
      ],
    };

    const request = buildLayoutRequest(article);
    const userContent = request.messages[1].content;

    expect(userContent.length).toBeLessThan(5200);
    expect(userContent).not.toContain("很长".repeat(1600));
  });

  it("builds a layout plan request with block ids and variant vocabulary", () => {
    const article = createSampleArticle();
    const request = buildLayoutPlanRequest(article);
    const content = request.messages.map((message) => message.content).join("\n");

    expect(request.response_format).toEqual({ type: "json_object" });
    expect(content).toContain(`plans`);
    expect(content).toContain(`[${article.blocks[0].id}|title]`);
    expect(content).toContain("chapter-badge");
    expect(content).toContain("keyQuote");
  });

  it("coerces layout plans by dropping unsafe fields and enforcing role quotas", () => {
    const article = createSampleArticle();
    const plan = coerceLayoutPlan(
      {
        plans: [
          { styleId: "unknown", reason: "丢弃", components: {} },
          {
            styleId: "listicle_cards",
            reason: "结构清晰",
            palette: { primary: "not-a-color" },
            components: {
              heading: "chapter-badge",
              quote: "not-real",
              list: "card-items",
            },
            blocks: [
              { blockId: article.blocks[1].id, role: "lead" },
              { blockId: article.blocks[2].id, role: "lead" },
              { blockId: "ghost", role: "summary" },
              { blockId: article.blocks.find((block) => block.type === "list")?.id, role: "steps" },
              { blockId: article.blocks.find((block) => block.type === "paragraph")?.id, role: "steps" },
            ],
          },
        ],
      },
      article
    );

    expect(plan).toHaveLength(1);
    expect(plan?.[0]).toMatchObject({
      styleId: "listicle_cards",
      reason: "结构清晰",
      components: {
        heading: "chapter-badge",
        list: "card-items",
      },
    });
    expect(plan?.[0].palette).toBeUndefined();
    expect(plan?.[0].blocks).toEqual([
      { blockId: article.blocks.find((block) => block.type === "paragraph")?.id, role: "lead" },
      { blockId: article.blocks.find((block) => block.type === "list")?.id, role: "steps" },
    ]);
  });
});
