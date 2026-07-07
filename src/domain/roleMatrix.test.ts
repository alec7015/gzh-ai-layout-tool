import { describe, expect, it } from "vitest";
import { BLOCK_ROLES } from "./types";
import { ROLE_CARRIERS, isRoleCompatible } from "./roleMatrix";

describe("roleMatrix", () => {
  it("defines carriers for every block role from the single source of truth", () => {
    expect(Object.keys(ROLE_CARRIERS).sort()).toEqual([...BLOCK_ROLES].sort());
  });

  it("keeps expected compatibility decisions explicit", () => {
    expect(isRoleCompatible("summary", "paragraph")).toBe(true);
    expect(isRoleCompatible("pullquote", "quote")).toBe(true);
    expect(isRoleCompatible("quoteCenter", "quote")).toBe(true);
    expect(isRoleCompatible("step", "list")).toBe(true);

    expect(isRoleCompatible("step", "paragraph")).toBe(false);
    expect(isRoleCompatible("summary", "heading")).toBe(false);
    expect(isRoleCompatible("toc", "table")).toBe(false);
  });
});
