import { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { BackgroundColor, Color, FontSize, TextStyle } from "@tiptap/extension-text-style";
import { Bold, Italic, Redo2, Settings, Strikethrough, Underline, Undo2 } from "lucide-react";
import { BlockMeta } from "./BlockMetaExtension";
import { ImageGrid } from "./ImageGridExtension";
import { TableTools } from "./TableTools";
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
    autoPalette: boolean;
  };
  onSettingsChange(next: Partial<LayoutEditorProps["settings"]>): void;
}

const colorSwatches = ["#171717", "#dc2626", "#d97706", "#0f766e", "#2563eb", "#7c3aed"];
const backgroundSwatches = ["#ffffff", "#fef3c7", "#ecfdf5", "#eff6ff", "#f5f3ff", "#f4f4f5"];
const fontSizeOptions = ["14px", "15px", "16px", "17px", "18px", "20px"];
const lineHeightOptions = ["1.5", "1.75", "2", "2.25"];

function clampNumber(value: string, min: number, max: number, fallback: number) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(parsed, min), max);
}

function findCurrentBlock(editor: Editor | null) {
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

function getBlockStyleValue(editor: Editor | null, key: string) {
  const block = findCurrentBlock(editor);
  const style = block?.node.attrs.blockStyle;
  if (!style || typeof style !== "object") {
    return "";
  }
  const value = (style as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

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
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const [, forceUpdate] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [customFontSizeOpen, setCustomFontSizeOpen] = useState(false);
  const [customLineHeightOpen, setCustomLineHeightOpen] = useState(false);
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

  useEffect(() => {
    if (!settingsOpen) {
      return;
    }

    const closeOnOutside = (event: PointerEvent) => {
      if (!settingsRef.current?.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSettingsOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [settingsOpen]);

  function setBlockStyleAttr(key: string, value: string | null) {
    const block = findCurrentBlock(editor);
    if (!editor || !block) {
      return;
    }

    const nextStyle = {
      ...((block.node.attrs.blockStyle && typeof block.node.attrs.blockStyle === "object") ? block.node.attrs.blockStyle : {}),
    };
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

  function clearBlockRoleAttr() {
    const block = findCurrentBlock(editor);
    if (!editor || !block) {
      return;
    }
    editor.view.dispatch(editor.state.tr.setNodeAttribute(block.pos, "blockRole", null));
  }

  const fontSizeAttr = editor?.getAttributes("textStyle").fontSize;
  const fontSize = typeof fontSizeAttr === "string" ? fontSizeAttr : "";
  const fontSizeSelect = fontSize === "" || fontSizeOptions.includes(fontSize) ? fontSize : "custom";
  const lineHeight = getBlockStyleValue(editor ?? null, "line-height");
  const lineHeightSelect = lineHeight === "" || lineHeightOptions.includes(lineHeight) ? lineHeight : "custom";
  const displayedFontSizeSelect = customFontSizeOpen ? "custom" : fontSizeSelect;
  const displayedLineHeightSelect = customLineHeightOpen ? "custom" : lineHeightSelect;
  const isLeftAligned = !editor?.isActive({ textAlign: "center" }) && !editor?.isActive({ textAlign: "right" });

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
        <select
          aria-label="字号"
          value={displayedFontSizeSelect}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "") {
              setCustomFontSizeOpen(false);
              editor?.chain().focus().unsetFontSize().run();
            } else if (value === "custom") {
              setCustomFontSizeOpen(true);
              editor?.chain().focus().setFontSize(fontSize || "18px").run();
            } else {
              setCustomFontSizeOpen(false);
              editor?.chain().focus().setFontSize(value).run();
            }
          }}
        >
          <option value="">字号</option>
          {fontSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
          <option value="custom">自定义</option>
        </select>
        {displayedFontSizeSelect === "custom" ? (
          <input
            aria-label="自定义字号"
            className="ribbon-number"
            max={40}
            min={10}
            step={1}
            type="number"
            value={Number.parseInt(fontSize, 10) || 18}
            onChange={(event) => {
              const nextSize = clampNumber(event.target.value, 10, 40, 18);
              editor?.chain().focus().setFontSize(`${Math.round(nextSize)}px`).run();
            }}
          />
        ) : null}
        <select
          aria-label="行间距"
          value={displayedLineHeightSelect}
          onChange={(event) => {
            const value = event.target.value;
            setCustomLineHeightOpen(value === "custom");
            setBlockStyleAttr("line-height", value === "custom" ? lineHeight || "1.9" : value || null);
          }}
        >
          <option value="">行距</option>
          {lineHeightOptions.map((height) => (
            <option key={height} value={height}>
              {height === "2" ? "2.0" : height}
            </option>
          ))}
          <option value="custom">自定义</option>
        </select>
        {displayedLineHeightSelect === "custom" ? (
          <input
            aria-label="自定义行距"
            className="ribbon-number"
            max={3}
            min={1}
            step={0.05}
            type="number"
            value={Number.parseFloat(lineHeight) || 1.9}
            onChange={(event) => setBlockStyleAttr("line-height", String(clampNumber(event.target.value, 1, 3, 1.9)))}
          />
        ) : null}
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
        <button className={isLeftAligned ? "active" : ""} type="button" onClick={() => editor?.chain().focus().setTextAlign("left").run()}>
          左
        </button>
        <button className={editor?.isActive({ textAlign: "center" }) ? "active" : ""} type="button" onClick={() => editor?.chain().focus().setTextAlign("center").run()}>
          中
        </button>
        <button className={editor?.isActive({ textAlign: "right" }) ? "active" : ""} type="button" onClick={() => editor?.chain().focus().setTextAlign("right").run()}>
          右
        </button>
        <input aria-label="块背景色" title="块背景色" type="color" onChange={(event) => setBlockStyleAttr("background", event.target.value)} />
        <button type="button" onClick={() => editor?.chain().focus().unsetAllMarks().run()}>
          清文字样式
        </button>
        <button type="button" onClick={() => {
          ["background", "line-height"].forEach((key) => setBlockStyleAttr(key, null));
          clearBlockRoleAttr();
          editor?.chain().focus().setTextAlign("left").run();
        }}>
          清块样式
        </button>
        <TableTools editor={editor} />
        <span className="ribbon-spacer" />
        <div className="layout-settings-wrap" ref={settingsRef}>
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
              <label className="settings-inline">
                <input type="checkbox" checked={settings.autoPalette} onChange={(event) => onSettingsChange({ autoPalette: event.target.checked })} />
                自动配套色
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
