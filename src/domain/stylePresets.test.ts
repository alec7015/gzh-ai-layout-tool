import { describe, expect, it } from "vitest";
import { VARIANT_LABELS, VARIANT_VOCABULARY } from "./stylePresets";

describe("stylePresets variant labels", () => {
  it("provides user-facing labels for component variant dropdowns", () => {
    expect(VARIANT_LABELS.heading["plain-bold"]).toBe("无装饰加粗");
    expect(VARIANT_LABELS.heading["number-badge"]).toBe("序号章");
    expect(Object.keys(VARIANT_LABELS.heading)).toEqual(expect.arrayContaining([...VARIANT_VOCABULARY.heading]));
  });
});
