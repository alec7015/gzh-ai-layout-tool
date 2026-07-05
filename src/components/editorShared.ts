import { useEffect, type RefObject } from "react";
import type { Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

export const fontSizeOptions = ["14px", "15px", "16px", "17px", "18px", "20px", "24px"];
export const lineHeightOptions = ["1.5", "1.75", "2", "2.25"];
export const colorSwatches = ["#171717", "#dc2626", "#d97706", "#0f766e", "#2563eb", "#7c3aed"];
export const backgroundSwatches = ["#ffffff", "#fef3c7", "#ecfdf5", "#eff6ff", "#f5f3ff", "#f4f4f5"];
export const fontFamilyOptions = [
  { label: "默认字体", value: "" },
  { label: "宋体", value: "SimSun,'Songti SC',serif" },
  { label: "楷体", value: "KaiTi,'STKaiti',serif" },
  { label: "仿宋", value: "FangSong,'STFangsong',serif" },
  { label: "黑体", value: "SimHei,'Microsoft YaHei',sans-serif" },
];

export type AlignValue = "left" | "center" | "right" | "justify";

export interface CurrentBlock {
  node: ProseMirrorNode;
  pos: number;
}

export interface PainterSnapshot {
  marks: {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strike: boolean;
  };
  textStyle: {
    color?: string;
    backgroundColor?: string;
    fontSize?: string;
    fontFamily?: string;
  };
  textAlign?: AlignValue;
  blockStyle: Record<string, string>;
}

const visualBlockStyleKeys = ["line-height", "background", "text-indent"];

export function clampNumber(value: string, min: number, max: number, fallback: number) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(parsed, min), max);
}

export function findCurrentBlock(editor: Editor | null): CurrentBlock | null {
  if (!editor) {
    return null;
  }

  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (typeof node.attrs.blockId === "string") {
      return { node, pos: $from.before(depth) };
    }
  }
  return null;
}

export function getBlockStyle(editor: Editor | null): Record<string, string> {
  const block = findCurrentBlock(editor);
  const style = block?.node.attrs.blockStyle;
  if (!style || typeof style !== "object" || Array.isArray(style)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(style as Record<string, unknown>)
      .filter(([, value]) => typeof value === "string" || typeof value === "number")
      .map(([key, value]) => [key, String(value)])
  );
}

export function getBlockStyleValue(editor: Editor | null, key: string) {
  return getBlockStyle(editor)[key] ?? "";
}

export function setBlockStyleAttr(editor: Editor | null, key: string, value: string | null) {
  const block = findCurrentBlock(editor);
  if (!editor || !block) {
    return;
  }

  const nextStyle = { ...getBlockStyle(editor) };
  if (value === null || value === "") {
    delete nextStyle[key];
  } else {
    nextStyle[key] = value;
  }

  editor.view.dispatch(
    editor.state.tr.setNodeAttribute(
      block.pos,
      "blockStyle",
      Object.keys(nextStyle).length > 0 ? nextStyle : null
    )
  );
}

export function clearBlockRoleAttr(editor: Editor | null) {
  const block = findCurrentBlock(editor);
  if (!editor || !block) {
    return;
  }
  editor.view.dispatch(editor.state.tr.setNodeAttribute(block.pos, "blockRole", null));
}

export function applyPainterToStyle(
  targetStyle: Record<string, string>,
  snapshot: PainterSnapshot
): Record<string, string> {
  const next = { ...targetStyle };
  visualBlockStyleKeys.forEach((key) => {
    delete next[key];
  });
  return { ...next, ...snapshot.blockStyle };
}

export function capturePainter(editor: Editor | null): PainterSnapshot | null {
  if (!editor) {
    return null;
  }

  const textStyle = editor.getAttributes("textStyle") as Record<string, unknown>;
  const textAlign = (editor.getAttributes("paragraph").textAlign ??
    editor.getAttributes("heading").textAlign) as AlignValue | undefined;
  const blockStyle = Object.fromEntries(
    Object.entries(getBlockStyle(editor)).filter(([key]) => visualBlockStyleKeys.includes(key))
  );

  return {
    marks: {
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      underline: editor.isActive("underline"),
      strike: editor.isActive("strike"),
    },
    textStyle: {
      color: typeof textStyle.color === "string" ? textStyle.color : undefined,
      backgroundColor:
        typeof textStyle.backgroundColor === "string" ? textStyle.backgroundColor : undefined,
      fontSize: typeof textStyle.fontSize === "string" ? textStyle.fontSize : undefined,
      fontFamily: typeof textStyle.fontFamily === "string" ? textStyle.fontFamily : undefined,
    },
    textAlign,
    blockStyle,
  };
}

export function applyPainter(editor: Editor | null, snapshot: PainterSnapshot | null) {
  const block = findCurrentBlock(editor);
  if (!editor || !snapshot || !block) {
    return;
  }

  let chain = editor.chain().focus().unsetAllMarks();
  if (snapshot.marks.bold) {
    chain = chain.toggleBold();
  }
  if (snapshot.marks.italic) {
    chain = chain.toggleItalic();
  }
  if (snapshot.marks.underline) {
    chain = chain.toggleUnderline();
  }
  if (snapshot.marks.strike) {
    chain = chain.toggleStrike();
  }
  const textStyleAttrs = Object.fromEntries(
    Object.entries(snapshot.textStyle).filter(([, value]) => Boolean(value))
  );
  if (Object.keys(textStyleAttrs).length > 0) {
    chain = chain.setMark("textStyle", textStyleAttrs);
  }
  chain.run();

  if (snapshot.textAlign) {
    editor.chain().focus().setTextAlign(snapshot.textAlign).run();
  }

  const nextStyle = applyPainterToStyle(getBlockStyle(editor), snapshot);
  editor.view.dispatch(
    editor.state.tr.setNodeAttribute(
      block.pos,
      "blockStyle",
      Object.keys(nextStyle).length > 0 ? nextStyle : null
    )
  );
}

export function clearVisualBlockStyle(editor: Editor | null) {
  visualBlockStyleKeys.forEach((key) => setBlockStyleAttr(editor, key, null));
  clearBlockRoleAttr(editor);
  editor?.chain().focus().setTextAlign("left").run();
}

export function usePopoverDismiss(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void
) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const closeOnOutside = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        onClose();
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose, open, ref]);
}
