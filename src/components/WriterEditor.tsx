import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { astToTiptapDoc, tiptapDocToPlainText, type TiptapDoc } from "../domain/tiptapAdapter";
import type { ArticleAst } from "../domain/types";

interface WriterEditorProps {
  article: ArticleAst;
  externalVersion: number;
  onChangeText(text: string): void;
  onInsertImageFiles(files: FileList | File[]): void;
  isSupportedImageFile(file: File): boolean;
}

export default function WriterEditor({
  article,
  externalVersion,
  onChangeText,
  onInsertImageFiles,
  isSupportedImageFile,
}: WriterEditorProps) {
  const editor = useEditor(
    {
      extensions: [StarterKit],
      content: astToTiptapDoc(article),
      editorProps: {
        attributes: { "aria-label": "写作编辑区" },
      },
      onUpdate: ({ editor: currentEditor }) => {
        onChangeText(tiptapDocToPlainText(currentEditor.getJSON() as TiptapDoc));
      },
    },
    []
  );

  useEffect(() => {
    editor?.commands.setContent(astToTiptapDoc(article), { emitUpdate: false });
  }, [article, editor, externalVersion]);

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
      <EditorContent editor={editor} />
    </div>
  );
}
