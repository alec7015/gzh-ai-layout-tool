import type { ArticleAst, ArticleBlock, StylePreset, TableRow, TextRun } from "./types";
import { toInlineOverride } from "./blockOverrides";
import { renderImageGridWechat } from "./imageGrid";

export function renderWechatHtml(article: ArticleAst, preset: StylePreset): string {
  let headingIndex = 0;
  const body = article.blocks
    .map((block, index) => {
      if (block.type === "heading") {
        headingIndex += 1;
        return renderBlock(block, preset, index, headingIndex);
      }

      return renderBlock(block, preset, index, headingIndex);
    })
    .join("");
  const header = renderHeaderDecoration(preset);
  const footer = renderFooterDecoration(preset);

  return `<section style="${style({
    margin: "0 auto",
    padding: preset.rhythm.contentPadding,
    background: preset.palette.bg,
    color: preset.palette.textMain,
    "font-size": preset.typography.bodySize,
    "line-height": String(preset.typography.lineHeight),
    "letter-spacing": preset.typography.letterSpacing,
    "text-align": preset.rhythm.align,
    "font-family": "-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif",
  })}">${header}${body}${footer}</section>`;
}

function renderBlock(
  block: ArticleBlock,
  preset: StylePreset,
  index: number,
  headingIndex: number
): string {
  switch (block.type) {
    case "title":
      return renderTitle(block.text, preset, block);
    case "heading":
      return renderHeading(block.text, preset, headingIndex, block);
    case "paragraph":
      return renderParagraph(block.runs, preset, index, block);
    case "quote":
      return renderQuote(block.text, preset, block);
    case "list":
      return renderList(block.items, block.ordered, preset, block);
    case "image":
      return renderImage(block.src, block.caption, preset, block);
    case "imageGrid":
      return renderImageGridWechat(block);
    case "table":
      return renderTable(block.rows, preset, block);
    case "divider":
      return renderDivider(preset, block);
  }
}

function renderTitle(text: string, preset: StylePreset, block: ArticleBlock): string {
  const common = {
    margin: `0 0 ${preset.rhythm.sectionGap}`,
    color: preset.palette.textMain,
    "font-size": preset.typography.titleSize,
    "font-weight": "700",
    "line-height": "1.42",
  };

  if (preset.components.title.variant.includes("center")) {
    return `<h1 style="${style({ ...common, "text-align": "center", ...toInlineOverride(block.style) })}">${escapeHtml(text)}</h1>`;
  }

  if (preset.components.title.variant === "block") {
    return `<h1 style="${style({
      ...common,
      padding: "12px 14px",
      "border-left": `5px solid ${preset.palette.primary}`,
      background: preset.palette.secondary,
      ...toInlineOverride(block.style),
    })}">${escapeHtml(text)}</h1>`;
  }

  return `<h1 style="${style({ ...common, ...toInlineOverride(block.style) })}">${escapeHtml(text)}</h1>`;
}

function renderHeading(text: string, preset: StylePreset, index: number, block: ArticleBlock): string {
  const variant = preset.components.heading.variant;
  const common = {
    margin: `${preset.rhythm.sectionGap} 0 ${preset.rhythm.paragraphGap}`,
    color: preset.palette.textMain,
    "font-size": preset.typography.h2Size,
    "font-weight": "700",
    "line-height": "1.5",
  };

  if (variant === "number-badge") {
    return `<h2 style="${style({ ...common, ...toInlineOverride(block.style) })}"><span style="${style({
      display: "inline-block",
      width: "24px",
      height: "24px",
      "line-height": "24px",
      "text-align": "center",
      "border-radius": "999px",
      background: preset.palette.primary,
      color: "#FFFFFF",
      "font-size": "13px",
      "margin-right": "8px",
    })}">${index}</span>${escapeHtml(text)}</h2>`;
  }

  if (variant === "left-color-bar" || variant === "vertical-line") {
    return `<h2 style="${style({
      ...common,
      padding: "0 0 0 10px",
      "border-left": `4px solid ${preset.palette.primary}`,
      ...toInlineOverride(block.style),
    })}">${escapeHtml(text)}</h2>`;
  }

  if (variant === "plain-bold") {
    return `<h2 style="${style({ ...common, ...toInlineOverride(block.style) })}">${escapeHtml(text)}</h2>`;
  }

  return `<h2 style="${style({
    ...common,
    color: preset.palette.primary,
    ...toInlineOverride(block.style),
  })}">${escapeHtml(text)}</h2>`;
}

