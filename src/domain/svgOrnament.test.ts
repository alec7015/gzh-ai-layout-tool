import { describe, expect, it } from "vitest";
import { buildOrnamentRequest, sanitizeSvg } from "./svgOrnament";

describe("svgOrnament", () => {
  it("builds a constrained SVG-only ornament request", () => {
    const request = buildOrnamentRequest("早起习惯", {
      primary: "#1677ff",
      secondary: "#e8f0fb",
      accent: "#f97316",
    });
    const prompt = request.messages.map((message) => message.content).join("\n");

    expect(prompt).toContain('<svg viewBox="0 0 680 120">');
    expect(prompt).toContain("禁止 text / image / script / foreignObject / style / 外部引用");
    expect(prompt).toContain("#1677ff");
  });

  it("removes unsafe elements and rejects event handlers or external refs", () => {
    const safe = sanitizeSvg(`<svg viewBox="0 0 680 120"><script>alert(1)</script><path d="M0 0" onclick="x" /></svg>`);
    expect(safe.ok).toBe(false);

    const external = sanitizeSvg(`<svg viewBox="0 0 680 120"><use href="https://example.com/x.svg#id" /></svg>`);
    expect(external.ok).toBe(false);
  });

  it("keeps allowed SVG drawing primitives and strips unknown attributes", () => {
    const result = sanitizeSvg(`<svg viewBox="0 0 680 120" data-x="1"><g><path d="M0 0L10 10" fill="#1677ff" /></g><text>字</text></svg>`);

    expect(result.ok).toBe(true);
    expect(result.ok ? result.svg : "").toContain("<path");
    expect(result.ok ? result.svg : "").not.toContain("data-x");
    expect(result.ok ? result.svg : "").not.toContain("<text");
  });
});
