import type { StylePreset } from "./types";

export function presetToEditorCss(preset: StylePreset, scope = ".layout-editor .tiptap"): string {
  return `
${scope} {
  color: ${preset.palette.textMain};
  font-size: ${preset.typography.bodySize};
  line-height: ${preset.typography.lineHeight};
  letter-spacing: ${preset.typography.letterSpacing};
  text-align: ${preset.rhythm.align};
}
${scope} h1 {
  margin: 0 0 ${preset.rhythm.sectionGap};
  color: ${preset.palette.textMain};
  font-size: ${preset.typography.titleSize};
  line-height: 1.35;
  font-weight: 800;
}
${scope} h2 {
  margin: ${preset.rhythm.sectionGap} 0 ${preset.rhythm.paragraphGap};
  color: ${preset.palette.primary};
  font-size: ${preset.typography.h2Size};
  line-height: 1.45;
  font-weight: 750;
  border-left: 4px solid ${preset.palette.primary};
  padding-left: 10px;
}
${scope} p {
  margin: 0 0 ${preset.rhythm.paragraphGap};
}
${scope} blockquote {
  margin: ${preset.rhythm.paragraphGap} 0;
  padding: 12px 14px;
  color: ${preset.palette.textSub};
  background: ${preset.palette.secondary};
  border-left: 4px solid ${preset.palette.primary};
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
  background: ${preset.palette.secondary};
  color: ${preset.palette.textMain};
}
${scope} hr {
  margin: ${preset.rhythm.sectionGap} auto;
  border: 0;
  border-top: 1px solid ${preset.palette.secondary};
}
`;
}