function renderParagraph(
  runs: TextRun[],
  preset: StylePreset,
  index: number,
  block: ArticleBlock
): string {
  const drop = preset.typography.firstLetterDrop && index <= 2;
  const content = runs.map((run) => renderRun(run, preset)).join("");

  if (drop && content.length > 0) {
    const first = content.slice(0, 1);
    const rest = content.slice(1);
    return `<p style="${paragraphStyle(preset, block)}"><span style="${style({
      float: "left",
      "font-size": "38px",
      "line-height": "34px",
      "padding-right": "6px",
      color: preset.palette.primary,
      "font-weight": "700",
    })}">${first}</span>${rest}</p>`;
  }

  return `<p style="${paragraphStyle(preset, block)}">${content}</p>`;
}

function renderQuote(text: string, preset: StylePreset, block: ArticleBlock): string {
  const variant = preset.components.quote.variant;

  if (variant === "center-large-text") {
    return `<section style="${style({
      margin: `${preset.rhythm.sectionGap} 0`,
      color: preset.palette.primary,
      "font-size": "19px",
      "font-weight": "700",
      "line-height": "1.75",
      "text-align": "center",
      ...toInlineOverride(block.style),
    })}">${escapeHtml(text)}</section>`;
  }

  if (variant === "left-line") {
    return `<section style="${style({
      margin: `${preset.rhythm.sectionGap} 0`,
      padding: "2px 0 2px 14px",
      "border-left": `3px solid ${preset.palette.primary}`,
      color: preset.palette.textSub,
      "font-size": preset.typography.bodySize,
      "line-height": String(preset.typography.lineHeight),
      ...toInlineOverride(block.style),
    })}">${escapeHtml(text)}</section>`;
  }

  return `<section style="${style({
    margin: `${preset.rhythm.sectionGap} 0`,
    padding: "14px 16px",
    background: preset.palette.secondary,
    color: preset.palette.textMain,
    "border-radius": "8px",
    "border-left": `4px solid ${preset.palette.primary}`,
    "font-size": preset.typography.bodySize,
    "line-height": String(preset.typography.lineHeight),
    ...toInlineOverride(block.style),
  })}">${escapeHtml(text)}</section>`;
}

function renderList(
  items: string[],
  ordered: boolean,
  preset: StylePreset,
  block: ArticleBlock
): string {
  const tag = ordered ? "ol" : "ul";
  const children = items
    .map((item, index) => {
      const marker = ordered ? `${index + 1}` : "";
      return `<li style="${style({
        margin: `0 0 ${preset.rhythm.paragraphGap}`,
        padding: "12px 14px",
        background: preset.components.list.variant.includes("card") ? preset.palette.secondary : "transparent",
        "border-radius": "8px",
        color: preset.palette.textMain,
        "list-style": "none",
      })}">${
        ordered
          ? `<span style="${style({
              display: "inline-block",
              width: "22px",
              height: "22px",
              "line-height": "22px",
              "text-align": "center",
              "border-radius": "999px",
              background: preset.palette.primary,
              color: "#FFFFFF",
              "font-size": "12px",
              "margin-right": "8px",
            })}">${marker}</span>`
          : `<span style="${style({ color: preset.palette.primary, "margin-right": "8px" })}">•</span>`
      }${escapeHtml(item)}</li>`;
    })
    .join("");

  return `<${tag} style="${style({
    margin: `${preset.rhythm.paragraphGap} 0 ${preset.rhythm.sectionGap}`,
    padding: "0",
    ...toInlineOverride(block.style),
  })}">${children}</${tag}>`;
}

function renderImage(
  src: string,
  caption: string | undefined,
  preset: StylePreset,
  block: ArticleBlock
): string {
  return `<section style="${style({ margin: `${preset.rhythm.sectionGap} 0`, ...toInlineOverride(block.style) })}"><img src="${escapeAttr(
    src
  )}" style="${style({
    display: "block",
    width: "100%",
    "border-radius": preset.components.image.variant.includes("plain") ? "0" : "8px",
  })}" />${
    caption
      ? `<p style="${style({
          margin: "8px 0 0",
          color: preset.palette.textSub,
          "font-size": "12px",
          "text-align": "center",
        })}">${escapeHtml(caption)}</p>`
      : ""
  }</section>`;
}

function renderTable(rows: TableRow[], preset: StylePreset, block: ArticleBlock): string {
  if (rows.length === 0) {
    return "";
  }

  const body = rows
    .map((row) => {
      const tag = row.header ? "th" : "td";
      const cells = row.cells
        .map(
          (cell) =>
            `<${tag} style="${style({
              border: "1px solid #e2e5ea",
              padding: "8px 10px",
              background: row.header ? `${preset.palette.primary}14` : "#FFFFFF",
              color: preset.palette.textMain,
              "font-weight": row.header ? "600" : "400",
              "text-align": "left",
            })}">${escapeHtml(cell)}</${tag}>`
        )
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  return `<table style="${style({
    "border-collapse": "collapse",
    width: "100%",
    margin: `${preset.rhythm.sectionGap} 0`,
    "font-size": preset.typography.bodySize,
    ...toInlineOverride(block.style),
  })}">${body}</table>`;
}

