import { describe, expect, it } from "vitest";
import { clampRolesToRecipe, getRecipe } from "./recipes";

describe("recipes", () => {
  it("exposes tutorial defaults and quotas", () => {
    const recipe = getRecipe("tutorial");

    expect(recipe.allowedRoles).toEqual(expect.arrayContaining(["step", "tip", "toolLabel", "summary", "toc"]));
    expect(recipe.quotas.tip).toBe(3);
    expect(recipe.defaults.chapterNumbering).toBe(true);
  });

  it("clamps roles by allowed vocabulary and per-recipe quotas", () => {
    const roles = clampRolesToRecipe("opinion", [
      { index: 1, role: "pullquote" },
      { index: 2, role: "pullquote" },
      { index: 3, role: "pullquote" },
      { index: 4, role: "tip" },
      { index: 5, role: "summary" },
    ]);

    expect(roles).toEqual([
      { index: 1, role: "pullquote" },
      { index: 2, role: "pullquote" },
      { index: 5, role: "summary" },
    ]);
  });
});
