import { describe, expect, it } from "vitest";
import {
  buildWritingRequest,
  buildSmartFormatRequest,
  coerceMarkdownArticle,
  createDigest,
  generateDraftLocally,
  protectArticleImagesForAi,
  restoreProtectedImages,
} from "./aiWriting";
import type { ArticleAst } from "./types";

describe("aiWriting", () => {
  it("builds an OpenAI-compatible chat completion request", () => {
    const request = buildWritingRequest({
      topic: "早起习惯",
      style: "清晰实用",
      words: 900,
      genre: "干货教程",
      outline: "先讲阻力\n再讲动作",
    });

    expect(request.messages[0].role).toBe("system");
    expect(request.messages[1].content).toContain("早起习惯");
    expect(request.messages[1].content).toContain("干货教程");
    expect(request.messages[1].content).toContain("先讲阻力");
    expect(request.messages[0].content).toContain("第一行必须是文章标题");
    expect(request.response_format).toBeUndefined();
  });

  it("clamps requested writing words and scales max tokens for long drafts", () => {
    const tooSmall = buildWritingRequest({ topic: "测试", style: "清晰", words: 10 });
    const tooLarge = buildWritingRequest({ topic: "测试", style: "清晰", words: 9000 });

    expect(tooSmall.messages[1].content).toContain("目标字数：200");
    expect(tooSmall.max_tokens).toBe(1024);
    expect(tooLarge.messages[1].content).toContain("目标字数：8000");
    expect(tooLarge.max_tokens).toBe(24000);
  });

  it("generates a local content-only draft when no provider is configured", () => {
    const article = generateDraftLocally("早起习惯", "清晰实用");

    expect(article.meta.title).toContain("早起习惯");
    expect(article.blocks.map((block) => block.type)).toContain("list");
    expect(article.blocks.every((block) => block.style == null || Object.keys(block.style).length === 0)).toBe(
      true
    );
  });

  it("creates a digest from content", () => {
    const digest = createDigest("先把目标降下来，然后减少早晨阻力。每天提前十五分钟就够了。");

    expect(digest.length).toBeLessThanOrEqual(64);
  });

  it("coerces markdown article text into strict structured AST", () => {
    const article = coerceMarkdownArticle("```markdown\n# 标题\n\n短句不是标题\n\n## 小节\n\n- 要点\n```");

    expect(article?.meta.title).toBe("标题");
    expect(article?.blocks.map((block) => block.type)).toEqual(["title", "paragraph", "heading", "list"]);
  });

  it("protects image blocks from AI prompts and restores them by placeholders", () => {
    const article: ArticleAst = {
      meta: { title: "含图文章" },
      blocks: [
        { id: "title-1", type: "title", text: "含图文章", style: {} },
        { id: "p-1", type: "paragraph", runs: [{ text: "开头" }], style: {} },
        { id: "img-1", type: "image", src: "data:image/png;base64,very-long", caption: "配图", style: {} },
        {
          id: "grid-1",
          type: "imageGrid",
          layout: "two",
          gap: 6,
          radius: 8,
          images: [{ src: "data:image/png;base64,grid", alt: "组图" }],
          style: {},
        },
      ],
    };

    const protectedArticle = protectArticleImagesForAi(article);
    const aiArticle = coerceMarkdownArticle("# 含图文章\n\n开头优化\n\n[[IMG:img-1]]", { allowPlaceholders: true });
    const restored = restoreProtectedImages(aiArticle!, protectedArticle.protectedBlocks);

    expect(protectedArticle.markdown).toContain("[[IMG:img-1]]");
    expect(protectedArticle.markdown).toContain("[[GRID:grid-1]]");
    expect(protectedArticle.markdown).not.toContain("very-long");
    expect(restored.blocks.map((block) => block.type)).toEqual(["title", "paragraph", "image", "imageGrid"]);
  });

  it("builds smart format requests from markdown content", () => {
    const format = buildSmartFormatRequest("# 标题\n\n正文");

    expect(format.messages[1].content).toContain("结构化排版润色");
    expect(format.response_format).toBeUndefined();
  });
});
