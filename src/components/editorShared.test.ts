import { describe, expect, it } from "vitest";
import { applyPainterToStyle, type PainterSnapshot } from "./editorShared";

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
});
