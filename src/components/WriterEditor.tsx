import { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { Slice, Fragment } from "@tiptap/pm/model";
import {
  Bold,
  Heading2,
  Image,
  Italic,
  LayoutGrid,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Table2,
  Undo2,
} from "lucide-react";
import { BlockMeta } from "./BlockMetaExtension";
import { ImageGrid } from "./ImageGridExtension";
import { TableTools } from "./TableTools";
import { htmlToCleanArticle } from "../domain/magicPaste";
import {
  astToTiptapDoc,
  tiptapDocToAst,
  type TiptapDoc,
} from "../domain/tiptapAdapter";
import type { ArticleAst } from "../domain/types";

interface WriterEditorProps {
  article: ArticleAst;
  externalVersion: number;
  onChangeArticle(article: ArticleAst): void;
  onInsertImageFiles(files: FileList | File[]): void;
  isSupportedImageFile(file: File): boolean;
  onCopyToLayout?: () => void;
  readOnly?: boolean;
}

export default function WriterEditor({
  article,
  externalVersion,
  onChangeArticle,
  onInsertImageFiles,
  isSupportedImageFile,
  onCopyToLayout,
  readOnly = false,
}: WriterEditorProps) {
  const articleRef = useRef(article);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        Table.configure({ resizable: false }),
        TableRow,
        TableHeader,
        TableCell,
        ImageGrid,
        BlockMeta,
      ],
      content: astToTiptapDoc(article),
      editorProps: {
        attributes: { "aria-label": "写作编辑区" },
        handlePaste: (view, event) => {
          const clipboard = event.clipboardData;
          if (!clipboard) {
            return false;
          }

          if (Array.from(clipboard.files).some(isSupportedImageFile)) {
            return false;
          }

          const html = clipboard.getData("text/html");
          if (!html.trim() || html.includes("data-pm-slice")) {
            return false;
          }

          event.preventDefault();
          const nextDoc = astToTiptapDoc(htmlToCleanArticle(html));
          const nodes = nextDoc.content.map((node) => view.state.schema.nodeFromJSON(node));
          view.dispatch(view.state.tr.replaceSelection(new Slice(Fragment.fromArray(nodes), 0, 0)));
          return true;
        },
      },
      onUpdate: ({ editor: currentEditor }) => {
        onChangeArticle(tiptapDocToAst(currentEditor.getJSON() as TiptapDoc, articleRef.current));
      },
    },
    []
  );

  useEffect(() => {
    articleRef.current = article;
  }, [article]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) {
      return;
    }

    editor.commands.setContent(astToTiptapDoc(article), { emitUpdate: false });
  }, [editor, externalVersion]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) {
      return;
    }

    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  function insertImageGrid() {
    if (!editor || editor.isDestroyed) {
      return;
    }

    editor.chain().focus().insertImageGrid({ layout: "two" }).run();
  }

  function insertTable() {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }

  function insertImageFile() {
    fileInputRef.current?.click();
  }

  return (
    <div
      className="tiptap-drop-zone"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onInsertImageFiles(event.dataTransfer.files);
      }}
      onPaste={(event) => {
        const hasImage = Array.from(event.clipboardData.files).some(isSupportedImageFile);
        if (hasImage) {
          event.preventDefault();
          onInsertImageFiles(event.clipboardData.files);
        }
      }}
    >
      <div className="editor-toolbar">
        <div className="ribbon-group">
          <button type="button" title="撤销 Ctrl+Z" disabled={!editor?.can().undo()} onClick={() => editor?.chain().focus().undo().run()}>
            <Undo2 size={16} />
          </button>
          <button type="button" title="重做 Ctrl+Y" disabled={!editor?.can().redo()} onClick={() => editor?.chain().focus().redo().run()}>
            <Redo2 size={16} />
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
        </div>
        <span className="ribbon-divider" />
        <div className="ribbon-group">
          <button className={editor?.isActive("heading", { level: 2 }) ? "active" : ""} type="button" title="小标题" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
            <Heading2 size={16} />
          </button>
          <button className={editor?.isActive("blockquote") ? "active" : ""} type="button" title="引用/金句" onClick={() => editor?.chain().focus().toggleBlockquote().run()}>
            <Quote size={16} />
          </button>
          <button className={editor?.isActive("bulletList") ? "active" : ""} type="button" title="无序列表" onClick={() => editor?.chain().focus().toggleBulletList().run()}>
            <List size={16} />
          </button>
          <button className={editor?.isActive("orderedList") ? "active" : ""} type="button" title="有序列表" onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
            <ListOrdered size={16} />
          </button>
        </div>
        <span className="ribbon-divider" />
        <div className="ribbon-group">
          <button type="button" title="分隔线" onClick={() => editor?.chain().focus().setHorizontalRule().run()}>
            <Minus size={16} />
          </button>
          <button type="button" title="表格" onClick={insertTable}>
            <Table2 size={16} />
          </button>
          <button type="button" title="图片" onClick={insertImageFile}>
            <Image size={16} />
          </button>
          <button type="button" title="插入多图" onClick={insertImageGrid}>
            <LayoutGrid size={16} />
          </button>
        </div>
        <input
          ref={fileInputRef}
          className="hidden-file-input"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => {
            if (event.target.files) {
              onInsertImageFiles(event.target.files);
              event.target.value = "";
            }
          }}
        />
        <TableTools editor={editor} />
        <span className="ribbon-spacer" />
        {onCopyToLayout ? (
          <button className="toolbar-primary" type="button" onClick={onCopyToLayout}>
            复制到排版台
          </button>
        ) : null}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
