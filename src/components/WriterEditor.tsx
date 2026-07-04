import { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { Slice, Fragment } from "@tiptap/pm/model";
import { BlockMeta } from "./BlockMetaExtension";
import { ImageGrid } from "./ImageGridExtension";
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
  }, [article, editor, externalVersion]);

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
        <button type="button" title="小标题" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
          小标题
        </button>
        <button type="button" title="引用/金句" onClick={() => editor?.chain().focus().toggleBlockquote().run()}>
          引用
        </button>
        <button type="button" title="无序列表" onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          列表
        </button>
        <button type="button" title="有序列表" onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
          编号
        </button>
        <button type="button" title="分隔线" onClick={() => editor?.chain().focus().setHorizontalRule().run()}>
          分隔线
        </button>
        <button type="button" title="表格" onClick={insertTable}>
          表格
        </button>
        <button type="button" onClick={insertImageGrid}>
          插入多图
        </button>
        {onCopyToLayout ? (
          <button type="button" onClick={onCopyToLayout}>
            复制到排版台
          </button>
        ) : null}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
