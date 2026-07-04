import { describe, expect, it } from "vitest";
import { defaultStylePreset } from "./stylePresets";
import { mergeStylePreset } from "./styleEngine";

describe("styleEngine", () => {
  it("applies component variant overrides through the full components path", () => {
    const merged = mergeStylePreset(defaultStylePreset, {
      "components.quote.variant": "golden-card",
      "components.list.variant": "card-items",
    });

    expect(merged.components.quote.variant).toBe("golden-card");
    expect(merged.components.list.variant).toBe("card-items");
  });
});
