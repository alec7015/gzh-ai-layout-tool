import { describe, expect, it } from "vitest";
import { mergeStylePreset } from "./styleEngine";
import { defaultStylePreset } from "./stylePresets";
import { presetToEditorCss } from "./presetToEditorCss";

describe("presetToEditorCss", () => {
  it("does not add heading counters for the default preset", () => {
    const css = presetToEditorCss(defaultStylePreset, ".editor");

    expect(css).not.toContain("counter-reset: gzh-h1");
    expect(css).not.toContain("counter-increment: gzh-h1");
  });

  it("adds canvas counters when numbered heading variants are explicitly selected", () => {
    const preset = mergeStylePreset(defaultStylePreset, {
      "components.heading.variant": "number-badge",
    });
    const css = presetToEditorCss(preset, ".editor");

    expect(css).toContain(".editor {");
    expect(css).toContain("counter-reset: gzh-h1");
    expect(css).toContain('h1:not([data-block-type="title"])::before');
    expect(css).toContain("counter-increment: gzh-h1");
    expect(css).toContain("content: counter(gzh-h1, decimal-leading-zero)");
  });
});
