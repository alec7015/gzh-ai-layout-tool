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

  if (preset.components.title.variant === "gradient-band") {
    return `<h1 style="${style({ ...common, "text-align": "center", ...toInlineOverride(block.style) })}">${escapeHtml(text)}</h1><section style="${style({
      margin: `-${preset.rhythm.paragraphGap} auto ${preset.rhythm.sectionGap}`,
      width: "64px",
      height: "4px",
      background: `linear-gradient(90deg,transparent,${preset.palette.primary},transparent)`,
      "border-radius": "999px",
    })}"></section>`;
  }

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
  const level = "level" in block ? block.level ?? 2 : 2;
  const variant = preset.components.heading.variant;
  const common = {
    margin: `${preset.rhythm.sectionGap} 0 ${preset.rhythm.paragraphGap}`,
    color: preset.palette.textMain,
    "font-size": preset.typography.h2Size,
    "font-weight": "700",
    "line-height": "1.5",
  };

  if (level === 3 || level === 4) {
    const tag = level === 3 ? "h3" : "h4";
    return `<${tag} style="${style({
      ...common,
      color: level === 3 ? preset.palette.primary : preset.palette.textMain,
      "font-size": decreasePx(preset.typography.h2Size, level === 3 ? 2 : 4),
      "font-weight": level === 3 ? "700" : "600",
      ...toInlineOverride(block.style),
    })}">${escapeHtml(text)}</${tag}>`;
  }

  if (variant === "chapter-badge") {
    return `<h2 style="${style({ ...common, ...toInlineOverride(block.style) })}"><span style="${style({
      display: "inline-block",
      background: preset.palette.primary,
      color: "#FFFFFF",
      "border-radius": "6px",
      padding: "2px 9px",
      "font-weight": "700",
      "font-size": "13px",
      "margin-right": "10px",
    })}">${String(index).padStart(2, "0")}</span>${escapeHtml(text)}</h2>`;
  }

  if (variant === "gradient-underline") {
    return `<h2 style="${style({ ...common, color: preset.palette.primary, ...toInlineOverride(block.style) })}"><span style="${style({
      background: `linear-gradient(transparent 62%, ${preset.palette.primary}33 62%)`,
      padding: "0 3px",
    })}">${escapeHtml(text)}</span></h2>`;
  }

  if (variant === "block-fill") {
    return `<h2 style="${style({
      ...common,
      color: "#FFFFFF",
      background: preset.palette.primary,
      padding: "6px 12px",
      "border-radius": "6px",
      ...toInlineOverride(block.style),
    })}">${escapeHtml(text)}</h2>`;
  }

  if (variant === "center-ornament") {
    return `<h2 style="${style({
      ...common,
      color: preset.palette.primary,
      "text-align": "center",
      "letter-spacing": "2px",
      ...toInlineOverride(block.style),
    })}">✦ ${escapeHtml(text)} ✦</h2>`;
  }

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

  if (block.role === "keyQuote") {
    return renderQuoteContent(content, preset, block, "golden-card", false);
  }

  if (block.role === "emphasis") {
    return `<section style="${style({
      margin: `0 0 ${preset.rhythm.paragraphGap}`,
      background: preset.palette.secondary,
      "border-left": `3px solid ${preset.palette.primary}`,
      padding: "12px 14px",
      "border-radius": "6px",
      color: preset.palette.textMain,
      "font-size": preset.typography.bodySize,
      "line-height": String(preset.typography.lineHeight),
      ...toInlineOverride(block.style),
    })}">${content}</section>`;
  }

  if (block.role === "summary") {
    return `<section style="${style({
      margin: `${preset.rhythm.sectionGap} 0`,
      padding: "14px 16px",
      background: preset.palette.secondary,
      color: preset.palette.textMain,
      "border-radius": "8px",
      "line-height": String(preset.typography.lineHeight),
      ...toInlineOverride(block.style),
    })}"><span style="${style({
      display: "inline-block",
      background: preset.palette.primary,
      color: "#FFFFFF",
      "border-radius": "4px",
      padding: "1px 7px",
      "font-size": "12px",
      "margin-bottom": "8px",
    })}">小结</span><section>${content}</section></section>`;
  }

  if (block.role === "lead") {
    return `<p style="${style({
      margin: `0 0 ${preset.rhythm.paragraphGap}`,
      color: preset.palette.textSub,
      "font-size": increasePx(preset.typography.bodySize, 1),
      "line-height": String(preset.typography.lineHeight),
      "text-align": preset.rhythm.align,
      padding: "0 0 0 12px",
      "border-left": `3px solid ${preset.palette.primary}`,
      ...toInlineOverride(block.style),
    })}">${content}</p>`;
  }

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
  const variant = block.role === "keyQuote" ? "golden-card" : preset.components.quote.variant;
  return renderQuoteContent(escapeHtml(text), preset, block, variant, true);
}

