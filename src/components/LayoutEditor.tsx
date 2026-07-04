import { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { BackgroundColor, Color, FontSize, TextStyle } from "@tiptap/extension-text-style";
import { Bold, Italic, Redo2, Settings, Strikethrough, Underline, Undo2 } from "lucide-react";
import { BlockMeta } from "./BlockMetaExtension";
import { ImageGrid } from "./ImageGridExtension";
import { astToTiptapDoc, tiptapDocToAst, type TiptapDoc } from "../domain/tiptapAdapter";
import { presetToEditorCss } from "../domain/presetToEditorCss";
import type { ArticleAst, StylePreset } from "../domain/types";

interface LayoutEditorProps {
  article: ArticleAst;
  preset: StylePreset;
  externalVersion: number;
  onChangeArticle(article: ArticleAst): void;
  onResetStyle(): void;
  onSaveStyle(): void;
  settings: {
    themeColor: string;
    bodySize: string;
    paragraphGap: string;
    footerText: string;
  };
  onSettingsChange(next: Partial<LayoutEditorProps["settings"]>): void;
}

const colorSwatches = ["#171717", "#dc2626", "#d97706", "#0f766e", "#2563eb", "#7c3aed"];
const backgroundSwatches = ["#ffffff", "#fef3c7", "#ecfdf5", "#eff6ff", "#f5f3ff", "#f4f4f5"];

export default function LayoutEditor({
  article,
  preset,
  externalVersion,
  onChangeArticle,
  onResetStyle,
  onSaveStyle,
  settings,
  onSettingsChange,
}: LayoutEditorProps) {
  const articleRef = useRef(article);
  const [, forceUpdate] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
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

    const rerender = () => forceUpdate((value) => value + 1);
    editor.on("transaction", rerender);
    editor.on("selectionUpdate", rerender);
    return () => {
      editor.off("transaction", rerender);
      editor.off("selectionUpdate", rerender);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) {
      return;
    }

    editor.commands.setContent(astToTiptapDoc(article), { emitUpdate: false });
  }, [editor, externalVersion]);

  function setBlockStyleAttr(key: string, value: string | null) {
    if (!editor) {
      return;
    }

    const { $from } = editor.state.selection;
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      const node = $from.node(depth);
      if (typeof node.attrs.blockId === "string") {
        const pos = $from.before(depth);
        const nextStyle = {
          ...((node.attrs.blockStyle && typeof node.attrs.blockStyle === "object") ? node.attrs.blockStyle : {}),
        };
        if (value === null || value === "") {
          delete nextStyle[key];
        } else {
          nextStyle[key] = value;
        }
        editor.view.dispatch(
          editor.state.tr.setNodeAttribute(
            pos,
            "blockStyle",
            Object.keys(nextStyle).length > 0 ? nextStyle : null
          )
        );
        return;
      }
    }
  }

  const fontSize = editor?.getAttributes("textStyle").fontSize ?? "";

  return (
    <div className="layout-editor">
      <style>{css}</style>
      <div className="layout-editor-toolbar" aria-label="排版工具栏">
        <div className="ribbon-group">
          <button type="button" title="撤销 Ctrl+Z" disabled={!editor?.can().undo()} onClick={() => editor?.chain().focus().undo().run()}>
            <Undo2 size={16} />
          </button>
          <button type="button" title="重做 Ctrl+Y" disabled={!editor?.can().redo()} onClick={() => editor?.chain().focus().redo().run()}>
            <Redo2 size={16} />
          </button>
        </div>
        <span className="ribbon-divider" />
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
        <div className="ribbon-group">
          <button className={editor?.isActive("bold") ? "active" : ""} type="button" title="加粗" onClick={() => editor?.chain().focus().toggleBold().run()}>
            <Bold size={16} />
          </button>
          <button className={editor?.isActive("italic") ? "active" : ""} type="button" title="斜体" onClick={() => editor?.chain().focus().toggleItalic().run()}>
            <Italic size={16} />
          </button>
          <button className={editor?.isActive("underline") ? "active" : ""} type="button" title="下划线" onClick={() => editor?.chain().focus().toggleUnderline().run()}>
            <Underline size={16} />
          </button>
          <button className={editor?.isActive("strike") ? "active" : ""} type="button" title="删除线" onClick={() => editor?.chain().focus().toggleStrike().run()}>
            <Strikethrough size={16} />
          </button>
        </div>
        <select aria-label="字号" value={fontSize} onChange={(event) => editor?.chain().focus().setFontSize(event.target.value).run()}>
          <option value="">字号</option>
          <option value="" disabled>
            字号
          </option>
          {["14px", "15px", "16px", "17px", "18px", "20px"].map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <select aria-label="行间距" onChange={(event) => setBlockStyleAttr("line-height", event.target.value || null)} defaultValue="">
          <option value="">行距</option>
          <option value="1.5">1.5</option>
          <option value="1.75">1.75</option>
          <option value="2">2.0</option>
          <option value="2.25">2.25</option>
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
        <input aria-label="块背景色" title="块背景色" type="color" onChange={(event) => setBlockStyleAttr("background", event.target.value)} />
        <button type="button" onClick={() => editor?.chain().focus().unsetAllMarks().run()}>
          清文字样式
        </button>
        <button type="button" onClick={() => {
          ["background", "line-height"].forEach((key) => setBlockStyleAttr(key, null));
          editor?.chain().focus().setTextAlign("left").run();
        }}>
          清块样式
        </button>
        <span className="ribbon-spacer" />
        <div className="layout-settings-wrap">
          <button type="button" onClick={() => setSettingsOpen((value) => !value)}>
            <Settings size={16} />
            版式设置
          </button>
          {settingsOpen ? (
            <div className="layout-settings-popover">
              <label>
                主题色
                <input type="color" value={settings.themeColor} onChange={(event) => onSettingsChange({ themeColor: event.target.value })} />
              </label>
              <label>
                正文字号
                <select value={settings.bodySize} onChange={(event) => onSettingsChange({ bodySize: event.target.value })}>
                  <option value="14px">14px</option>
                  <option value="15px">15px</option>
                  <option value="16px">16px</option>
                  <option value="17px">17px</option>
                </select>
              </label>
              <label>
                段间距
                <select value={settings.paragraphGap} onChange={(event) => onSettingsChange({ paragraphGap: event.target.value })}>
                  <option value="14px">紧凑</option>
                  <option value="16px">标准</option>
                  <option value="20px">舒展</option>
                  <option value="22px">留白</option>
                </select>
              </label>
              <label>
                文末引导语
                <textarea rows={3} value={settings.footerText} onChange={(event) => onSettingsChange({ footerText: event.target.value })} />
              </label>
              <div className="layout-settings-actions">
                <button type="button" onClick={onSaveStyle}>存为我的版式</button>
                <button type="button" onClick={onResetStyle}>恢复默认</button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div className="layout-editor-paper">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
