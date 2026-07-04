import { describe, expect, it } from "vitest";
import {
  buildWritingRequest,
  createDigest,
  generateDraftLocally,
  rewriteSelectionLocally,
  suggestTitles,
} from "./aiWriting";

describe("aiWriting", () => {
  it("builds an OpenAI-compatible chat completion request", () => {
    const request = buildWritingRequest({
      topic: "早起习惯",
      style: "清晰实用",
      words: 900,
    });

    expect(request.messages[0].role).toBe("system");
    expect(request.messages[1].content).toContain("早起习惯");
    expect(request.response_format).toEqual({ type: "json_object" });
  });

  it("generates a local content-only draft when no provider is configured", () => {
    const article = generateDraftLocally("早起习惯", "清晰实用");

    expect(article.meta.title).toContain("早起习惯");
    expect(article.blocks.map((block) => block.type)).toContain("list");
    expect(article.blocks.every((block) => block.style == null || Object.keys(block.style).length === 0)).toBe(
      true
    );
  });

  it("rewrites selected text with deterministic local modes", () => {
    expect(rewriteSelectionLocally("这件事很重要", "扩写")).toContain("更具体地说");
    expect(rewriteSelectionLocally("这件事很重要，真的特别特别重要", "精简")).toBe("这件事很重要");
    expect(rewriteSelectionLocally("这件事很重要", "润色")).toContain("值得认真对待");
  });

  it("creates title and digest candidates from content", () => {
    const titles = suggestTitles("早起习惯", "先把目标降下来，然后减少早晨阻力。");
    const digest = createDigest("先把目标降下来，然后减少早晨阻力。每天提前十五分钟就够了。");

    expect(titles).toHaveLength(4);
    expect(titles[0]).toContain("早起习惯");
    expect(digest.length).toBeLessThanOrEqual(64);
  });
});
