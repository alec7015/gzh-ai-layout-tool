import { describe, expect, it } from "vitest";
import { renderImageGridWechat } from "./imageGrid";

describe("renderImageGridWechat", () => {
  it("renders a WeChat-safe inline-block grid without class, flex, or grid styles", () => {
    const html = renderImageGridWechat({
      layout: "three",
      gap: 8,
      radius: 10,
      images: [
        { src: "data:image/png;base64,a", alt: "第一张" },
        { src: "data:image/png;base64,b", alt: "第二张" },
        { src: "data:image/png;base64,c", alt: "第三张" },
      ],
    });

    expect(html).toContain("display:inline-block");
    expect(html).toContain("width:33.3333%");
    expect(html).toContain("font-size:0");
    expect(html).toContain('alt="第一张"');
    expect(html).not.toContain("class=");
    expect(html).not.toContain("display:flex");
    expect(html).not.toContain("display:grid");
  });
});
