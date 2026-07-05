import type { ArticleAst, ArticleBlock, BlockOverride, BlockRole, GridImage, GridLayout, TableRow, TextMark, TextRun } from "./types";

export type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
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
  let titleTaken = false;
  const blocks = (doc.content ?? []).map((node, index) => {
    if (node.type === "heading") {
      const text = inlineText(node).trim();
      const attrs = node.attrs ?? {};
      const isTitleCandidate =
        (typeof attrs.blockType === "string" && attrs.blockType === "title") ||
        (typeof attrs.blockId === "string" && /(?:^|[^a-zA-Z])title(?:[^a-zA-Z]|$)/.test(attrs.blockId));
      const isTitle = isTitleCandidate && !titleTaken;
      if (isTitle) titleTaken = true;
      return {
        id: blockIdFromNode(node, isTitle ? "title" : "heading", index),
        type: isTitle ? "title" : "heading",
        text,
        ...(isTitle ? {} : { level: headingLevelFromNode(node) }),
        style: styleFromNode(node),
        role: roleFromNode(node),
      } as ArticleBlock;
    }
    return nodeToBlock(node, index);
  }).filter(Boolean) as ArticleBlock[];
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
    return headingNode(block.text, 1, block);
  }

  if (block.type === "heading") {
    return headingNode(block.text, block.level ?? 1, block);
  }

  if (block.type === "paragraph") {
    const content = runsToNodes(block.runs);
    return content.length > 0
      ? { type: "paragraph", attrs: blockAttrs(block), content }
      : { type: "paragraph", attrs: blockAttrs(block) };
  }

  if (block.type === "quote") {
    return {
      type: "blockquote",
      attrs: blockAttrs(block),
      content: [{ type: "paragraph", content: inlineContent(block.text) }],
    };
  }

  if (block.type === "list") {
    return {
      type: block.ordered ? "orderedList" : "bulletList",
      attrs: blockAttrs(block),
      content: block.items.map((item) => ({
        type: "listItem",
        content: [{ type: "paragraph", content: inlineContent(item) }],
      })),
    };
  }

  if (block.type === "image") {
    return {
      type: "image",
      attrs: {
        ...blockAttrs(block),
        src: block.src,
        alt: block.caption ?? "配图",
      },
    };
  }

  if (block.type === "imageGrid") {
    return {
      type: "imageGrid",
      attrs: {
        ...blockAttrs(block),
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
      attrs: blockAttrs(block),
      content: block.rows.map((row) => ({
        type: "tableRow",
        content: row.cells.map((cell) => ({
          type: row.header ? "tableHeader" : "tableCell",
          content: [{ type: "paragraph", content: inlineContent(cell) }],
        })),
      })),
    };
  }

  return { type: "horizontalRule", attrs: blockAttrs(block) };
}

function nodeToBlock(node: TiptapNode, index: number): ArticleBlock | null {
  if (node.type === "heading") {
    const text = inlineText(node).trim();
    const attrs = node.attrs ?? {};
    const isTitle =
      (typeof attrs.blockType === "string" && attrs.blockType === "title") ||
      (typeof attrs.blockId === "string" && /(?:^|[^a-zA-Z])title(?:[^a-zA-Z]|$)/.test(attrs.blockId));
    return {
      id: blockIdFromNode(node, isTitle ? "title" : "heading", index),
      type: isTitle ? "title" : "heading",
      text,
      ...(isTitle ? {} : { level: headingLevelFromNode(node) }),
      style: styleFromNode(node),
      role: roleFromNode(node),
    };
  }

  if (node.type === "image") {
    return {
      id: blockIdFromNode(node, "image", index),
      type: "image",
      src: typeof node.attrs?.src === "string" ? node.attrs.src : "",
      caption: typeof node.attrs?.alt === "string" ? node.attrs.alt : "配图",
      style: styleFromNode(node),
      role: roleFromNode(node),
    };
  }

  if (node.type === "paragraph") {
    const text = inlineText(node).trim();
    const image = text.match(/^!\[(.*)]\((.+)\)$/);
    if (image) {
      return {
        id: blockIdFromNode(node, "image", index),
        type: "image",
        src: image[2],
        caption: image[1] || "配图",
        style: styleFromNode(node),
        role: roleFromNode(node),
      };
    }

    return {
      id: blockIdFromNode(node, "paragraph", index),
      type: "paragraph",
      runs: inlineRuns(node),
      style: styleFromNode(node),
      role: roleFromNode(node),
    };
  }

  if (node.type === "blockquote") {
    return {
      id: blockIdFromNode(node, "quote", index),
      type: "quote",
      text: inlineText(node).trim(),
      style: styleFromNode(node),
      role: roleFromNode(node),
    };
  }

  if (node.type === "bulletList" || node.type === "orderedList") {
    return {
      id: blockIdFromNode(node, "list", index),
      type: "list",
      ordered: node.type === "orderedList",
      items: (node.content ?? []).map((item) => inlineText(item).trim()).filter(Boolean),
      style: styleFromNode(node),
      role: roleFromNode(node),
    };
  }

  if (node.type === "imageGrid") {
    const attrs = node.attrs ?? {};
    return {
      id: blockIdFromNode(node, "image-grid", index),
      type: "imageGrid",
      images: Array.isArray(attrs.images) ? (attrs.images as GridImage[]) : [],
      layout: isGridLayout(attrs.layout) ? attrs.layout : "two",
      gap: Number(attrs.gap ?? 6),
      radius: Number(attrs.radius ?? 8),
      style: styleFromNode(node),
      role: roleFromNode(node),
    };
  }

  if (node.type === "table") {
    return {
      id: blockIdFromNode(node, "table", index),
      type: "table",
      rows: tableRowsFromNode(node),
      style: styleFromNode(node),
      role: roleFromNode(node),
    };
  }

  if (node.type === "horizontalRule") {
    return { id: blockIdFromNode(node, "divider", index), type: "divider", style: styleFromNode(node), role: roleFromNode(node) };
  }

  return null;
}

