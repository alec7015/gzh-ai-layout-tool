import { describe, expect, it } from "vitest";
import { renderWechatHtml } from "./wechatRenderer";
import { stylePresets } from "./stylePresets";
import { scanWechatHtmlCompliance } from "./wechatCompliance";
import type { ArticleAst, BlockRole } from "./types";

const v13Roles: BlockRole[] = [
  "summary",
  "tip",
  "pullquote",
  "quoteCenter",
  "data",
  "step",
  "toolLabel",
  "sidenote",
  "editorNote",
  "toc",
  "signature",
];

function roleBlock(role: BlockRole, index: number): ArticleAst["blocks"][number] {
  if (role === "toc") {
    return { id: `toc-${index}`, type: "paragraph", runs: [{ text: "目录占位" }], role, style: {} };
  }
  if (role === "signature") {
    return { id: `signature-${index}`, type: "paragraph", runs: [{ text: "作者：Alec｜个人公众号编辑器" }], role, style: {} };
  }
  if (role === "step") {
    return { id: `step-${index}`, type: "list", ordered: true, items: ["打开编辑器", "复制到公众号"], role, style: {} };
  }
  if (role === "pullquote") {
    return { id: `pullquote-${index}`, type: "quote", text: "稳定的工具，应该让人安心。", role, style: {} };
  }
  return {
    id: `p-${role}-${index}`,
    type: "paragraph",
    runs: [{ text: role === "data" ? "增长 42% 来自稳定输出" : `${role} 组件内容` }],
    role,
    style: {},
  };
}

describe("wechatCompliance", () => {
  it("rejects platform and WebKit unsafe output", () => {
    const html = [
      '<div class="x" id="bad" style="display:grid;color:oklch(1 0 0);position:absolute">',
      '<style>.x{}</style><script>alert(1)</script>',
      "<span style='background:url(data:image/svg+xml,<svg fill=#fff></svg>);backdrop-filter:blur(4px)'>x</span>",
      "</div>",
    ].join("");

    const result = scanWechatHtmlCompliance(html);

    expect(result.ok).toBe(false);
    expect(result.violations.map((item) => item.rule)).toEqual(
      expect.arrayContaining([
        "allowed-tags",
        "no-class-id",
        "no-style-script",
        "no-grid-flex-float-position",
        "no-modern-color",
        "svg-data-uri-escaped",
        "webkit-prefix",
      ])
    );
  });

  it("accepts all preset and V13 role render output", () => {
    const article: ArticleAst = {
      meta: { title: "V13 合规扫描" },
      blocks: [
        { id: "title-1", type: "title", text: "V13 合规扫描", style: {} },
        { id: "h-1", type: "heading", text: "第一部分", level: 1, style: {} },
        { id: "h-2", type: "heading", text: "第二部分", level: 1, style: {} },
        ...v13Roles.map(roleBlock),
      ],
    };

    const violations = stylePresets.flatMap((preset) => {
      const html = renderWechatHtml(article, preset, { includePlaceholders: true });
      return scanWechatHtmlCompliance(html).violations;
    });

    expect(violations).toEqual([]);
  });
});
