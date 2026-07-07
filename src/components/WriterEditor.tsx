import { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { BackgroundColor, Color, FontSize, TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import ImageNode from "@tiptap/extension-image";
import { Slice, Fragment } from "@tiptap/pm/model";
import { BlockMeta } from "./BlockMetaExtension";
import { EditorInsertTools, insertImageFilesIntoEditor } from "./EditorInsertTools";
import { ImageGrid } from "./ImageGridExtension";
import { KeywordMark } from "./KeywordMarkExtension";
import { RichTextToolbar } from "./RichTextToolbar";
import { htmlToCleanArticle } from "../domain/magicPaste";
import { isSupportedImageFile } from "../domain/imageAssets";
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
        KeywordMark,
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

  return (
    <div
      className="tiptap-drop-zone"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        void insertImageFilesIntoEditor(editor, event.dataTransfer.files);
      }}
      onPaste={(event) => {
        const hasImage = Array.from(event.clipboardData.files).some(isSupportedImageFile);
        if (hasImage) {
          event.preventDefault();
          void insertImageFilesIntoEditor(editor, event.clipboardData.files);
        }
      }}
    >
      <RichTextToolbar
        editor={editor}
        ariaLabel="写作工具栏"
        className="editor-toolbar"
        slotLeft={<EditorInsertTools editor={editor} />}
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
