import { useMemo, useRef, useEffect, useState } from "react";
import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { BackgroundColor, Color, FontSize, TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import ImageNode from "@tiptap/extension-image";
import { Settings } from "lucide-react";
import { callChatCompletionsText } from "../domain/aiClient";
import type { AiSettings } from "../domain/aiSettings";
import { BlockMeta } from "./BlockMetaExtension";
import { EditorInsertTools } from "./EditorInsertTools";
import { ImageGrid } from "./ImageGridExtension";
import { KeywordMark } from "./KeywordMarkExtension";
import { RichTextToolbar } from "./RichTextToolbar";
import { usePopoverDismiss } from "./editorShared";
import { astToTiptapDoc, tiptapDocToAst, type TiptapDoc } from "../domain/tiptapAdapter";
import { presetToEditorCss } from "../domain/presetToEditorCss";
import { buildOrnamentRequest, sanitizeSvg, svgToPngDataUrl } from "../domain/svgOrnament";
import { VARIANT_LABELS, VARIANT_VOCABULARY } from "../domain/stylePresets";
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
    firstLineIndent: string;
    headingVariant: string;
    quoteVariant: string;
    listVariant: string;
    dividerVariant: string;
  };
  onSettingsChange(next: Partial<LayoutEditorProps["settings"]>): void;
  aiSettings: AiSettings;
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
  aiSettings,
}: LayoutEditorProps) {
  const articleRef = useRef(article);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ornamentStatus, setOrnamentStatus] = useState("");
  const [ornamentBusy, setOrnamentBusy] = useState(false);
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

    editor.commands.setContent(astToTiptapDoc(article), { emitUpdate: false });
  }, [editor, externalVersion]);

  usePopoverDismiss(settingsRef, settingsOpen, () => setSettingsOpen(false));

  async function generateOrnament() {
    if (!editor || ornamentBusy) {
      return;
    }
    setOrnamentBusy(true);
    setOrnamentStatus("正在生成装饰图…");
    try {
      const result = await callChatCompletionsText(
        aiSettings,
        buildOrnamentRequest(article.meta.title, preset.palette)
      );
      const rawSvg = result.ok ? result.data : fallbackOrnamentSvg(preset);
      let sanitized = sanitizeSvg(rawSvg);
      if (!sanitized.ok) {
        sanitized = sanitizeSvg(fallbackOrnamentSvg(preset));
        if (!sanitized.ok) {
          setOrnamentStatus(sanitized.reason);
          return;
        }
      }
      const src = await svgToPngDataUrl(sanitized.svg);
      const chain = editor.chain().focus() as ReturnType<Editor["chain"]> & {
        setImage(attrs: { src: string; alt?: string }): { run(): boolean };
      };
      chain.setImage({ src, alt: "" }).run();
      setOrnamentStatus(result.ok ? "已插入装饰图。" : `${result.message} 已插入本地装饰图。`);
    } catch {
      setOrnamentStatus("装饰图生成失败，请稍后重试。");
    } finally {
      setOrnamentBusy(false);
    }
  }

  return (
    <div className="layout-editor">
      <style>{css}</style>
      <RichTextToolbar
        editor={editor}
        ariaLabel="排版工具栏"
        className="layout-editor-toolbar"
        features={{ blockBackground: true, clearBlockStyle: true, blockRoles: true }}
        slotLeft={<EditorInsertTools editor={editor} />}
        slotRight={
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
                <label className="settings-inline">
                  <input
                    type="checkbox"
                    checked={settings.firstLineIndent === "2em"}
                    onChange={(event) => onSettingsChange({ firstLineIndent: event.target.checked ? "2em" : "" })}
                  />
                  正文首行缩进 2 字符
                </label>
                <VariantSelect
                  label="小标题样式"
                  value={settings.headingVariant}
                  variants={VARIANT_VOCABULARY.heading}
                  labels={VARIANT_LABELS.heading}
                  onChange={(headingVariant) => onSettingsChange({ headingVariant })}
                />
                <VariantSelect
                  label="引用样式"
                  value={settings.quoteVariant}
                  variants={VARIANT_VOCABULARY.quote}
                  labels={VARIANT_LABELS.quote}
                  onChange={(quoteVariant) => onSettingsChange({ quoteVariant })}
                />
                <VariantSelect
                  label="列表样式"
                  value={settings.listVariant}
                  variants={VARIANT_VOCABULARY.list}
                  labels={VARIANT_LABELS.list}
                  onChange={(listVariant) => onSettingsChange({ listVariant })}
                />
                <VariantSelect
                  label="分隔线样式"
                  value={settings.dividerVariant}
                  variants={VARIANT_VOCABULARY.divider}
                  labels={VARIANT_LABELS.divider}
                  onChange={(dividerVariant) => onSettingsChange({ dividerVariant })}
                />
                <label>
                  文末引导语
                  <textarea rows={3} value={settings.footerText} onChange={(event) => onSettingsChange({ footerText: event.target.value })} />
                </label>
                <div className="ornament-generator">
                  <button type="button" disabled={ornamentBusy} onClick={() => void generateOrnament()}>
                    {ornamentBusy ? "生成中…" : "AI 生成装饰图"}
                  </button>
                  {ornamentStatus ? <span>{ornamentStatus}</span> : null}
                </div>
                <div className="layout-settings-actions">
                  <button type="button" onClick={onSaveStyle}>存为我的版式</button>
                  <button type="button" onClick={onResetStyle}>恢复默认</button>
                </div>
              </div>
            ) : null}
          </div>
        }
      />
      <div className="layout-editor-paper">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function fallbackOrnamentSvg(preset: StylePreset) {
  return `<svg viewBox="0 0 680 120"><g opacity="0.95"><line x1="80" y1="60" x2="280" y2="60" stroke="${preset.palette.primary}" stroke-width="3" stroke-linecap="round"/><circle cx="340" cy="60" r="18" fill="${preset.palette.secondary}" stroke="${preset.palette.primary}" stroke-width="3"/><line x1="400" y1="60" x2="600" y2="60" stroke="${preset.palette.primary}" stroke-width="3" stroke-linecap="round"/><circle cx="340" cy="60" r="6" fill="${preset.palette.accent}"/></g></svg>`;
}

function VariantSelect<T extends string>({
  label,
  value,
  variants,
  labels,
  onChange,
}: {
  label: string;
  value: string;
  variants: readonly T[];
  labels: Record<T, string>;
  onChange(value: string): void;
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">跟随版式</option>
        {variants.map((variant) => (
          <option key={variant} value={variant}>
            {labels[variant]}
          </option>
        ))}
      </select>
    </label>
  );
}