function renderDivider(preset: StylePreset, block: ArticleBlock): string {
  if (preset.components.divider.variant === "blank-space") {
    return `<br />`;
  }

  return `<section style="${style({
    margin: `${preset.rhythm.sectionGap} auto`,
    width: "72px",
    height: "1px",
    background: preset.components.divider.variant.includes("dot")
      ? "transparent"
      : preset.palette.secondary,
    "border-top": preset.components.divider.variant.includes("dot")
      ? `2px dotted ${preset.palette.primary}`
      : "0",
    ...toInlineOverride(block.style),
  })}"></section>`;
}

function renderHeaderDecoration(preset: StylePreset): string {
  if (!preset.decorations.header) {
    return "";
  }

  if (preset.decorations.header === "red-seal") {
    return `<section style="${style({
      margin: "0 0 18px",
      color: preset.palette.primary,
      "font-size": "13px",
      "text-align": "center",
      "letter-spacing": "0px",
    })}">◆</section>`;
  }

  return `<section style="${style({
    margin: "0 0 18px",
    height: "1px",
    background: preset.palette.secondary,
  })}"></section>`;
}

function renderFooterDecoration(preset: StylePreset): string {
  const footerText = preset.decorations.footerText?.trim();
  if (!preset.decorations.footer || !footerText) {
    return "";
  }

  return `<section style="${style({
    margin: `${preset.rhythm.sectionGap} 0 0`,
    padding: "16px",
    background: preset.palette.secondary,
    color: preset.palette.textMain,
    "font-size": "14px",
    "line-height": "1.7",
    "text-align": "center",
    "border-radius": "8px",
  })}">${escapeHtml(footerText)}</section>`;
}

function renderRun(run: TextRun, preset: StylePreset): string {
  let content = escapeHtml(run.text);

  if (run.attrs) {
    const attrsStyle: Record<string, string> = {};
    if (run.attrs.color) {
      attrsStyle.color = run.attrs.color;
    }
    if (run.attrs.background) {
      attrsStyle["background-color"] = run.attrs.background;
    }
    if (run.attrs.fontSize) {
      attrsStyle["font-size"] = run.attrs.fontSize;
    }
    if (Object.keys(attrsStyle).length > 0) {
      content = `<span style="${style(attrsStyle)}">${content}</span>`;
    }
  }

  if (!run.marks?.length) {
    return content;
  }

  return run.marks.reduce((inner, mark) => {
    if (mark === "bold") {
      const markStyle: Record<string, string> = { "font-weight": "700" };
      if (!run.attrs?.color) {
        markStyle.color = preset.palette.textMain;
      }
      return `<strong style="${style(markStyle)}">${inner}</strong>`;
    }

    if (mark === "italic") {
      const markStyle: Record<string, string> = {};
      if (!run.attrs?.color) {
        markStyle.color = preset.palette.textSub;
      }
      return `<em style="${style(markStyle)}">${inner}</em>`;
    }

    if (mark === "underline") {
      return `<span style="${style({ "text-decoration": "underline" })}">${inner}</span>`;
    }

    if (mark === "strike") {
      return `<span style="${style({ "text-decoration": "line-through" })}">${inner}</span>`;
    }

    return `<span style="${style({
      ...(run.attrs?.color ? {} : { color: preset.palette.textMain }),
      ...(run.attrs?.background ? {} : { background: preset.palette.secondary }),
      padding: "0 3px",
    })}">${inner}</span>`;
  }, content);
}

function paragraphStyle(preset: StylePreset, block: ArticleBlock): string {
  return style({
    margin: `0 0 ${preset.rhythm.paragraphGap}`,
    color: preset.palette.textMain,
    "font-size": preset.typography.bodySize,
    "line-height": String(preset.typography.lineHeight),
    "text-align": preset.rhythm.align,
    ...toInlineOverride(block.style),
  });
}

function style(values: Record<string, string>): string {
  return Object.entries(values)
    .filter(([, value]) => value !== "")
    .map(([key, value]) => `${key}:${value}`)
    .join(";");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, "&#39;");
}