function renderQuoteContent(
  content: string,
  preset: StylePreset,
  block: ArticleBlock,
  variant: string,
  escaped: boolean
): string {
  if (variant === "center-large-text") {
    return `<section style="${style({
      margin: `${preset.rhythm.sectionGap} 0`,
      color: preset.palette.primary,
      "font-size": "19px",
      "font-weight": "700",
      "line-height": "1.75",
      "text-align": "center",
      ...toInlineOverride(block.style),
    })}">${content}</section>`;
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
    })}">${content}</section>`;
  }

  if (variant === "golden-card") {
    return `<section style="${style({
      margin: `${preset.rhythm.sectionGap} 0`,
      padding: "18px 20px",
      background: `linear-gradient(135deg,${preset.palette.secondary},#fff)`,
      color: preset.palette.textMain,
      "border-radius": "10px",
      border: `1px solid ${preset.palette.primary}22`,
      "text-align": "center",
      "font-size": preset.typography.bodySize,
      "line-height": String(preset.typography.lineHeight),
      ...toInlineOverride(block.style),
    })}"><section style="${style({
      color: preset.palette.primary,
      "font-size": "26px",
      "line-height": "1",
      "margin-bottom": "6px",
    })}">❝</section>${content}</section>`;
  }

  if (variant === "corner-tag") {
    return `<section style="${style({
      margin: `${preset.rhythm.sectionGap} 0`,
      padding: "14px 16px",
      background: preset.palette.secondary,
      color: preset.palette.textMain,
      "border-radius": "8px",
      border: `1px solid ${preset.palette.primary}22`,
      "font-size": preset.typography.bodySize,
      "line-height": String(preset.typography.lineHeight),
      ...toInlineOverride(block.style),
    })}"><span style="${style({
      display: "inline-block",
      background: preset.palette.primary,
      color: "#FFFFFF",
      "border-radius": "4px",
      padding: "1px 7px",
      "font-size": "12px",
      "margin-bottom": "8px",
    })}">金句</span><section>${content}</section></section>`;
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
  })}">${escaped ? content : content}</section>`;
}

function renderList(
  items: string[],
  ordered: boolean,
  preset: StylePreset,
  block: ArticleBlock
): string {
  const variant = block.role === "steps" ? "number-circle-card" : preset.components.list.variant;
  const tag = ordered ? "ol" : "ul";
  const children = items
    .map((item, index) => {
      const marker = ordered ? `${index + 1}` : "";
      if (variant === "arrow-accent") {
        return `<li style="${style({
          margin: `0 0 ${preset.rhythm.paragraphGap}`,
          padding: "0",
          color: preset.palette.textMain,
          "list-style": "none",
        })}"><span style="${style({ color: preset.palette.primary, "font-weight": "700", "margin-right": "8px" })}">▸</span>${escapeHtml(item)}</li>`;
      }
      return `<li style="${style({
        margin: `0 0 ${preset.rhythm.paragraphGap}`,
        padding: variant === "minimal-dot" ? "0" : "10px 14px",
        background: variant === "card-items" || variant === "number-circle-card" ? preset.palette.secondary : "transparent",
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
  const variant = preset.components.divider.variant;
  if (variant === "blank-space") {
    return `<br />`;
  }

  if (variant === "ornament") {
    return `<section style="${style({
      margin: `${preset.rhythm.sectionGap} auto`,
      color: preset.palette.textSub,
      "text-align": "center",
      ...toInlineOverride(block.style),
    })}">❖</section>`;
  }

  if (variant === "gradient-line") {
    return `<section style="${style({
      margin: `${preset.rhythm.sectionGap} auto`,
      height: "2px",
      background: `linear-gradient(90deg,transparent,${preset.palette.primary},transparent)`,
      ...toInlineOverride(block.style),
    })}"></section>`;
  }

  return `<section style="${style({
    margin: `${preset.rhythm.sectionGap} auto`,
    width: "72px",
    height: "1px",
    background: variant === "dotted"
      ? "transparent"
      : preset.palette.secondary,
    "border-top": variant === "dotted"
      ? `1px dotted ${preset.palette.textSub}`
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
    if (run.attrs.fontFamily) {
      attrsStyle["font-family"] = run.attrs.fontFamily;
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

    if (preset.components.emphasis.variant === "underline-accent") {
      return `<span style="${style({
        ...(run.attrs?.color ? {} : { color: preset.palette.textMain }),
        "border-bottom": `2px solid ${preset.palette.primary}`,
      })}">${inner}</span>`;
    }

    return `<span style="${style({
      ...(run.attrs?.color ? {} : { color: preset.palette.textMain }),
      ...(run.attrs?.background ? {} : { background: `linear-gradient(transparent 60%, ${preset.palette.primary}40 60%)` }),
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
    "text-indent": preset.rhythm.firstLineIndent ?? "",
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

function increasePx(value: string, amount: number) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? `${parsed + amount}px` : value;
}

function decreasePx(value: string, amount: number) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? `${Math.max(12, parsed - amount)}px` : value;
}
