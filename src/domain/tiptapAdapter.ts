import type { ArticleAst, ArticleBlock, TextRun } from "./types";

export type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
  marks?: Array<{ type: string }>;
};

export interface TiptapDoc {
  type: "doc";
  content: TiptapNode[];
}

export function astToTiptapDoc(article: ArticleAst): TiptapDoc {
  return {
    type: "doc",
    content: article.blocks.map(blockToNode),
  };
}

export function tiptapDocToPlainText(doc: TiptapDoc): string {
  return doc.content.map(nodeToPlainText).filter(Boolean).join("\n\n");
}

function blockToNode(block: ArticleBlock): TiptapNode {
  if (block.type === "title") {
    return headingNode(block.text, 1);
  }

  if (block.type === "heading") {
    return headingNode(block.text, 2);
  }

  if (block.type === "paragraph") {
    return { type: "paragraph", content: runsToNodes(block.runs) };
  }

  if (block.type === "quote") {
    return {
      type: "blockquote",
      content: [{ type: "paragraph", content: [{ type: "text", text: block.text }] }],
    };
  }

  if (block.type === "list") {
    return {
      type: block.ordered ? "orderedList" : "bulletList",
      content: block.items.map((item) => ({
        type: "listItem",
        content: [{ type: "paragraph", content: [{ type: "text", text: item }] }],
      })),
    };
  }

  if (block.type === "image") {
    return {
      type: "paragraph",
      content: [{ type: "text", text: `![${block.caption ?? "配图"}](${block.src})` }],
    };
  }

  return { type: "horizontalRule" };
}

function headingNode(text: string, level: number): TiptapNode {
  return { type: "heading", attrs: { level }, content: [{ type: "text", text }] };
}

function runsToNodes(runs: TextRun[]): TiptapNode[] {
  return runs.map((run) => ({
    type: "text",
    text: run.text,
    marks: run.marks?.map((mark) => ({ type: mark === "bold" ? "bold" : "italic" })),
  }));
}

function nodeToPlainText(node: TiptapNode): string {
  if (node.type === "heading" || node.type === "paragraph") {
    return inlineText(node);
  }

  if (node.type === "blockquote") {
    return `> ${inlineText(node)}`;
  }

  if (node.type === "bulletList" || node.type === "orderedList") {
    return (node.content ?? [])
      .map((item, index) => `${node.type === "orderedList" ? `${index + 1}. ` : "- "}${inlineText(item)}`)
      .join("\n");
  }

  if (node.type === "horizontalRule") {
    return "---";
  }

  return inlineText(node);
}

function inlineText(node: TiptapNode): string {
  if (node.text) {
    return node.text;
  }

  return (node.content ?? []).map(inlineText).join("");
}
