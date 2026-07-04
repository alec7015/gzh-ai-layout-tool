import { describe, expect, it } from "vitest";
import { createCustomStyle, loadCustomStyles, saveCustomStyles } from "./customStyles";
import { defaultStylePreset } from "./stylePresets";

describe("customStyles", () => {
  it("creates a named custom style from the current merged preset", () => {
    const custom = createCustomStyle(defaultStylePreset, "我的干货版");

    expect(custom.id).toMatch(/^custom-/);
    expect(custom.name).toBe("我的干货版");
    expect(custom.moods).toContain("自定义");
  });

  it("persists custom styles locally", () => {
    const storage = new Map<string, string>();
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    };
    const custom = createCustomStyle(defaultStylePreset, "我的版式");

    saveCustomStyles(adapter, [custom]);

    expect(loadCustomStyles(adapter)[0].name).toBe("我的版式");
  });
});
