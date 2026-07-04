import type { ArticleAst, ArticleBlock, GridImage, GridLayout, TableRow, TextMark, TextRun } from "./types";

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

export function tiptapDocToAst(doc: TiptapDoc, previous?: ArticleAst): ArticleAst {
  const blocks = (doc.content ?? []).map((node, index) => nodeToBlock(node, index)).filter(Boolean) as ArticleBlock[];
  const firstTitle = blocks.find((block): block is Extract<ArticleBlock, { type: "title" }> => block.type === "title");
  const title = firstTitle?.text || previous?.meta.title || "未命名草稿";

  return {
    meta: {
      ...(previous?.meta ?? {}),
      title,
    },
    blocks: blocks.length > 0 ? blocks : [{ id: "title-1", type: "title", text: title, style: {} }],
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
    const content = runsToNodes(block.runs);
    return content.length > 0 ? { type: "paragraph", content } : { type: "paragraph" };
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

  if (block.type === "imageGrid") {
    return {
      type: "imageGrid",
      attrs: {
        images: block.images,
        layout: block.layout,
        gap: block.gap,
        radius: block.radius,
      },
    };
  }

  if (block.type === "table") {
    return {
      type: "table",
      content: block.rows.map((row) => ({
        type: "tableRow",
        content: row.cells.map((cell) => ({
          type: row.header ? "tableHeader" : "tableCell",
          content: [{ type: "paragraph", content: [{ type: "text", text: cell }] }],
        })),
      })),
    };
  }

  return { type: "horizontalRule" };
}

function nodeToBlock(node: TiptapNode, index: number): ArticleBlock | null {
  if (node.type === "heading") {
    const text = inlineText(node).trim();
    return {
      id: createBlockId(node.attrs?.level === 1 ? "title" : "heading", index),
      type: node.attrs?.level === 1 ? "title" : "heading",
      text,
      style: {},
    };
  }

  if (node.type === "paragraph") {
    const text = inlineText(node).trim();
    const image = text.match(/^!\[(.*)]\((.+)\)$/);
    if (image) {
      return {
        id: createBlockId("image", index),
        type: "image",
        src: image[2],
        caption: image[1] || "配图",
        style: {},
      };
    }

    return {
      id: createBlockId("paragraph", index),
      type: "paragraph",
      runs: inlineRuns(node),
      style: {},
    };
  }

  if (node.type === "blockquote") {
    return {
      id: createBlockId("quote", index),
      type: "quote",
      text: inlineText(node).trim(),
      style: {},
    };
  }

  if (node.type === "bulletList" || node.type === "orderedList") {
    return {
      id: createBlockId("list", index),
      type: "list",
      ordered: node.type === "orderedList",
      items: (node.content ?? []).map((item) => inlineText(item).trim()).filter(Boolean),
      style: {},
    };
  }

  if (node.type === "imageGrid") {
    const attrs = node.attrs ?? {};
    return {
      id: createBlockId("image-grid", index),
      type: "imageGrid",
      images: Array.isArray(attrs.images) ? (attrs.images as GridImage[]) : [],
      layout: isGridLayout(attrs.layout) ? attrs.layout : "two",
      gap: Number(attrs.gap ?? 6),
      radius: Number(attrs.radius ?? 8),
      style: {},
    };
  }

  if (node.type === "table") {
    return {
      id: createBlockId("table", index),
      type: "table",
      rows: tableRowsFromNode(node),
      style: {},
    };
  }

  if (node.type === "horizontalRule") {
    return { id: createBlockId("divider", index), type: "divider", style: {} };
  }

  return null;
}

function headingNode(text: string, level: number): TiptapNode {
  return text ? { type: "heading", attrs: { level }, content: [{ type: "text", text }] } : { type: "heading", attrs: { level } };
}

function runsToNodes(runs: TextRun[]): TiptapNode[] {
  return runs
    .filter((run) => run.text.length > 0)
    .map((run) => ({
      type: "text",
      text: run.text,
      marks: run.marks?.map((mark) => ({ type: mark === "bold" ? "bold" : "italic" })),
    }));
}

function tableRowsFromNode(node: TiptapNode): TableRow[] {
  return (node.content ?? [])
    .filter((row) => row.type === "tableRow")
    .map((row) => {
      const cells = row.content ?? [];
      return {
        header: cells.length > 0 && cells.every((cell) => cell.type === "tableHeader"),
        cells: cells.map((cell) => inlineText(cell).trim()),
      };
    });
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

  if (node.type === "imageGrid") {
    const images = Array.isArray(node.attrs?.images) ? node.attrs.images as Array<{ src: string; alt?: string }> : [];
    return images.map((image) => `![${image.alt ?? "配图"}](${image.src})`).join("\n");
  }

  if (node.type === "table") {
    return tableToMarkdown(tableRowsFromNode(node));
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

function inlineRuns(node: TiptapNode): TextRun[] {
  const runs: TextRun[] = [];
  collectRuns(node, runs);
  return runs;
}

function collectRuns(node: TiptapNode, runs: TextRun[]): void {
  if (node.text !== undefined) {
    const marks = node.marks
      ?.map((mark) => mark.type)
      .filter((mark): mark is TextMark => mark === "bold" || mark === "italic");
    runs.push({ text: node.text, marks: marks?.length ? marks : undefined });
    return;
  }

  (node.content ?? []).forEach((child) => collectRuns(child, runs));
}

function tableToMarkdown(rows: TableRow[]): string {
  if (rows.length === 0) {
    return "";
  }

  const header = rows[0].cells;
  const divider = header.map(() => "---");
  return [header, divider, ...rows.slice(1).map((row) => row.cells)]
    .map((cells) => `| ${cells.join(" | ")} |`)
    .join("\n");
}

function createBlockId(type: string, index: number): string {
  return `${type}-${index + 1}`;
}

function isGridLayout(value: unknown): value is GridLayout {
  return value === "two" || value === "three" || value === "quad";
}
