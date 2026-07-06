import { describe, expect, it } from "vitest";
import { extractStyleStats, normalizeHexColor } from "./styleExtract";

describe("styleExtract", () => {
  it("extracts non-gray primary colors and left-bar heading style", () => {
    const stats = extractStyleStats(`
      <section id="js_content">
        <p style="font-size:15px;line-height:1.9;color:#333;margin-bottom:18px;">${"正文".repeat(40)}</p>
        <h2 style="font-size:20px;border-left:4px solid #1677ff;padding-left:10px;color:#1677ff;">重点标题</h2>
        <p style="color:#1677ff;">${"强调内容".repeat(20)}</p>
      </section>
    `);

    expect(stats.colors[0].hex).toBe("#1677ff");
    expect(stats.body.fontSize).toBe("15px");
    expect(stats.body.lineHeight).toBeCloseTo(1.9);
    expect(stats.body.paragraphGap).toBe("18px");
    expect(stats.heading.variantGuess).toBe("left-color-bar");
  });

  it("detects numbered badge and filters gray colors", () => {
    const stats = extractStyleStats(`
      <section>
        <p style="font-size:16px;color:#333;">${"正文".repeat(50)}</p>
        <h2 style="font-size:22px;color:#222;"><span style="display:inline-block;border-radius:999px;background:#d946ef;color:#fff;">01</span> 标题</h2>
      </section>
    `);

    expect(stats.heading.variantGuess).toBe("number-badge");
    expect(stats.colors.map((item) => item.hex)).toContain("#d946ef");
    expect(stats.colors.map((item) => item.hex)).not.toContain("#333333");
  });

  it("normalizes rgb and short hex colors", () => {
    expect(normalizeHexColor("rgb(22, 119, 255)")).toBe("#1677ff");
    expect(normalizeHexColor("#fff")).toBe("#ffffff");
  });
});
