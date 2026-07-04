import type { ArticleAst, ArticleBlock, TableRow, TextRun } from "./types";

const DRAFT_KEY = "gzh-current-draft";

export interface DraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): unknown;
}

export interface MarkdownParseOptions {
  strictHeadings?: boolean;
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
  return markdownToAst(input);
}

export function markdownToAst(input: string, options: MarkdownParseOptions = {}): ArticleAst {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim());

  const titleIndex = lines.findIndex(Boolean);
  const firstContentLine = titleIndex >= 0 ? lines[titleIndex] : "";
  const title = stripHeadingMarker(firstContentLine) || "未命名草稿";
  const blocks: ArticleBlock[] = [{ id: createBlockId("title", 0), type: "title", text: title, style: {} }];
  let listItems: string[] = [];
  let orderedList = false;

  for (let index = Math.max(titleIndex + 1, 1); index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) {
      flushList(blocks, listItems, orderedList);
      listItems = [];
      orderedList = false;
      continue;
    }

    const unordered = line.match(/^[-*]\s+(.+)$/);
    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    if (unordered || ordered) {
      const isOrdered = Boolean(ordered);
      if (listItems.length > 0 && orderedList !== isOrdered) {
        flushList(blocks, listItems, orderedList);
        listItems = [];
      }
      orderedList = isOrdered;
      listItems.push((unordered?.[1] ?? ordered?.[1] ?? "").trim());
      continue;
    }

    if (isTableStart(lines, index)) {
      flushList(blocks, listItems, orderedList);
      listItems = [];
      orderedList = false;
      const parsed = readTable(lines, index);
      blocks.push({
        id: createBlockId("table", index),
        type: "table",
        rows: parsed.rows,
        style: {},
      });
      index = parsed.nextIndex - 1;
      continue;
    }

    flushList(blocks, listItems, orderedList);
    listItems = [];
    orderedList = false;

    const imageMatch = line.match(/^!\[(.*)]\((.+)\)$/);
    if (imageMatch) {
      blocks.push({
        id: createBlockId("image", index),
        type: "image",
        src: imageMatch[2],
        caption: imageMatch[1] || "配图",
        style: {},
      });
      continue;
    }

    if (line.startsWith("> ")) {
      blocks.push({ id: createBlockId("quote", index), type: "quote", text: line.slice(2).trim(), style: {} });
      continue;
    }

    if (line.startsWith("#") || (!options.strictHeadings && isHeadingLine(line, index))) {
      blocks.push({ id: createBlockId("heading", index), type: "heading", text: stripHeadingMarker(line), style: {} });
      continue;
    }

    blocks.push({
      id: createBlockId("paragraph", index),
      type: "paragraph",
      runs: parseRuns(line),
      style: {},
    });
  }

  flushList(blocks, listItems, orderedList);

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
        case "imageGrid":
          return block.images.map((image) => `![${image.alt ?? "配图"}](${image.src})`).join("\n");
        case "table":
          return tableToMarkdown(block.rows);
        case "divider":
          return "---";
      }
    })
    .join("\n\n");
}

export function astToMarkdown(article: ArticleAst): string {
  return article.blocks
    .map((block, blockIndex) => {
      switch (block.type) {
        case "title":
          return `# ${block.text}`;
        case "heading":
          return `## ${block.text}`;
        case "paragraph":
          return runsToMarkdown(block.runs);
        case "quote":
          return `> ${block.text}`;
        case "list":
          return block.items
            .map((item, index) => `${block.ordered ? `${index + 1}.` : "-"} ${item}`)
            .join("\n");
        case "image":
          return `![${block.caption ?? "配图"}](${block.src})`;
        case "imageGrid":
          return block.images.map((image) => `![${image.alt ?? "配图"}](${image.src})`).join("\n");
        case "table":
          return tableToMarkdown(block.rows);
        case "divider":
          return blockIndex === 0 ? "---" : "\n---";
      }
    })
    .join("\n\n")
    .trim();
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

function flushList(blocks: ArticleBlock[], items: string[], ordered = false): void {
  if (items.length === 0) {
    return;
  }

  blocks.push({
    id: createBlockId("list", blocks.length),
    type: "list",
    ordered,
    items,
    style: {},
  });
}

function isHeadingLine(line: string, index: number): boolean {
  return index === 0 || (line.length <= 16 && !/[。！？.!?*_`|]$/.test(line) && !/[*_`|]/.test(line));
}

function createBlockId(type: string, index: number): string {
  return `${type}-${index + 1}`;
}

function stripHeadingMarker(line: string): string {
  return line.replace(/^#{1,6}\s+/, "").trim();
}

function parseRuns(line: string): TextRun[] {
  const runs: TextRun[] = [];
  const pattern = /(\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(line))) {
    if (match.index > lastIndex) {
      runs.push({ text: line.slice(lastIndex, match.index) });
    }

    const boldText = match[2] ?? match[3];
    const italicText = match[4] ?? match[5];
    runs.push({
      text: boldText ?? italicText ?? match[0],
      marks: boldText ? ["bold"] : ["italic"],
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < line.length) {
    runs.push({ text: line.slice(lastIndex) });
  }

  return runs.length > 0 ? runs : [{ text: line }];
}

function runsToMarkdown(runs: TextRun[]): string {
  return runs.map(runToMarkdown).join("");
}

function runToMarkdown(run: TextRun): string {
  const escaped = escapeMarkdownInline(run.text);
  const marks = run.marks ?? [];

  if (marks.includes("bold")) {
    return `**${escaped}**`;
  }

  if (marks.includes("italic") || marks.includes("emphasis")) {
    return `*${escaped}*`;
  }

  return escaped;
}

function escapeMarkdownInline(text: string): string {
  return text.replace(/([\\`])/g, "\\$1");
}

function isTableStart(lines: string[], index: number): boolean {
  return isTableRow(lines[index]) && isTableSeparator(lines[index + 1] ?? "");
}

function readTable(lines: string[], startIndex: number): { rows: TableRow[]; nextIndex: number } {
  const rows: TableRow[] = [{ cells: splitTableRow(lines[startIndex]), header: true }];
  let index = startIndex + 2;

  while (index < lines.length && isTableRow(lines[index])) {
    rows.push({ cells: splitTableRow(lines[index]) });
    index += 1;
  }

  return { rows, nextIndex: index };
}

function isTableRow(line: string): boolean {
  return line.includes("|") && splitTableRow(line).length >= 2;
}

function isTableSeparator(line: string): boolean {
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line);
}

function splitTableRow(line: string): string[] {
  return line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function tableToMarkdown(rows: TableRow[]): string {
  if (rows.length === 0) {
    return "";
  }

  const header = rows[0].cells;
  const divider = header.map(() => "---");
  const body = rows.slice(1).map((row) => row.cells);
  return [header, divider, ...body].map((cells) => `| ${cells.join(" | ")} |`).join("\n");
}
