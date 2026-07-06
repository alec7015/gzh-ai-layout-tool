import { useRef } from "react";
import type { Editor } from "@tiptap/core";
import { Image, LayoutGrid, Minus, Table2 } from "lucide-react";
import { isSupportedImageFile } from "../domain/imageAssets";
import { compressImageFile } from "../domain/imageCompress";

interface EditorInsertToolsProps {
  editor: Editor | null;
}

export function EditorInsertTools({ editor }: EditorInsertToolsProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <span className="ribbon-divider" />
      <div className="ribbon-group">
        <button type="button" title="分隔线" onClick={() => editor?.chain().focus().setHorizontalRule().run()}>
          <Minus size={16} />
        </button>
        <button type="button" title="表格" onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
          <Table2 size={16} />
        </button>
        <button type="button" title="图片" onClick={() => fileInputRef.current?.click()}>
          <Image size={16} />
        </button>
        <button type="button" title="插入多图" onClick={() => editor?.chain().focus().insertImageGrid({ layout: "two" }).run()}>
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
            void insertImageFilesIntoEditor(editor, event.target.files);
            event.target.value = "";
          }
        }}
      />
    </>
  );
}

export async function insertImageFilesIntoEditor(editor: Editor | null, files: FileList | File[]) {
  if (!editor || editor.isDestroyed) {
    return;
  }
  const file = Array.from(files).find(isSupportedImageFile);
  if (!file) {
    return;
  }

  const src = await compressImageFile(file);
  editor.chain().focus().setImage({ src, alt: "" }).run();
}
