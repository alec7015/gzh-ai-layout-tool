import { describe, expect, it } from "vitest";
import { buildOrnamentRequest, extractSvgMarkup, sanitizeSvg } from "./svgOrnament";

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
    const result = sanitizeSvg(`<svg viewBox="0 0 680 120" data-x="1"><rect x="4" y="4" width="20" height="10" rx="4" ry="4" fill="#1677ff" fill-opacity="0.5" stroke-dasharray="4 2" stroke-linejoin="round" /></svg>`);

    expect(result.ok).toBe(true);
    expect(result.ok ? result.svg : "").toContain("<rect");
    expect(result.ok ? result.svg : "").toContain('rx="4"');
    expect(result.ok ? result.svg : "").toContain('fill-opacity="0.5"');
    expect(result.ok ? result.svg : "").toContain('stroke-dasharray="4 2"');
    expect(result.ok ? result.svg : "").not.toContain("data-x");
  });

  it("extracts svg markup from fenced or narrated model output", () => {
    const fenced = "```svg\n<svg viewBox=\"0 0 680 120\"><path d=\"M0 0\" /></svg>\n```";
    const narrated = "好的：<svg viewBox=\"0 0 680 120\"><circle cx=\"5\" cy=\"5\" r=\"2\" /></svg>结束";

    expect(extractSvgMarkup(fenced)).toBe('<svg viewBox="0 0 680 120"><path d="M0 0" /></svg>');
    expect(extractSvgMarkup(narrated)).toBe('<svg viewBox="0 0 680 120"><circle cx="5" cy="5" r="2" /></svg>');
  });
});
