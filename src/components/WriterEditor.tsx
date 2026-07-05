import { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { BackgroundColor, Color, FontSize, TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import ImageNode from "@tiptap/extension-image";
import { Slice, Fragment } from "@tiptap/pm/model";
import { Image, LayoutGrid, Minus, Table2 } from "lucide-react";
import { BlockMeta } from "./BlockMetaExtension";
import { ImageGrid } from "./ImageGridExtension";
import { RichTextToolbar } from "./RichTextToolbar";
import { htmlToCleanArticle } from "../domain/magicPaste";
import { isSupportedImageFile, readImageFileAsDataUrl } from "../domain/imageAssets";
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
  onCopyToLayout?: () => void;
  readOnly?: boolean;
}

export default function WriterEditor({
  article,
  externalVersion,
  onChangeArticle,
  onCopyToLayout,
  readOnly = false,
}: WriterEditorProps) {
  const articleRef = useRef(article);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        TextStyle,
        Color,
        FontSize,
        BackgroundColor,
        FontFamily,
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        Table.configure({ resizable: false }),
        TableRow,
        TableHeader,
        TableCell,
        ImageNode.configure({ allowBase64: true }),
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

  async function insertImageFiles(files: FileList | File[]) {
    if (!editor || editor.isDestroyed) {
      return;
    }
    const file = Array.from(files).find(isSupportedImageFile);
    if (!file) {
      return;
    }

    const src = await readImageFileAsDataUrl(file);
    editor
      .chain()
      .focus()
      .setImage({ src, alt: file.name.replace(/\.[^.]+$/, "") })
      .run();
  }

  return (
    <div
      className="tiptap-drop-zone"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        void insertImageFiles(event.dataTransfer.files);
      }}
      onPaste={(event) => {
        const hasImage = Array.from(event.clipboardData.files).some(isSupportedImageFile);
        if (hasImage) {
          event.preventDefault();
          void insertImageFiles(event.clipboardData.files);
        }
      }}
    >
      <RichTextToolbar
        editor={editor}
        ariaLabel="写作工具栏"
        className="editor-toolbar"
        slotLeft={
          <>
            <span className="ribbon-divider" />
            <div className="ribbon-group">
              <button type="button" title="分隔线" onClick={() => editor?.chain().focus().setHorizontalRule().run()}>
                <Minus size={16} />
              </button>
              <button type="button" title="表格" onClick={insertTable}>
                <Table2 size={16} />
              </button>
              <button type="button" title="图片" onClick={() => fileInputRef.current?.click()}>
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
                  void insertImageFiles(event.target.files);
                  event.target.value = "";
                }
              }}
            />
          </>
        }
        slotRight={
          onCopyToLayout ? (
            <button className="toolbar-primary" type="button" onClick={onCopyToLayout}>
              复制到排版台
            </button>
          ) : null
        }
      />
      <EditorContent editor={editor} />
    </div>
  );
}
