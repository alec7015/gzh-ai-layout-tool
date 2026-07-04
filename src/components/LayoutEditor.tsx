import { useEffect, useMemo, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { BackgroundColor, Color, FontSize, TextStyle } from "@tiptap/extension-text-style";
import { BlockMeta } from "./BlockMetaExtension";
import { ImageGrid } from "./ImageGridExtension";
import { astToTiptapDoc, tiptapDocToAst, type TiptapDoc } from "../domain/tiptapAdapter";
import { presetToEditorCss } from "../domain/presetToEditorCss";
import type { ArticleAst, StylePreset } from "../domain/types";

interface LayoutEditorProps {
  article: ArticleAst;
  preset: StylePreset;
  onChangeArticle(article: ArticleAst): void;
  onSetBlockStyle(blockId: string, key: string, value: string): void;
}

const colorSwatches = ["#171717", "#dc2626", "#d97706", "#0f766e", "#2563eb", "#7c3aed"];
const backgroundSwatches = ["#ffffff", "#fef3c7", "#ecfdf5", "#eff6ff", "#f5f3ff", "#f4f4f5"];

export default function LayoutEditor({
  article,
  preset,
  onChangeArticle,
  onSetBlockStyle,
}: LayoutEditorProps) {
  const articleRef = useRef(article);
  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        TextStyle,
        Color,
        FontSize,
        BackgroundColor,
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        Table.configure({ resizable: false }),
        TableRow,
        TableHeader,
        TableCell,
        ImageGrid,
        BlockMeta,
      ],
      content: astToTiptapDoc(article),
      editorProps: {
        attributes: { "aria-label": "排版编辑区" },
      },
      onUpdate: ({ editor: currentEditor }) => {
        onChangeArticle(tiptapDocToAst(currentEditor.getJSON() as TiptapDoc, articleRef.current));
      },
    },
    []
  );
  const css = useMemo(() => presetToEditorCss(preset), [preset]);

  useEffect(() => {
    articleRef.current = article;
  }, [article]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) {
      return;
    }

    editor.commands.setContent(astToTiptapDoc(article), { emitUpdate: false });
  }, [article, editor]);

  function setBlockBackground(color: string) {
    const blockId = getCurrentBlockId();
    if (!blockId) {
      return;
    }
    onSetBlockStyle(blockId, "background", color);
  }

  function getCurrentBlockId(): string | null {
    if (!editor) {
      return null;
    }

    const { $from } = editor.state.selection;
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      const blockId = $from.node(depth).attrs.blockId;
      if (typeof blockId === "string") {
        return blockId;
      }
    }
    return null;
  }

  return (
    <div className="layout-editor">
      <style>{css}</style>
      <div className="layout-editor-toolbar" aria-label="排版工具栏">
        <select
          aria-label="块类型"
          onChange={(event) => {
            const value = event.target.value;
            if (value === "heading") {
              editor?.chain().focus().toggleHeading({ level: 2 }).run();
            } else if (value === "quote") {
              editor?.chain().focus().toggleBlockquote().run();
            } else if (value === "bullet") {
              editor?.chain().focus().toggleBulletList().run();
            } else if (value === "ordered") {
              editor?.chain().focus().toggleOrderedList().run();
            } else {
              editor?.chain().focus().setParagraph().run();
            }
            event.target.value = "paragraph";
          }}
        >
          <option value="paragraph">正文</option>
          <option value="heading">小标题</option>
          <option value="quote">引用</option>
          <option value="bullet">无序列表</option>
          <option value="ordered">有序列表</option>
        </select>
        <button className={editor?.isActive("bold") ? "active" : ""} type="button" onClick={() => editor?.chain().focus().toggleBold().run()}>
          B
        </button>
        <button className={editor?.isActive("italic") ? "active" : ""} type="button" onClick={() => editor?.chain().focus().toggleItalic().run()}>
          I
        </button>
        <button className={editor?.isActive("underline") ? "active" : ""} type="button" onClick={() => editor?.chain().focus().toggleUnderline().run()}>
          U
        </button>
        <button className={editor?.isActive("strike") ? "active" : ""} type="button" onClick={() => editor?.chain().focus().toggleStrike().run()}>
          S
        </button>
        <select aria-label="字号" onChange={(event) => editor?.chain().focus().setFontSize(event.target.value).run()} defaultValue="">
          <option value="" disabled>
            字号
          </option>
          {["14px", "15px", "16px", "17px", "18px", "20px"].map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <div className="toolbar-swatches" aria-label="文字色">
          {colorSwatches.map((color) => (
            <button
              key={color}
              style={{ background: color }}
              title={`文字色 ${color}`}
              type="button"
              onClick={() => editor?.chain().focus().setColor(color).run()}
            />
          ))}
        </div>
        <div className="toolbar-swatches" aria-label="背景色">
          {backgroundSwatches.map((color) => (
            <button
              key={color}
              style={{ background: color }}
              title={`背景色 ${color}`}
              type="button"
              onClick={() => editor?.chain().focus().setBackgroundColor(color).run()}
            />
          ))}
        </div>
        <button type="button" onClick={() => editor?.chain().focus().setTextAlign("left").run()}>
          左
        </button>
        <button type="button" onClick={() => editor?.chain().focus().setTextAlign("center").run()}>
          中
        </button>
        <button type="button" onClick={() => editor?.chain().focus().setTextAlign("right").run()}>
          右
        </button>
        <input aria-label="块背景色" type="color" onChange={(event) => setBlockBackground(event.target.value)} />
        <button type="button" onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}>
          清除
        </button>
      </div>
      <div className="layout-editor-paper">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
