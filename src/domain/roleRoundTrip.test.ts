import { describe, expect, it } from "vitest";
import { defaultStylePreset } from "./stylePresets";
import { astToTiptapDoc, tiptapDocToAst } from "./tiptapAdapter";
import { renderWechatHtml } from "./wechatRenderer";
import { BLOCK_ROLES, type ArticleAst, type ArticleBlock, type BlockRole } from "./types";

function carrierBlockFor(role: BlockRole): ArticleBlock {
  if (role === "step" || role === "steps") {
    return { id: `block-${role}`, type: "list", ordered: true, items: ["第一步", "第二步"], role, style: {} };
  }
  if (role === "pullquote" || role === "quoteCenter" || role === "keyQuote") {
    return { id: `block-${role}`, type: "quote", text: `${role} quote`, role, style: {} };
  }
  return { id: `block-${role}`, type: "paragraph", runs: [{ text: `${role} paragraph` }], role, style: {} };
}

function articleWith(block: ArticleBlock): ArticleAst {
  return {
    meta: { title: "角色往返" },
    blocks: [
      { id: "title-1", type: "title", text: "角色往返", style: {} },
      block,
    ],
  };
}

describe("role round trip", () => {
  it.each(BLOCK_ROLES)("preserves %s across Tiptap JSON round trips", (role) => {
    const article = articleWith(carrierBlockFor(role));
    const restored = tiptapDocToAst(astToTiptapDoc(article), article);

    expect(restored.blocks[1]).toMatchObject({ role });
  });

  it("keeps rendered HTML stable after a role round trip", () => {
    const article: ArticleAst = {
      meta: { title: "稳定渲染" },
      blocks: [
        { id: "title-1", type: "title", text: "稳定渲染", style: {} },
        { id: "h-1", type: "heading", text: "章节", level: 1, style: {} },
        { id: "toc-1", type: "paragraph", runs: [{ text: "目录" }], role: "toc", style: {} },
        { id: "p-data", type: "paragraph", runs: [{ text: "增长 42%" }], role: "data", style: {} },
        { id: "q-1", type: "quote", text: "一句金句", role: "pullquote", style: {} },
        { id: "list-1", type: "list", ordered: true, items: ["做一件事"], role: "step", style: {} },
      ],
    };

    const before = renderWechatHtml(article, defaultStylePreset);
    const restored = tiptapDocToAst(astToTiptapDoc(article), article);
    const after = renderWechatHtml(restored, defaultStylePreset);

    expect(after).toBe(before);
  });

  it("drops injected unknown role attrs", () => {
    const restored = tiptapDocToAst(
      {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 1, blockId: "title-1", blockType: "title" }, content: [{ type: "text", text: "标题" }] },
          {
            type: "paragraph",
            attrs: { blockId: "p-1", blockRole: "hacker" },
            content: [{ type: "text", text: "正文" }],
          },
        ],
      },
      { meta: { title: "标题" }, blocks: [] }
    );

    expect(restored.blocks[1]).toMatchObject({ type: "paragraph" });
    expect(restored.blocks[1].role).toBeUndefined();
  });
});