function headingNode(text: string, level: number, block: ArticleBlock): TiptapNode {
  const attrs = { level, ...blockAttrs(block) };
  return text ? { type: "heading", attrs, content: [{ type: "text", text }] } : { type: "heading", attrs };
}

function inlineContent(text: string): TiptapNode[] | undefined {
  return text.length > 0 ? [{ type: "text", text }] : undefined;
}

function runsToNodes(runs: TextRun[]): TiptapNode[] {
  return runs
    .filter((run) => run.text.length > 0)
    .map((run) => ({
      type: "text",
      text: run.text,
      marks: runMarksToTiptap(run),
    }));
}

function runMarksToTiptap(run: TextRun): TiptapNode["marks"] {
  const marks: NonNullable<TiptapNode["marks"]> = (run.marks ?? []).map((mark) => {
    if (mark === "bold") {
      return { type: "bold" };
    }
    if (mark === "underline") {
      return { type: "underline" };
    }
    if (mark === "strike") {
      return { type: "strike" };
    }
    return { type: "italic" };
  });

  if (run.attrs) {
    marks.push({
      type: "textStyle",
      attrs: {
        color: run.attrs.color,
        backgroundColor: run.attrs.background,
        fontSize: run.attrs.fontSize,
        fontFamily: run.attrs.fontFamily,
      },
    });
  }

  return marks.length ? marks : undefined;
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
      .map((mark) => (mark === "strike" ? "strike" : mark))
      .filter(
        (mark): mark is TextMark =>
          mark === "bold" || mark === "italic" || mark === "underline" || mark === "strike"
      );
    const textStyle = node.marks?.find((mark) => mark.type === "textStyle")?.attrs ?? {};
    const attrs = {
      color: typeof textStyle.color === "string" ? textStyle.color : undefined,
      background: typeof textStyle.backgroundColor === "string" ? textStyle.backgroundColor : undefined,
      fontSize: typeof textStyle.fontSize === "string" ? textStyle.fontSize : undefined,
      fontFamily: typeof textStyle.fontFamily === "string" ? textStyle.fontFamily : undefined,
    };
    runs.push({
      text: node.text,
      marks: marks?.length ? marks : undefined,
      attrs: Object.values(attrs).some(Boolean) ? attrs : undefined,
    });
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

function blockAttrs(block: ArticleBlock): Record<string, unknown> {
  const style = block.style ?? {};
  const attrs: Record<string, unknown> = { blockId: block.id, blockType: block.type };
  if (block.role) {
    attrs.blockRole = block.role;
  }
  if (Object.keys(style).length > 0) {
    attrs.blockStyle = style;
  }
  if (typeof style["text-align"] === "string") {
    attrs.textAlign = style["text-align"];
  }
  return attrs;
}

function roleFromNode(node: TiptapNode): BlockRole | undefined {
  return isBlockRole(node.attrs?.blockRole) ? node.attrs.blockRole : undefined;
}

function isBlockRole(value: unknown): value is BlockRole {
  return (
    value === "lead" ||
    value === "keyQuote" ||
    value === "emphasis" ||
    value === "steps" ||
    value === "summary"
  );
}

function blockIdFromNode(node: TiptapNode, type: string, index: number): string {
  return typeof node.attrs?.blockId === "string" ? node.attrs.blockId : createBlockId(type, index);
}

function styleFromNode(node: TiptapNode): BlockOverride {
  const style = isBlockOverride(node.attrs?.blockStyle) ? { ...node.attrs.blockStyle } : {};
  if (typeof node.attrs?.textAlign === "string") {
    style["text-align"] = node.attrs.textAlign;
  }
  return style;
}

function headingLevelFromNode(node: TiptapNode): 1 | 2 | 3 {
  const level = Number(node.attrs?.level ?? 1);
  return level <= 1 ? 1 : level === 2 ? 2 : 3;
}

function isBlockOverride(value: unknown): value is BlockOverride {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every(
    (item) =>
      typeof item === "string" ||
      typeof item === "number" ||
      typeof item === "boolean" ||
      item === null
  );
}

function isGridLayout(value: unknown): value is GridLayout {
  return value === "two" || value === "three" || value === "quad";
}
