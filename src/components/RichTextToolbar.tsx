import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Editor } from "@tiptap/core";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Indent,
  Italic,
  Paintbrush,
  Redo2,
  Strikethrough,
  Type,
  Underline,
  Undo2,
} from "lucide-react";
import { TableTools } from "./TableTools";
import {
  applyPainter,
  backgroundSwatches,
  capturePainter,
  clampNumber,
  clearVisualBlockStyle,
  colorSwatches,
  fontFamilyOptions,
  fontSizeOptions,
  getBlockStyleValue,
  findTopBlock,
  lineHeightOptions,
  setBlockRoleAttr,
  setBlockStyleAttr,
  type AlignValue,
  type PainterSnapshot,
} from "./editorShared";
import type { BlockRole } from "../domain/types";

interface RichTextToolbarProps {
  editor: Editor | null;
  ariaLabel?: string;
  className?: string;
  features?: {
    blockBackground?: boolean;
    clearBlockStyle?: boolean;
    blockRoles?: boolean;
  };
  slotLeft?: ReactNode;
  slotRight?: ReactNode;
}

export function RichTextToolbar({
  editor,
  ariaLabel = "富文本工具栏",
  className = "editor-toolbar",
  features,
  slotLeft,
  slotRight,
}: RichTextToolbarProps) {
  const [, forceUpdate] = useState(0);
  const [customFontSizeOpen, setCustomFontSizeOpen] = useState(false);
  const [customLineHeightOpen, setCustomLineHeightOpen] = useState(false);
  const [painterSnapshot, setPainterSnapshot] = useState<PainterSnapshot | null>(null);
  const [painterMode, setPainterMode] = useState<null | "single" | "continuous">(null);
  const toolbarClass = `${className}${painterMode ? " painter-active" : ""}`;
  const textStyle = editor?.getAttributes("textStyle") as Record<string, unknown> | undefined;
  const fontSize = typeof textStyle?.fontSize === "string" ? textStyle.fontSize : "";
  const fontFamily = typeof textStyle?.fontFamily === "string" ? textStyle.fontFamily : "";
  const fontSizeSelect = fontSize === "" || fontSizeOptions.includes(fontSize) ? fontSize : "custom";
  const lineHeight = getBlockStyleValue(editor, "line-height");
  const lineHeightSelect =
    lineHeight === "" || lineHeightOptions.includes(lineHeight) ? lineHeight : "custom";
  const displayedFontSizeSelect = customFontSizeOpen ? "custom" : fontSizeSelect;
  const displayedLineHeightSelect = customLineHeightOpen ? "custom" : lineHeightSelect;
  const currentBlock = useMemo(() => blockSelectValue(editor), [editor, editor?.state.selection]);
  const currentRole = useMemo(() => blockRoleValue(editor), [editor, editor?.state.selection]);
  const currentAlign = getActiveAlign(editor);
  const currentIndent = getBlockStyleValue(editor, "text-indent") === "2em";

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
    if (!editor || !painterMode) {
      return;
    }

    const applyOnSelection = () => {
      window.setTimeout(() => {
        applyPainter(editor, painterSnapshot);
        if (painterMode === "single") {
          setPainterMode(null);
          setPainterSnapshot(null);
        }
      }, 0);
    };
    const clearOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPainterMode(null);
        setPainterSnapshot(null);
      }
    };
    const applyOnKeyboardSelection = (event: KeyboardEvent) => {
      if (event.key === "Shift" && !editor.state.selection.empty) {
        applyOnSelection();
      }
    };

    editor.view.dom.addEventListener("mouseup", applyOnSelection);
    document.addEventListener("keydown", clearOnEscape);
    document.addEventListener("keyup", applyOnKeyboardSelection);
    return () => {
      editor.view.dom.removeEventListener("mouseup", applyOnSelection);
      document.removeEventListener("keydown", clearOnEscape);
      document.removeEventListener("keyup", applyOnKeyboardSelection);
    };
  }, [editor, painterMode, painterSnapshot]);

  function startPainter(mode: "single" | "continuous") {
    const snapshot = capturePainter(editor);
    if (!snapshot) {
      return;
    }
    setPainterSnapshot(snapshot);
    setPainterMode(mode);
  }

  function setBlockType(value: string) {
    if (!editor) {
      return;
    }

    const chain = editor.chain().focus();
    if (value === "heading1") {
      chain.setHeading({ level: 1 }).run();
    } else if (value === "heading2") {
      chain.setHeading({ level: 2 }).run();
    } else if (value === "heading3") {
      chain.setHeading({ level: 3 }).run();
    } else if (value === "quote") {
      chain.toggleBlockquote().run();
    } else if (value === "bullet") {
      chain.toggleBulletList().run();
    } else if (value === "ordered") {
      chain.toggleOrderedList().run();
    } else {
      chain.setParagraph().run();
    }
  }

  function clearInlineStyle() {
    editor
      ?.chain()
      .focus()
      .unsetAllMarks()
      .unsetColor()
      .unsetBackgroundColor()
      .unsetFontSize()
      .unsetFontFamily()
      .run();
  }

  return (
    <div className={toolbarClass} aria-label={ariaLabel}>
      <div className="ribbon-group">
        <button type="button" title="撤销 Ctrl+Z" disabled={!editor} onClick={() => editor?.chain().focus().undo().run()}>
          <Undo2 size={16} />
        </button>
        <button type="button" title="重做 Ctrl+Y" disabled={!editor} onClick={() => editor?.chain().focus().redo().run()}>
          <Redo2 size={16} />
        </button>
      </div>
      <span className="ribbon-divider" />
      <select aria-label="块类型" value={currentBlock} onChange={(event) => setBlockType(event.target.value)}>
        <option value="title" disabled>
          文章标题
        </option>
        <option value="paragraph">正文</option>
        <option value="heading1">一级标题</option>
        <option value="heading2">二级标题</option>
        <option value="heading3">三级标题</option>
        <option value="quote">引用</option>
        <option value="bullet">无序列表</option>
        <option value="ordered">有序列表</option>
      </select>
      <div className="ribbon-group">
        <button className={editor?.isActive("heading", { level: 1 }) ? "active" : ""} type="button" title="一级标题" onClick={() => editor?.chain().focus().setHeading({ level: 1 }).run()}>
          <Heading1 size={16} />
        </button>
        <button className={editor?.isActive("heading", { level: 2 }) ? "active" : ""} type="button" title="二级标题" onClick={() => editor?.chain().focus().setHeading({ level: 2 }).run()}>
          <Heading2 size={16} />
        </button>
        <button className={editor?.isActive("heading", { level: 3 }) ? "active" : ""} type="button" title="三级标题" onClick={() => editor?.chain().focus().setHeading({ level: 3 }).run()}>
          <Heading3 size={16} />
        </button>
      </div>
      <span className="ribbon-divider" />
      <div className="ribbon-group">
        <button className={editor?.isActive("bold") ? "active" : ""} type="button" title="加粗 Ctrl+B" onClick={() => editor?.chain().focus().toggleBold().run()}>
          <Bold size={16} />
        </button>
        <button className={editor?.isActive("italic") ? "active" : ""} type="button" title="斜体 Ctrl+I" onClick={() => editor?.chain().focus().toggleItalic().run()}>
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
        aria-label="字体"
        value={fontFamilyOptions.some((item) => item.value === fontFamily) ? fontFamily : ""}
        onChange={(event) => {
          const value = event.target.value;
          if (value) {
            editor?.chain().focus().setFontFamily(value).run();
          } else {
            editor?.chain().focus().unsetFontFamily().run();
          }
        }}
      >
        {fontFamilyOptions.map((font) => (
          <option key={font.label} value={font.value}>
            {font.label}
          </option>
        ))}
      </select>
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
          setBlockStyleAttr(editor, "line-height", value === "custom" ? lineHeight || "1.9" : value || null);
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
          onChange={(event) => setBlockStyleAttr(editor, "line-height", String(clampNumber(event.target.value, 1, 3, 1.9)))}
        />
      ) : null}
      <ColorTools
        icon={<Type size={15} />}
        label="文字色"
        swatches={colorSwatches}
        onClear={() => editor?.chain().focus().unsetColor().run()}
        onSet={(color) => editor?.chain().focus().setColor(color).run()}
      />
      <ColorTools
        icon={<Highlighter size={15} />}
        label="高亮"
        swatches={backgroundSwatches}
        onClear={() => editor?.chain().focus().unsetBackgroundColor().run()}
        onSet={(color) => editor?.chain().focus().setBackgroundColor(color).run()}
      />
      <div className="ribbon-group">
        {(["left", "center", "right", "justify"] as AlignValue[]).map((align) => (
          <button
            className={currentAlign === align ? "active" : ""}
            key={align}
            type="button"
            title={alignTitle(align)}
            onClick={() => editor?.chain().focus().setTextAlign(align).run()}
          >
            {align === "left" ? <AlignLeft size={16} /> : null}
            {align === "center" ? <AlignCenter size={16} /> : null}
            {align === "right" ? <AlignRight size={16} /> : null}
            {align === "justify" ? <AlignJustify size={16} /> : null}
          </button>
        ))}
      </div>
      <button
        className={currentIndent ? "active" : ""}
        type="button"
        title="首行缩进"
        onClick={() => setBlockStyleAttr(editor, "text-indent", currentIndent ? null : "2em")}
      >
        <Indent size={16} />
      </button>
      {features?.blockRoles ? (
        <select
          aria-label="块角色"
          value={currentRole}
          onChange={(event) => {
            const role = event.target.value as "" | BlockRole;
            setBlockRoleAttr(editor, role || null, role === "imageSlot" ? "补充一张贴合段落内容的配图" : undefined);
          }}
        >
          <option value="">角色</option>
          <option value="keyQuote">金句卡</option>
          <option value="emphasis">重点段</option>
          <option value="summary">小结卡</option>
          <option value="tip">提示卡</option>
          <option value="imageSlot">建议配图</option>
        </select>
      ) : null}
      <button
        className={painterMode ? "active" : ""}
        type="button"
        title="格式刷：单击一次，双击连续"
        onClick={() => startPainter("single")}
        onDoubleClick={() => startPainter("continuous")}
      >
        <Paintbrush size={16} />
      </button>
      {features?.blockBackground ? (
        <input
          aria-label="块背景色"
          title="块背景色"
          type="color"
          onChange={(event) => setBlockStyleAttr(editor, "background", event.target.value)}
        />
      ) : null}
      {slotLeft}
      <TableTools editor={editor} />
      <span className="ribbon-divider" />
      <button type="button" title="清文字样式" onClick={clearInlineStyle}>
        <Eraser size={15} />
        清文字样式
      </button>
      {features?.clearBlockStyle ? (
        <button type="button" title="清块样式" onClick={() => clearVisualBlockStyle(editor)}>
          清块样式
        </button>
      ) : null}
      <span className="ribbon-spacer" />
      {slotRight}
    </div>
  );
}

