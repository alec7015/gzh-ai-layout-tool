import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  Check,
  Clipboard,
  FileText,
  Monitor,
  Moon,
  Palette,
  Save,
  Settings,
  Sparkles,
  Smartphone,
  Tablet,
  Type,
} from "lucide-react";
import { recommendLayout } from "./domain/aiLayout";
import { callChatCompletionsJson, isTauriRuntime } from "./domain/aiClient";
import { buildLayoutRequest, coerceLayoutRecommendation } from "./domain/aiLayoutSchema";
import {
  buildWritingRequest,
  generateDraftLocally,
  rewriteSelectionLocally,
  suggestTitles,
  type RewriteMode,
} from "./domain/aiWriting";
import {
  loadAiSettings,
  maskApiKey,
  saveAiSettings,
  type AiSettings,
} from "./domain/aiSettings";
import { createCustomStyle, loadCustomStyles, saveCustomStyles } from "./domain/customStyles";
import {
  astToPlainText,
  createSampleArticle,
  plainTextToAst,
  saveDraft,
} from "./domain/draftStore";
import {
  createDraft,
  createVersionSnapshot,
  deleteDraft,
  getCurrentDraft,
  loadDraftLibrary,
  restoreVersion,
  saveDraftLibrary,
  selectDraft,
  updateCurrentDraftArticle,
} from "./domain/draftLibrary";
import { copyWechatHtml } from "./domain/clipboard";
import {
  appendImageBlock,
  isSupportedImageFile,
  readImageFileAsDataUrl,
} from "./domain/imageAssets";
import { clearBlockOverrides, getBlockLabel, setBlockOverride } from "./domain/blockOverrides";
import { createFeedback, type Feedback } from "./domain/feedback";
import { mergeStylePreset } from "./domain/styleEngine";
import { defaultStylePreset, stylePresets } from "./domain/stylePresets";
import type { ArticleAst, LayoutRecommendation, StyleOverrides } from "./domain/types";
import { renderWechatHtml } from "./domain/wechatRenderer";

type Workspace = "writer" | "layout";
type PreviewDevice = "phone" | "tablet" | "desktop";

const storage = typeof window === "undefined" ? undefined : window.localStorage;
const WriterEditor = lazy(() => import("./components/WriterEditor"));

