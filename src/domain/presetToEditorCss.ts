import type { StylePreset } from "./types";

export function presetToEditorCss(preset: StylePreset, scope = ".layout-editor .tiptap"): string {
  const headingVariant = preset.components.heading.variant;
  const numberedHeadings = headingVariant === "number-badge" || headingVariant === "chapter-badge";
  const headingBlock =
    headingVariant === "block-fill"
      ? `background: ${preset.palette.primary}; color: #fff; padding: 6px 12px; border-radius: 6px; border-left: 0;`
      : headingVariant === "gradient-underline"
        ? `background: linear-gradient(transparent 62%, ${preset.palette.primary}33 62%); border-left: 0; padding-left: 0;`
        : "";
  const quoteBlock =
    preset.components.quote.variant === "golden-card"
      ? `background: linear-gradient(135deg, ${preset.palette.secondary}, #fff); border: 1px solid ${preset.palette.primary}22; border-radius: 10px; text-align: center;`
      : "";
  const dividerBlock =
    preset.components.divider.variant === "dotted"
      ? `border-top: 1px dotted ${preset.palette.textSub};`
      : preset.components.divider.variant === "gradient-line"
        ? `height: 2px; border-top: 0; background: linear-gradient(90deg, transparent, ${preset.palette.primary}, transparent);`
        : "";

  return `
${scope} {
  color: ${preset.palette.textMain};
  font-size: ${preset.typography.bodySize};
  line-height: ${preset.typography.lineHeight};
  letter-spacing: ${preset.typography.letterSpacing};
  text-align: ${preset.rhythm.align};
  ${numberedHeadings ? "counter-reset: gzh-h1;" : ""}
}
${scope} h1[data-block-type="title"] {
  margin: 0 0 ${preset.rhythm.sectionGap};
  color: ${preset.palette.textMain};
  font-size: ${preset.typography.titleSize};
  line-height: 1.35;
  font-weight: 800;
}
${scope} h1:not([data-block-type="title"]) {
  margin: ${preset.rhythm.sectionGap} 0 ${preset.rhythm.paragraphGap};
  color: ${preset.palette.primary};
  font-size: ${preset.typography.h2Size};
  line-height: 1.45;
  font-weight: 750;
  border-left: 4px solid ${preset.palette.primary};
  padding-left: 10px;
  ${headingBlock}
}
${numberedHeadings ? numberedHeadingCss(scope, preset) : ""}
${scope} h2 {
  margin: ${preset.rhythm.sectionGap} 0 ${preset.rhythm.paragraphGap};
  color: ${preset.palette.primary};
  font-size: ${decreasePx(preset.typography.h2Size, 2)};
  line-height: 1.45;
  font-weight: 700;
}
${scope} h3 {
  margin: ${preset.rhythm.sectionGap} 0 ${preset.rhythm.paragraphGap};
  color: ${preset.palette.textMain};
  font-size: ${decreasePx(preset.typography.h2Size, 4)};
  line-height: 1.45;
  font-weight: 600;
}
${scope} p {
  margin: 0 0 ${preset.rhythm.paragraphGap};
  text-indent: ${preset.rhythm.firstLineIndent ?? "0"};
}
${scope} img {
  max-width: 100%;
  height: auto;
}
${scope} blockquote {
  margin: ${preset.rhythm.paragraphGap} 0;
  padding: 12px 14px;
  color: ${preset.palette.textSub};
  background: ${preset.palette.secondary};
  border-left: 4px solid ${preset.palette.primary};
  ${quoteBlock}
}
${scope} ul,
${scope} ol {
  margin: ${preset.rhythm.paragraphGap} 0;
  padding-left: 1.4em;
}
${scope} li {
  margin: 6px 0;
}
${scope} table {
  width: 100%;
  margin: ${preset.rhythm.paragraphGap} 0;
  border-collapse: collapse;
}
${scope} th,
${scope} td {
  border: 1px solid #e2e5ea;
  padding: 8px 10px;
}
${scope} th {
  background: ${preset.palette.primary}14;
  color: ${preset.palette.textMain};
}
${scope} hr {
  margin: ${preset.rhythm.sectionGap} auto;
  border: 0;
  border-top: 1px solid ${preset.palette.secondary};
  ${dividerBlock}
}
${scope} [data-block-role="lead"] {
  color: ${preset.palette.textSub};
  padding-left: 12px;
  border-left: 3px solid ${preset.palette.primary};
}
${scope} [data-block-role="emphasis"],
${scope} [data-block-role="summary"] {
  background: ${preset.palette.secondary};
  border-left: 3px solid ${preset.palette.primary};
  border-radius: 6px;
  padding: 12px 14px;
}
${scope} [data-block-role="keyQuote"] {
  background: linear-gradient(135deg, ${preset.palette.secondary}, #fff);
  border: 1px solid ${preset.palette.primary}22;
  border-radius: 10px;
}
${scope} [data-block-role="steps"] {
  background: ${preset.palette.secondary};
}
${scope} [data-block-role="tip"] {
  background: ${preset.palette.secondary};
  border: 1px solid ${preset.palette.primary}33;
  border-radius: 8px;
  padding: 12px 14px;
}
${scope} [data-block-role="pullquote"],
${scope} [data-block-role="data"],
${scope} [data-block-role="editorNote"] {
  background: ${preset.palette.secondary};
  border-left: 4px solid ${preset.palette.primary};
  border-radius: 8px;
  padding: 12px 14px;
}
${scope} [data-block-role="quoteCenter"] {
  color: ${preset.palette.textSub};
  text-align: center;
  border-top: 1px solid ${preset.palette.primary};
  border-bottom: 1px solid ${preset.palette.primary};
  padding: 12px 10px;
}
${scope} [data-block-role="step"] {
  background: ${preset.palette.secondary};
  border-radius: 8px;
  padding: 10px 14px;
}
${scope} [data-block-role="toolLabel"],
${scope} [data-block-role="sidenote"] {
  background: ${preset.palette.secondary};
  border-radius: 8px;
  padding: 10px 12px;
}
${scope} [data-block-role="toc"] {
  background: ${preset.palette.secondary};
  border-radius: 8px;
  padding: 12px 14px;
}
${scope} [data-block-role="signature"] {
  color: ${preset.palette.textSub};
  text-align: right;
  border-top: 1px solid ${preset.palette.secondary};
  padding-top: 12px;
}
${scope} [data-block-role="imageSlot"] {
  outline: 1px dashed ${preset.palette.textSub};
  outline-offset: 8px;
}
`;
}

function numberedHeadingCss(scope: string, preset: StylePreset) {
  return `
${scope} h1:not([data-block-type="title"]) {
  border-left: 0;
  padding-left: 0;
}
${scope} h1:not([data-block-type="title"])::before {
  counter-increment: gzh-h1;
  content: counter(gzh-h1, decimal-leading-zero);
  display: inline-block;
  min-width: 24px;
  height: 24px;
  line-height: 24px;
  margin-right: 8px;
  border-radius: 999px;
  background: ${preset.palette.primary};
  color: #fff;
  font-size: 13px;
  text-align: center;
  vertical-align: 1px;
}`;
}

function decreasePx(value: string, amount: number) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? `${Math.max(12, parsed - amount)}px` : value;
}
