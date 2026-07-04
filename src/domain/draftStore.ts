import type { ArticleAst, ArticleBlock } from "./types";

const DRAFT_KEY = "gzh-current-draft";

export interface DraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): unknown;
}

export function createSampleArticle(): ArticleAst {
  return {
    meta: {
      title: "三个早起技巧",
      digest: "用更轻的方式把早晨拿回来。",
    },
    blocks: [
      { id: "b-title", type: "title", text: "三个早起技巧", style: {} },
      { id: "b-heading-1", type: "heading", text: "先把目标降下来", style: {} },
      {
        id: "b-para-1",
        type: "paragraph",
        runs: [{ text: "不要一上来就要求自己五点起床。先提前十五分钟，让身体有一个能接受的入口。" }],
        style: {},
      },
      {
        id: "b-list-1",
        type: "list",
        ordered: false,
        items: ["把手机放远", "提前准备早餐", "醒来先喝水"],
        style: {},
      },
      {
        id: "b-quote-1",
        type: "quote",
        text: "稳定的早晨，来自可重复的小动作。",
        style: {},
      },
      { id: "b-heading-2", type: "heading", text: "给早晨留一点缓冲", style: {} },
      {
        id: "b-para-2",
        type: "paragraph",
        runs: [{ text: "真正能坚持的习惯，往往不是更狠，而是更顺手。把阻力调低，早起才会变成生活的一部分。" }],
        style: {},
      },
    ],
  };
}

export function plainTextToAst(input: string): ArticleAst {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const title = lines[0] || "未命名草稿";
  const blocks: ArticleBlock[] = [{ id: createBlockId("title", 0), type: "title", text: title, style: {} }];
  let listItems: string[] = [];

  lines.slice(1).forEach((line, index) => {
    if (line.startsWith("- ")) {
      listItems.push(line.slice(2).trim());
      return;
    }

    flushList(blocks, listItems);
    listItems = [];

    const imageMatch = line.match(/^!\[(.*)]\((.+)\)$/);
    if (imageMatch) {
      blocks.push({
        id: createBlockId("image", index),
        type: "image",
        src: imageMatch[2],
        caption: imageMatch[1] || "配图",
        style: {},
      });
      return;
    }

    if (line.startsWith("> ")) {
      blocks.push({ id: createBlockId("quote", index), type: "quote", text: line.slice(2).trim(), style: {} });
      return;
    }

    if (isHeadingLine(line, index)) {
      blocks.push({ id: createBlockId("heading", index), type: "heading", text: line, style: {} });
      return;
    }

    blocks.push({
      id: createBlockId("paragraph", index),
      type: "paragraph",
      runs: [{ text: line }],
      style: {},
    });
  });

  flushList(blocks, listItems);

  return {
    meta: { title },
    blocks,
  };
}

export function astToPlainText(article: ArticleAst): string {
  return article.blocks
    .map((block) => {
      switch (block.type) {
        case "title":
        case "heading":
          return block.text;
        case "paragraph":
          return block.runs.map((run) => run.text).join("");
        case "quote":
          return `> ${block.text}`;
        case "list":
          return block.items.map((item) => `- ${item}`).join("\n");
        case "image":
          return `![${block.caption ?? "配图"}](${block.src})`;
        case "divider":
          return "---";
      }
    })
    .join("\n\n");
}

export function loadDraft(storage: DraftStorage | undefined): ArticleAst {
  if (!storage) {
    return createSampleArticle();
  }

  const raw = storage.getItem(DRAFT_KEY);
  if (!raw) {
    return createSampleArticle();
  }

  try {
    return JSON.parse(raw) as ArticleAst;
  } catch {
    return createSampleArticle();
  }
}

export function saveDraft(storage: DraftStorage | undefined, article: ArticleAst): void {
  storage?.setItem(DRAFT_KEY, JSON.stringify(article));
}

function flushList(blocks: ArticleBlock[], items: string[]): void {
  if (items.length === 0) {
    return;
  }

  blocks.push({
    id: createBlockId("list", blocks.length),
    type: "list",
    ordered: false,
    items,
    style: {},
  });
}

function isHeadingLine(line: string, index: number): boolean {
  return index === 0 || (line.length <= 16 && !/[。！？.!?]$/.test(line));
}

function createBlockId(type: string, index: number): string {
  return `${type}-${index + 1}`;
}
