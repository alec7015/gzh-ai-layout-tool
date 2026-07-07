import { describe, expect, it } from "vitest";
import { renderDarkPreviewHtml } from "./darkPreviewTransform";

describe("renderDarkPreviewHtml", () => {
  it("maps inline light backgrounds and dark text to dark preview colors", () => {
    const html = `<section style="background:#ffffff;color:#111827;border:1px solid #e5e7eb"><p style="background-color:#f9fafb;color:#374151">正文</p></section>`;

    const dark = renderDarkPreviewHtml(html);

    expect(dark).toContain("background");
    expect(dark).not.toContain("#ffffff");
    expect(dark).not.toContain("#111827");
    expect(dark).toMatch(/color:\s*(#[a-f0-9]{6}|rgb\()/i);
  });

  it("keeps the original HTML untouched for callers that copy the light output", () => {
    const html = `<p style="color:#111827">正文</p>`;

    renderDarkPreviewHtml(html);

    expect(html).toBe(`<p style="color:#111827">正文</p>`);
  });
});
