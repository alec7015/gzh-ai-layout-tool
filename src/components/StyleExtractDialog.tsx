import { useMemo, useState, type ClipboardEvent } from "react";
import { callChatCompletionsJson } from "../domain/aiClient";
import type { AiSettings } from "../domain/aiSettings";
import { fetchArticleHtml } from "../domain/articleFetch";
import { renderWechatHtml } from "../domain/wechatRenderer";
import { extractStyleStats } from "../domain/styleExtract";
import {
  buildStyleTransferRequest,
  coerceExtractedPreset,
  mergeExtractedPatch,
  statsToPreset,
} from "../domain/styleTransfer";
import type { ArticleAst, StylePreset } from "../domain/types";

interface StyleExtractDialogProps {
  open: boolean;
  article: ArticleAst;
  aiSettings: AiSettings;
  onApply(preset: StylePreset): void;
  onSave(preset: StylePreset): void;
  onClose(): void;
}

type StatusTone = "info" | "success" | "error";

export function StyleExtractDialog({
  open,
  article,
  aiSettings,
  onApply,
  onSave,
  onClose,
}: StyleExtractDialogProps) {
  const [url, setUrl] = useState("");
  const [pastedHtml, setPastedHtml] = useState("");
  const [preset, setPreset] = useState<StylePreset | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: StatusTone; message: string }>({
    tone: "info",
    message: "可粘贴公众号链接，或在富文本框中 Ctrl+V。",
  });
  const previewHtml = useMemo(
    () => (preset ? renderWechatHtml(article, preset, { includePlaceholders: true }) : ""),
    [article, preset]
  );

  if (!open) {
    return null;
  }

  async function extractFromHtml(html: string, source: string) {
    setBusy(true);
    setStatus({ tone: "info", message: "正在分析版式参数…" });
    try {
      const stats = extractStyleStats(html);
      let nextPreset = statsToPreset(stats);
      if (aiSettings.apiKey.trim()) {
        const result = await callChatCompletionsJson<unknown>(
          aiSettings,
          buildStyleTransferRequest(stats)
        );
        if (result.ok) {
          nextPreset = mergeExtractedPatch(nextPreset, coerceExtractedPreset(result.data));
        }
      }
      setPreset(nextPreset);
      setStatus({ tone: "success", message: `已从${source}提取版式参数。` });
    } catch {
      setStatus({ tone: "error", message: "版式提取失败，请换一篇文章或改用富文本粘贴。" });
    } finally {
      setBusy(false);
    }
  }

  async function extractFromUrl() {
    setBusy(true);
    setStatus({ tone: "info", message: "正在抓取文章 HTML…" });
    const result = await fetchArticleHtml(url);
    setBusy(false);
    if (!result.ok) {
      setStatus({ tone: "error", message: result.reason });
      return;
    }
    await extractFromHtml(result.html, "链接");
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const html = event.clipboardData.getData("text/html");
    if (html) {
      event.preventDefault();
      setPastedHtml(html);
      void extractFromHtml(html, "富文本粘贴");
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="style-extract-dialog" role="dialog" aria-modal="true" aria-label="从文章提取版式">
        <header>
          <div>
            <strong>从文章提取版式</strong>
            <span>只提取颜色、间距和形态参数，不复制原文内容或图片素材。</span>
          </div>
          <button type="button" onClick={onClose}>关闭</button>
        </header>

        <div className="style-extract-grid">
          <div className="style-extract-inputs">
            <label>
              公众号文章链接
              <input
                value={url}
                placeholder="https://mp.weixin.qq.com/s/..."
                onChange={(event) => setUrl(event.target.value)}
              />
            </label>
            <button type="button" disabled={busy || !url.trim()} onClick={() => void extractFromUrl()}>
              {busy ? "提取中…" : "提取链接版式"}
            </button>
            <label>
              富文本粘贴捕获框
              <textarea
                rows={8}
                value={pastedHtml ? "已捕获富文本 HTML，可重新粘贴覆盖。" : ""}
                placeholder="在这里 Ctrl+V 粘贴公众号正文区域"
                onPaste={handlePaste}
                onChange={() => undefined}
              />
            </label>
            <button
              type="button"
              disabled={busy || !pastedHtml}
              onClick={() => void extractFromHtml(pastedHtml, "富文本")}
            >
              重新分析粘贴内容
            </button>
            <p className={`extract-status ${status.tone}`}>{status.message}</p>
          </div>

          <div className="style-extract-preview">
            <strong>{preset ? preset.name : "提取后显示缩略预览"}</strong>
            <div className="plan-thumb large">
              <span
                className="plan-thumb-inner"
                dangerouslySetInnerHTML={{ __html: previewHtml || "<section>暂无预览</section>" }}
              />
            </div>
            <div className="style-extract-actions">
              <button type="button" disabled={!preset} onClick={() => preset && onApply(preset)}>
                直接应用
              </button>
              <button type="button" disabled={!preset} onClick={() => preset && onSave(preset)}>
                保存为我的版式
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