export default function App() {
  const [workspace, setWorkspace] = useState<Workspace>("layout");
  const [draftLibrary, setDraftLibrary] = useState(() => loadDraftLibrary(storage));
  const [article, setArticle] = useState<ArticleAst>(() => getCurrentDraft(loadDraftLibrary(storage)).article);
  const [draftText, setDraftText] = useState(() =>
    astToPlainText(getCurrentDraft(loadDraftLibrary(storage)).article)
  );
  const [selectedStyleId, setSelectedStyleId] = useState(defaultStylePreset.id);
  const [recommendation, setRecommendation] = useState<LayoutRecommendation>(() =>
    recommendLayout(createSampleArticle())
  );
  const [userOverrides, setUserOverrides] = useState<StyleOverrides>({});
  const [copied, setCopied] = useState(false);
  const [darkPreview, setDarkPreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("phone");
  const [writingTopic, setWritingTopic] = useState("早起习惯");
  const [writingStyle, setWritingStyle] = useState("清晰实用");
  const [aiSettings, setAiSettings] = useState<AiSettings>(() => loadAiSettings(storage));
  const [customStyles, setCustomStyles] = useState(() => loadCustomStyles(storage));
  const [selectedBlockId, setSelectedBlockId] = useState(
    () => getCurrentDraft(loadDraftLibrary(storage)).article.blocks[1]?.id ?? ""
  );
  const [editorVersion, setEditorVersion] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(() =>
    createFeedback("info", "准备就绪，可以开始写作或排版。")
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLayouting, setIsLayouting] = useState(false);

  const allStylePresets = useMemo(() => [...stylePresets, ...customStyles], [customStyles]);
  const currentDraft = useMemo(() => getCurrentDraft(draftLibrary), [draftLibrary]);
  const basePreset =
    allStylePresets.find((preset) => preset.id === selectedStyleId) ?? defaultStylePreset;
  const mergedPreset = useMemo(
    () => mergeStylePreset(basePreset, recommendation.overrides, userOverrides),
    [basePreset, recommendation.overrides, userOverrides]
  );
  const html = useMemo(() => renderWechatHtml(article, mergedPreset), [article, mergedPreset]);
  const wordCount = useMemo(() => astToPlainText(article).replace(/\s/g, "").length, [article]);

  useEffect(() => {
    saveDraft(storage, article);
    setDraftLibrary((current) => updateCurrentDraftArticle(current, article));
  }, [article]);

  useEffect(() => {
    saveDraftLibrary(storage, draftLibrary);
  }, [draftLibrary]);

  useEffect(() => {
    saveAiSettings(storage, aiSettings);
  }, [aiSettings]);

  useEffect(() => {
    saveCustomStyles(storage, customStyles);
  }, [customStyles]);

  function handleDraftChange(value: string) {
    setDraftText(value);
    setArticle(plainTextToAst(value));
  }

  function handleArticleChange(nextArticle: ArticleAst) {
    setArticle(nextArticle);
    setDraftText(astToPlainText(nextArticle));
  }

  function openArticle(nextArticle: ArticleAst) {
    setArticle(nextArticle);
    setDraftText(astToPlainText(nextArticle));
    setSelectedBlockId(nextArticle.blocks[1]?.id ?? nextArticle.blocks[0]?.id ?? "");
    setEditorVersion((version) => version + 1);
  }

  function createNewDraft() {
    const library = createDraft(draftLibrary, createSampleArticle());
    setDraftLibrary(library);
    openArticle(getCurrentDraft(library).article);
    setFeedback(createFeedback("success", "已创建新草稿。"));
  }

  function switchDraft(draftId: string) {
    const library = selectDraft(draftLibrary, draftId);
    setDraftLibrary(library);
    openArticle(getCurrentDraft(library).article);
    setFeedback(createFeedback("info", "已切换草稿。"));
  }

  function removeDraft(draftId: string) {
    const library = deleteDraft(draftLibrary, draftId);
    setDraftLibrary(library);
    openArticle(getCurrentDraft(library).article);
    setFeedback(createFeedback("success", "已删除草稿。"));
  }

  function saveCurrentVersion(reason = "手动保存") {
    setDraftLibrary((current) => createVersionSnapshot(updateCurrentDraftArticle(current, article), reason));
    setFeedback(createFeedback("success", "已保存当前版本。"));
  }

  function restoreDraftVersion(versionId: string) {
    const library = restoreVersion(draftLibrary, versionId);
    setDraftLibrary(library);
    openArticle(getCurrentDraft(library).article);
    setFeedback(createFeedback("success", "已恢复历史版本。"));
  }

  function enterLayout() {
    setDraftLibrary((current) => createVersionSnapshot(updateCurrentDraftArticle(current, article), "去排版"));
    setWorkspace("layout");
  }

  function describeAiFallback(aiSucceeded: boolean, kind: "写作" | "排版"): string {
    if (aiSucceeded) {
      return kind === "写作" ? "已根据模型生成草稿。" : "已根据模型建议完成排版。";
    }
    if (!aiSettings.apiKey.trim()) {
      return `未填写 API Key，已用本地规则${kind}。可在上方「模型设置」填入密钥。`;
    }
    if (!isTauriRuntime()) {
      return `网页预览无法直连模型（浏览器 CORS 限制），已用本地规则${kind}。请用桌面版体验真实 AI。`;
    }
    return `模型调用失败，已用本地规则${kind}。请检查接口地址、模型名与账户额度。`;
  }

  async function generateArticle() {
    if (isGenerating) {
      return;
    }
    setIsGenerating(true);
    setWorkspace("writer");
    setFeedback(createFeedback("info", "正在生成草稿…"));
    try {
      const aiArticle = await callChatCompletionsJson<ArticleAst>(
        aiSettings,
        buildWritingRequest({ topic: writingTopic, style: writingStyle, words: 900 })
      );
      const nextArticle = aiArticle ?? generateDraftLocally(writingTopic, writingStyle);
      setArticle(nextArticle);
      setDraftText(astToPlainText(nextArticle));
      setEditorVersion((version) => version + 1);
      setFeedback(
        createFeedback(aiArticle ? "success" : "info", describeAiFallback(Boolean(aiArticle), "写作"))
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function rewriteDraft(mode: RewriteMode) {
    const rewritten = rewriteSelectionLocally(draftText, mode);
    handleDraftChange(rewritten);
    setEditorVersion((version) => version + 1);
  }

  function applyTitleSuggestion() {
    const nextTitle = suggestTitles(article.meta.title || writingTopic, draftText)[0];
    const lines = draftText.split(/\r?\n/);
    lines[0] = nextTitle;
    handleDraftChange(lines.join("\n"));
    setEditorVersion((version) => version + 1);
  }

  function updateAiSettings(next: Partial<AiSettings>) {
    setAiSettings((current) => ({ ...current, ...next }));
  }

  async function insertImageFiles(files: FileList | File[]) {
    const file = Array.from(files).find(isSupportedImageFile);
    if (!file) {
      setFeedback(createFeedback("error", "没有可导入的图片。"));
      return;
    }

    const src = await readImageFileAsDataUrl(file);
    const nextArticle = appendImageBlock(article, src, file.name.replace(/\.[^.]+$/, ""));
    setArticle(nextArticle);
    setDraftText(astToPlainText(nextArticle));
    setEditorVersion((version) => version + 1);
    setFeedback(createFeedback("success", "图片已加入草稿。"));
  }

  function saveCurrentStyle() {
    const custom = createCustomStyle(mergedPreset, `${mergedPreset.name} 调整版`);
    setCustomStyles((current) => [...current, custom]);
    setSelectedStyleId(custom.id);
    setFeedback(createFeedback("success", "已保存为我的版式。"));
  }

  function setSelectedBlockStyle(key: string, value: string) {
    setArticle((current) => setBlockOverride(current, selectedBlockId, key, value));
  }

  function clearSelectedBlockStyle() {
    setArticle((current) => clearBlockOverrides(current, selectedBlockId));
  }

  async function runSmartLayout() {
    if (isLayouting) {
      return;
    }
    setIsLayouting(true);
    setWorkspace("layout"); // 立即跳到排版台，让智能排版结果可见
    setFeedback(createFeedback("info", "正在智能排版…"));
    try {
      const aiRecommendation = await callChatCompletionsJson<unknown>(
        aiSettings,
        buildLayoutRequest(article)
      );
      const coerced = coerceLayoutRecommendation(aiRecommendation);
      const next = coerced ?? recommendLayout(article);
      setRecommendation(next);
      setSelectedStyleId(next.styleId);
      setFeedback(
        createFeedback(coerced ? "success" : "info", describeAiFallback(Boolean(coerced), "排版"))
      );
    } finally {
      setIsLayouting(false);
    }
  }

  async function copyHtml() {
    setCopied(false);
    try {
      await copyWechatHtml(html, astToPlainText(article));
      setCopied(true);
      setFeedback(createFeedback("success", "已复制 HTML，可粘贴到公众号。"));
    } catch {
      setFeedback(createFeedback("error", "复制失败，请重试或手动复制导出 HTML。"));
    }
  }

  function setThemeColor(color: string) {
    setUserOverrides((current) => ({ ...current, "palette.primary": color }));
  }

  function setBodySize(size: string) {
    setUserOverrides((current) => ({ ...current, "typography.bodySize": size }));
  }

  function setParagraphGap(gap: string) {
    setUserOverrides((current) => ({ ...current, "rhythm.paragraphGap": gap }));
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">微</div>
          <div>
            <strong>{article.meta.title}</strong>
            <span>
              已保存 · {wordCount} 字 · {recommendation.reason}
            </span>
          </div>
        </div>

        <div className="topbar-actions">
          <nav className="workspace-tabs" aria-label="工作台">
            <button
              className={workspace === "writer" ? "tab active" : "tab"}
              onClick={() => setWorkspace("writer")}
            >
              写作台
            </button>
            <button
              className={workspace === "layout" ? "tab active" : "tab"}
              onClick={enterLayout}
            >
              排版台
            </button>
          </nav>
          <button className="ghost-button" onClick={() => setWorkspace("writer")}>
            <Settings size={16} />
            模型设置
          </button>
          <button
            className="ghost-button"
            onClick={() => void runSmartLayout()}
            disabled={isLayouting}
          >
            <Sparkles size={16} />
            {isLayouting ? "排版中…" : "AI 智能排版"}
          </button>
          <button className="primary-button" onClick={copyHtml}>
            {copied ? <Check size={16} /> : <Clipboard size={16} />}
            复制到公众号
          </button>
        </div>
      </header>
      <div className={`feedback-bar copy-status ${feedback.tone}`} role="status">
        {feedback.message}
      </div>

      {workspace === "writer" ? (
        <main className="writer-screen">
          <aside className="writer-panel">
            <section className="model-settings-section">
              <h2>模型设置</h2>
              <p className="model-settings-hint">
                桌面版可直连模型；网页预览受浏览器 CORS 限制，AI 会自动回退为本地规则。
              </p>
              <label className="writer-field">
                接口地址
                <input
                  value={aiSettings.baseUrl}
                  onChange={(event) => updateAiSettings({ baseUrl: event.target.value })}
                />
              </label>
              <label className="writer-field">
                模型
                <input
                  value={aiSettings.model}
                  onChange={(event) => updateAiSettings({ model: event.target.value })}
                />
              </label>
              <label className="writer-field">
                API Key
                <input
                  type="password"
                  placeholder={maskApiKey(aiSettings.apiKey)}
                  value={aiSettings.apiKey}
                  onChange={(event) => updateAiSettings({ apiKey: event.target.value })}
                />
              </label>
            </section>
            <section>
              <h2>草稿列表</h2>
              <div className="draft-list">
                {draftLibrary.drafts.map((draft) => (
                  <div className={draft.id === draftLibrary.currentDraftId ? "draft-row active" : "draft-row"} key={draft.id}>
                    <button onClick={() => switchDraft(draft.id)}>
                      <strong>{draft.title}</strong>
                      <span>{new Date(draft.updatedAt).toLocaleString()}</span>
                    </button>
                    <button aria-label={`删除 ${draft.title}`} onClick={() => removeDraft(draft.id)}>
                      删除
                    </button>
                  </div>
                ))}
              </div>
              <button className="panel-action" onClick={createNewDraft}>
                新建草稿
              </button>
            </section>
            <section>
              <h2>AI 写作</h2>
              <p>输入主题或大纲后，先用本地规则生成纯内容 AST；接口配置会保存在本机。</p>
              <label className="writer-field">
                主题
                <input
                  value={writingTopic}
                  onChange={(event) => setWritingTopic(event.target.value)}
                />
              </label>
              <label className="writer-field">
                风格
                <select
                  value={writingStyle}
                  onChange={(event) => setWritingStyle(event.target.value)}
                >
                  <option value="清晰实用">清晰实用</option>
                  <option value="温柔走心">温柔走心</option>
                  <option value="克制专业">克制专业</option>
                  <option value="轻松友好">轻松友好</option>
                </select>
              </label>
              <button
                className="panel-action"
                onClick={() => void generateArticle()}
                disabled={isGenerating}
              >
                <Sparkles size={16} />
                {isGenerating ? "生成中…" : "生成一篇干净稿"}
              </button>
            </section>
            <section>
              <h2>内容操作</h2>
              <div className="action-list">
                <button onClick={() => rewriteDraft("润色")}>润色</button>
                <button onClick={() => rewriteDraft("扩写")}>扩写</button>
                <button onClick={() => rewriteDraft("精简")}>精简</button>
                <button onClick={applyTitleSuggestion}>起标题</button>
              </div>
            </section>
          </aside>
          <section className="writing-area">
            <Suspense fallback={<div className="editor-loading">正在打开写作台...</div>}>
              <WriterEditor
                article={article}
                externalVersion={editorVersion}
                onChangeArticle={handleArticleChange}
                onInsertImageFiles={(files) => void insertImageFiles(files)}
                isSupportedImageFile={isSupportedImageFile}
              />
            </Suspense>
          </section>
          <aside className="writer-meta">
            <h2>内容 AST</h2>
            <p>写作台只保留标题、正文、金句、列表等结构，不带任何视觉样式。</p>
            <button className="primary-button" onClick={enterLayout}>
              去排版
            </button>
            <button className="panel-action" onClick={() => saveCurrentVersion()}>
              保存版本
            </button>
            <section className="version-history">
              <h2>版本历史</h2>
              {currentDraft.versions.length === 0 ? (
                <p>暂无历史版本。</p>
              ) : (
                currentDraft.versions.map((version) => (
                  <button key={version.id} onClick={() => restoreDraftVersion(version.id)}>
                    <strong>{version.reason}</strong>
                    <span>{new Date(version.createdAt).toLocaleString()}</span>
                    <em>恢复版本</em>
                  </button>
                ))
              )}
            </section>
          </aside>
        </main>
      ) : (
        <main className="layout-screen">
          <aside className="style-library">
            <div className="section-title">
              <Palette size={16} />
              版式库
            </div>
            <article className="recommend-card">
              <span>AI 推荐</span>
              <strong>{allStylePresets.find((item) => item.id === recommendation.styleId)?.name}</strong>
              <p>{recommendation.reason}</p>
              <button onClick={() => void runSmartLayout()}>重新分析</button>
            </article>
            <div className="preset-grid">
              {allStylePresets.map((preset) => (
                <button
                  className={preset.id === selectedStyleId ? "preset-card selected" : "preset-card"}
                  key={preset.id}
                  onClick={() => setSelectedStyleId(preset.id)}
                >
                  <span
                    className="preset-thumb"
                    style={{
                      background: `linear-gradient(135deg, ${preset.palette.secondary}, #fff)`,
                      borderColor: preset.palette.primary,
                    }}
                  >
                    <i style={{ background: preset.palette.primary }} />
                    <b />
                    <em />
                  </span>
                  <strong>{preset.name}</strong>
                  <small>{preset.moods.join(" / ")}</small>
                </button>
              ))}
            </div>
          </aside>

          <section className="design-canvas">
            <div className="canvas-toolbar">
              <span>
                <FileText size={16} />
                所见即所得版面
              </span>
              <button onClick={() => setUserOverrides({})}>恢复默认</button>
            </div>
            <article className="wechat-paper" dangerouslySetInnerHTML={{ __html: html }} />
          </section>

          <aside className="preview-panel">
            <div className="phone-header">
              <strong>手机预览</strong>
              <button onClick={() => setDarkPreview((value) => !value)}>
                <Moon size={15} />
                {darkPreview ? "暗色" : "明色"}
              </button>
            </div>
            <div className="device-switch" aria-label="预览设备">
              <button className={previewDevice === "phone" ? "active" : ""} onClick={() => setPreviewDevice("phone")}>
                <Smartphone size={15} />
                手机
              </button>
              <button className={previewDevice === "tablet" ? "active" : ""} onClick={() => setPreviewDevice("tablet")}>
                <Tablet size={15} />
                平板
              </button>
              <button className={previewDevice === "desktop" ? "active" : ""} onClick={() => setPreviewDevice("desktop")}>
                <Monitor size={15} />
                桌面
              </button>
            </div>
            <div className={`device-frame ${previewDevice}${darkPreview ? " dark" : ""}`}>
              <div className="device-screen" dangerouslySetInnerHTML={{ __html: html }} />
            </div>

            <section className="inspector">
              <div className="section-title">
                <Type size={16} />
                微调面板
              </div>
              <label>
                主题色
                <input
                  type="color"
                  value={String(mergedPreset.palette.primary)}
                  onChange={(event) => setThemeColor(event.target.value)}
                />
              </label>
              <label>
                正文字号
                <select
                  value={String(mergedPreset.typography.bodySize)}
                  onChange={(event) => setBodySize(event.target.value)}
                >
                  <option value="14px">14px</option>
                  <option value="15px">15px</option>
                  <option value="16px">16px</option>
                  <option value="17px">17px</option>
                </select>
              </label>
              <label>
                段间距
                <select
                  value={String(mergedPreset.rhythm.paragraphGap)}
                  onChange={(event) => setParagraphGap(event.target.value)}
                >
                  <option value="14px">紧凑</option>
                  <option value="16px">标准</option>
                  <option value="20px">舒展</option>
                  <option value="22px">留白</option>
                </select>
              </label>
              <div className="inspector-divider" />
              <label>
                内容块
                <select
                  value={selectedBlockId}
                  onChange={(event) => setSelectedBlockId(event.target.value)}
                >
                  {article.blocks.map((block) => (
                    <option key={block.id} value={block.id}>
                      {getBlockLabel(block)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                块文字色
                <input
                  type="color"
                  value="#0F766E"
                  onChange={(event) => setSelectedBlockStyle("color", event.target.value)}
                />
              </label>
              <label>
                块背景
                <input
                  type="color"
                  value="#FFF7ED"
                  onChange={(event) => setSelectedBlockStyle("background", event.target.value)}
                />
              </label>
              <label>
                块对齐
                <select onChange={(event) => setSelectedBlockStyle("text-align", event.target.value)}>
                  <option value="">默认</option>
                  <option value="left">左对齐</option>
                  <option value="center">居中</option>
                </select>
              </label>
              <button className="secondary-action" onClick={clearSelectedBlockStyle}>
                恢复当前块
              </button>
              <button className="panel-action" onClick={saveCurrentStyle}>
                <Save size={16} />
                存为我的版式
              </button>
            </section>
          </aside>
        </main>
      )}
    </div>
  );
}
