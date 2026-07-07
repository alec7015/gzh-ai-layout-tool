import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { astToTiptapDoc, tiptapDocToAst, type TiptapDoc } from "../domain/tiptapAdapter";
import type { ArticleAst } from "../domain/types";
import { BlockMeta } from "./BlockMetaExtension";

describe("BlockMeta", () => {
  it("preserves code block metadata through a real Tiptap editor instance", () => {
    const article: ArticleAst = {
      meta: { title: "代码元数据" },
      blocks: [
        { id: "title-1", type: "title", text: "代码元数据", style: {} },
        {
          id: "code-keep",
          type: "code",
          language: "ts",
          text: "const x = 1;",
          style: { background: "#f6f8fa" },
          roleHint: "示例代码",
        },
      ],
    };
    const editor = new Editor({
      extensions: [StarterKit, BlockMeta],
      content: astToTiptapDoc(article),
    });

    const restored = tiptapDocToAst(editor.getJSON() as TiptapDoc, article);

    expect(restored.blocks[1]).toMatchObject({
      id: "code-keep",
      type: "code",
      style: { background: "#f6f8fa" },
      roleHint: "示例代码",
    });
    editor.destroy();
  });
});
