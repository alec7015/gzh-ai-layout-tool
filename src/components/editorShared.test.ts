import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import { BlockMeta } from "./BlockMetaExtension";
import { applyPainter, applyPainterToStyle, type PainterSnapshot } from "./editorShared";

describe("editorShared", () => {
  it("mirrors source painter styles and clears target-only block styles", () => {
    const snapshot: PainterSnapshot = {
      marks: { bold: true, italic: false, underline: true, strike: false },
      textStyle: {
        color: "#dc2626",
        backgroundColor: "#fef3c7",
        fontSize: "18px",
        fontFamily: "\"KaiTi\",\"STKaiti\",serif",
      },
      textAlign: "justify",
      blockStyle: {
        "line-height": "1.9",
        "text-indent": "2em",
      },
    };

    const next = applyPainterToStyle(
      {
        "line-height": "1.5",
        background: "#ffffff",
        "text-indent": "0",
      },
      snapshot
    );

    expect(next).toEqual({
      "line-height": "1.9",
      "text-indent": "2em",
    });
  });

  it("applies character painter styles even when typed paragraphs have no block id", () => {
    const editor = new Editor({
      extensions: [StarterKit, TextStyle, Color, BlockMeta],
      content: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "source" }] },
          { type: "paragraph", content: [{ type: "text", text: "target" }] },
        ],
      },
    });
    const snapshot: PainterSnapshot = {
      marks: { bold: true, italic: false, underline: false, strike: false },
      textStyle: { color: "#dc2626" },
      textAlign: "left",
      blockStyle: {},
    };

    editor.commands.setTextSelection({ from: 9, to: 15 });
    applyPainter(editor, snapshot);

    const target = editor.getJSON().content?.[1].content?.[0];
    expect(target?.marks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "bold" }),
        expect.objectContaining({ type: "textStyle", attrs: expect.objectContaining({ color: "#dc2626" }) }),
      ])
    );
    editor.destroy();
  });
});
