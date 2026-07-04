import type { Editor } from "@tiptap/core";

interface TableToolsProps {
  editor: Editor | null;
}

export function TableTools({ editor }: TableToolsProps) {
  if (!editor?.isActive("table")) {
    return null;
  }

  return (
    <>
      <span className="ribbon-divider" />
      <div className="ribbon-group table-tools" aria-label="表格工具">
        <button type="button" title="左插列" onClick={() => editor.chain().focus().addColumnBefore().run()}>
          左列
        </button>
        <button type="button" title="右插列" onClick={() => editor.chain().focus().addColumnAfter().run()}>
          右列
        </button>
        <button type="button" title="删除列" onClick={() => editor.chain().focus().deleteColumn().run()}>
          删列
        </button>
        <button type="button" title="上插行" onClick={() => editor.chain().focus().addRowBefore().run()}>
          上行
        </button>
        <button type="button" title="下插行" onClick={() => editor.chain().focus().addRowAfter().run()}>
          下行
        </button>
        <button type="button" title="删除行" onClick={() => editor.chain().focus().deleteRow().run()}>
          删行
        </button>
        <button type="button" title="表头行" onClick={() => editor.chain().focus().toggleHeaderRow().run()}>
          表头
        </button>
        <button type="button" title="删除表格" onClick={() => editor.chain().focus().deleteTable().run()}>
          删表
        </button>
      </div>
    </>
  );
}