function ColorTools({
  icon,
  label,
  swatches,
  onSet,
  onClear,
}: {
  icon: ReactNode;
  label: string;
  swatches: string[];
  onSet(color: string): void;
  onClear(): void;
}) {
  return (
    <div className="toolbar-color" aria-label={label}>
      <span title={label}>{icon}</span>
      <div className="toolbar-swatches">
        {swatches.map((color) => (
          <button
            key={color}
            style={{ background: color }}
            title={`${label} ${color}`}
            type="button"
            onClick={() => onSet(color)}
          />
        ))}
      </div>
      <input aria-label={`${label}自定义`} type="color" onChange={(event) => onSet(event.target.value)} />
      <button type="button" title={`清除${label}`} onClick={onClear}>
        ×
      </button>
    </div>
  );
}

function blockSelectValue(editor: Editor | null) {
  if (!editor) {
    return "paragraph";
  }
  if (editor.isActive("heading")) {
    const attrs = editor.getAttributes("heading");
    if (attrs.blockType === "title" || (typeof attrs.blockId === "string" && attrs.blockId.includes("title"))) {
      return "title";
    }
  }
  if (editor.isActive("heading", { level: 1 })) {
    return "heading1";
  }
  if (editor.isActive("heading", { level: 2 })) {
    return "heading2";
  }
  if (editor.isActive("heading", { level: 3 })) {
    return "heading3";
  }
  if (editor.isActive("blockquote")) {
    return "quote";
  }
  if (editor.isActive("bulletList")) {
    return "bullet";
  }
  if (editor.isActive("orderedList")) {
    return "ordered";
  }
  return "paragraph";
}

function getActiveAlign(editor: Editor | null): AlignValue {
  if (editor?.isActive({ textAlign: "center" })) {
    return "center";
  }
  if (editor?.isActive({ textAlign: "right" })) {
    return "right";
  }
  if (editor?.isActive({ textAlign: "justify" })) {
    return "justify";
  }
  return "left";
}

function blockRoleValue(editor: Editor | null) {
  const role = findTopBlock(editor)?.node.attrs.blockRole;
  return typeof role === "string" ? role : "";
}

function alignTitle(align: AlignValue) {
  if (align === "center") {
    return "居中";
  }
  if (align === "right") {
    return "右对齐";
  }
  if (align === "justify") {
    return "两端对齐";
  }
  return "左对齐";
}
