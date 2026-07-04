import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
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
import { SettingsModal } from "./components/SettingsModal";
import { recommendLayout } from "./domain/aiLayout";
import { callChatCompletionsJson, callChatCompletionsText } from "./domain/aiClient";
import { buildLayoutRequest, coerceLayoutRecommendation } from "./domain/aiLayoutSchema";
import {
  buildRewriteRequest,
  buildSmartFormatRequest,
  buildTitleRequest,
  buildWritingRequest,
  coerceMarkdownArticle,
  generateDraftLocally,
  protectArticleImagesForAi,
  rewriteSelectionLocally,
  restoreProtectedImages,
  suggestTitles,
  type RewriteMode,
} from "./domain/aiWriting";
import {
  loadAiSettings,
  saveAiSettings,
  normalizeAiSettings,
  type AiSettings,
} from "./domain/aiSettings";
import { createCustomStyle, loadCustomStyles, saveCustomStyles } from "./domain/customStyles";
import {
  astToMarkdown,
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
type BusyState = null | "writing" | "format" | "layout" | "rewrite";

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
  const [writingWords, setWritingWords] = useState(1000);
  const [writingGenre, setWritingGenre] = useState("干货教程");
  const [writingOutline, setWritingOutline] = useState("");
  const [aiSettings, setAiSettings] = useState<AiSettings>(() => loadAiSettings(storage));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTesting, setSettingsTesting] = useState(false);
  const [settingsTestMessage, setSettingsTestMessage] = useState("可先测试连接，再开始写作。");
  const [customStyles, setCustomStyles] = useState(() => loadCustomStyles(storage));
  const [selectedBlockId, setSelectedBlockId] = useState(
    () => getCurrentDraft(loadDraftLibrary(storage)).article.blocks[1]?.id ?? ""
  );
  const [editorVersion, setEditorVersion] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(() =>
    createFeedback("info", "准备就绪，可以开始写作或排版。")
  );
  const [busy, setBusy] = useState<BusyState>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  function copyToLayout() {
    setDraftLibrary((current) => createVersionSnapshot(updateCurrentDraftArticle(current, article), "去排版"));
    setWorkspace("layout");
  }

  function stopAiTask() {
    abortControllerRef.current?.abort();
  }

  async function generateArticle() {
    if (busy) {
      return;
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setBusy("writing");
    setWorkspace("writer");
    saveCurrentVersion("AI 生成前快照");
    setFeedback(createFeedback("info", "正在生成草稿…"));
    try {
      const result = await callChatCompletionsText(
        aiSettings,
        {
          ...buildWritingRequest({
            topic: writingTopic,
            style: writingStyle,
            words: writingWords,
            genre: writingGenre,
            outline: writingOutline,
          }),
          stream: true,
        },
        undefined,
        { signal: controller.signal }
      );
      if (!result.ok) {
        if (result.code === "aborted") {
          setFeedback(createFeedback("info", result.message));
          return;
        }
        const fallback = generateDraftLocally(writingTopic, writingStyle);
        openArticle(fallback);
        setFeedback(createFeedback("info", `${result.message} 已用本地规则生成草稿。`));
        return;
      }

      const aiArticle = coerceMarkdownArticle(result.data);
      if (!aiArticle) {
        const fallback = generateDraftLocally(writingTopic, writingStyle);
        openArticle(fallback);
        setFeedback(createFeedback("info", "模型返回结构不可用，已用本地规则生成草稿。"));
        return;
      }

      openArticle(aiArticle);
      setFeedback(createFeedback("success", "已根据模型生成草稿。"));
    } finally {
      abortControllerRef.current = null;
      setBusy(null);
    }
  }

  async function runWriterSmartFormat() {
    if (busy) {
      return;
    }

    const controller = new AbortController();
    const protectedArticle = protectArticleImagesForAi(article);
    abortControllerRef.current = controller;
    setBusy("format");
    saveCurrentVersion("AI 智能排版前快照");
    setFeedback(createFeedback("info", "正在结构化排版…"));
    try {
      const result = await callChatCompletionsText(
        aiSettings,
        buildSmartFormatRequest(protectedArticle.markdown),
        undefined,
        { signal: controller.signal }
      );
      if (!result.ok) {
        setFeedback(createFeedback(result.code === "aborted" ? "info" : "error", result.message));
        return;
      }

      const aiArticle = coerceMarkdownArticle(result.data, { allowPlaceholders: true });
      if (!aiArticle) {
        setFeedback(createFeedback("error", "模型返回结构不可用，未修改当前草稿。"));
        return;
      }

      openArticle(restoreProtectedImages(aiArticle, protectedArticle.protectedBlocks));
      setFeedback(createFeedback("success", "已完成结构化排版，可在版本历史回滚。"));
    } finally {
      abortControllerRef.current = null;
      setBusy(null);
    }
  }

  async function rewriteDraft(mode: RewriteMode) {
    if (busy) {
      return;
    }

    const protectedArticle = protectArticleImagesForAi(article);
    setBusy("rewrite");
    saveCurrentVersion(`AI ${mode}前快照`);
    setFeedback(createFeedback("info", `正在${mode}…`));
    try {
      const result = await callChatCompletionsText(aiSettings, buildRewriteRequest(mode, protectedArticle.markdown));
      if (!result.ok) {
        const rewritten = rewriteSelectionLocally(draftText, mode);
        handleDraftChange(rewritten);
        setEditorVersion((version) => version + 1);
        setFeedback(createFeedback("info", `${result.message} 已用本地规则${mode}。`));
        return;
      }

      const aiArticle = coerceMarkdownArticle(result.data, { allowPlaceholders: true });
      if (!aiArticle) {
        setFeedback(createFeedback("error", "模型返回结构不可用，未修改当前草稿。"));
        return;
      }

      openArticle(restoreProtectedImages(aiArticle, protectedArticle.protectedBlocks));
      setFeedback(createFeedback("success", `已完成 AI ${mode}。`));
    } finally {
      setBusy(null);
    }
  }

  async function applyTitleSuggestion() {
    if (busy) {
      return;
    }

    setBusy("rewrite");
    saveCurrentVersion("AI 起标题前快照");
    setFeedback(createFeedback("info", "正在起标题…"));
    try {
      const result = await callChatCompletionsText(aiSettings, buildTitleRequest(astToMarkdown(article)));
      const nextTitle = result.ok ? parseFirstTitle(result.data) : suggestTitles(article.meta.title || writingTopic, draftText)[0];
      setArticle((current) => updateArticleTitle(current, nextTitle));
      setDraftText((current) => {
        const lines = current.split(/\r?\n/);
        lines[0] = nextTitle;
        return lines.join("\n");
      });
      setEditorVersion((version) => version + 1);
      setFeedback(
        createFeedback(result.ok ? "success" : "info", result.ok ? "已生成标题。" : `${result.message} 已用本地规则起标题。`)
      );
    } finally {
      setBusy(null);
    }
  }

  function updateAiSettings(next: Partial<AiSettings>) {
    setAiSettings((current) => normalizeAiSettings({ ...current, ...next }));
  }

  async function testModelConnection() {
    if (settingsTesting) {
      return;
    }

    setSettingsTesting(true);
    setSettingsTestMessage("正在测试连接…");
    try {
      const result = await callChatCompletionsText(aiSettings, {
        model: "openai-compatible-chat-model",
        temperature: 0,
        max_tokens: 64,
        messages: [
          { role: "system", content: "只回复 ok。" },
          { role: "user", content: "请回复 ok" },
        ],
      });
      setSettingsTestMessage(result.ok ? "连接成功。" : result.message);
    } finally {
      setSettingsTesting(false);
    }
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
    if (busy) {
      return;
    }
    setBusy("layout");
    setFeedback(createFeedback("info", "正在分析版式…"));
    try {
      const result = await callChatCompletionsJson<unknown>(
        aiSettings,
        buildLayoutRequest(article)
      );
      const coerced = result.ok ? coerceLayoutRecommendation(result.data) : null;
      const next = coerced ?? recommendLayout(article);
      setRecommendation(next);
      setSelectedStyleId(next.styleId);
      if (coerced) {
        setFeedback(createFeedback("success", "已根据模型建议完成版式推荐。"));
      } else if (result.ok) {
        setFeedback(createFeedback("info", "模型返回版式不可用，已使用本地规则推荐。"));
      } else {
        setFeedback(createFeedback("info", `${result.message} 已使用本地规则推荐版式。`));
      }
    } finally {
      setBusy(null);
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
              onClick={copyToLayout}
            >
              排版台
            </button>
          </nav>
          <button className="ghost-button" onClick={() => setSettingsOpen(true)}>
            <Settings size={16} />
            模型设置
          </button>
          <button
            className="ghost-button"
            onClick={() => void (workspace === "writer" ? runWriterSmartFormat() : runSmartLayout())}
            disabled={busy !== null}
          >
            <Sparkles size={16} />
            {busy === "format" || busy === "layout" ? (workspace === "writer" ? "排版中…" : "分析中…") : "AI 智能排版"}
          </button>
          <button className="primary-button" onClick={copyHtml}>
            {copied ? <Check size={16} /> : <Clipboard size={16} />}
            复制到公众号
          </button>
        </div>
      </header>
      <div className={`feedback-bar copy-status ${feedback.tone}`} role="status">
        {feedback.message}
        {busy ? (
          <button className="feedback-action" onClick={stopAiTask} type="button">
            停止生成
          </button>
        ) : null}
      </div>
      {settingsOpen ? (
        <SettingsModal
          settings={aiSettings}
          testing={settingsTesting}
          testMessage={settingsTestMessage}
          onChange={(next) => updateAiSettings(next)}
          onClose={() => setSettingsOpen(false)}
          onTest={() => void testModelConnection()}
        />
      ) : null}

      {workspace === "writer" ? (
        <main className="writer-screen">
          <aside className="writer-panel">
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
              <p>输入主题和要点后生成 Markdown 草稿；模型配置在顶栏「模型设置」。</p>
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
              <label className="writer-field">
                目标字数
                <select
                  value={writingWords}
                  onChange={(event) => setWritingWords(Number(event.target.value))}
                >
                  <option value={600}>600</option>
                  <option value={1000}>1000</option>
                  <option value={1500}>1500</option>
                  <option value={2500}>2500</option>
                </select>
              </label>
              <label className="writer-field">
                文体
                <select
                  value={writingGenre}
                  onChange={(event) => setWritingGenre(event.target.value)}
                >
                  <option value="清单体">清单体</option>
                  <option value="观点文">观点文</option>
                  <option value="干货教程">干货教程</option>
                  <option value="故事叙述">故事叙述</option>
                  <option value="资讯速览">资讯速览</option>
                </select>
              </label>
              <label className="writer-field">
                要点/大纲
                <textarea
                  rows={3}
                  value={writingOutline}
                  onChange={(event) => setWritingOutline(event.target.value)}
                />
              </label>
              <button
                className="panel-action"
                onClick={() => void generateArticle()}
                disabled={busy !== null}
              >
                <Sparkles size={16} />
                {busy === "writing" ? "生成中…" : "生成一篇干净稿"}
              </button>
            </section>
            <section>
              <h2>内容操作</h2>
              <div className="action-list">
                <button disabled={busy !== null} onClick={() => void rewriteDraft("润色")}>润色</button>
                <button disabled={busy !== null} onClick={() => void rewriteDraft("扩写")}>扩写</button>
                <button disabled={busy !== null} onClick={() => void rewriteDraft("精简")}>精简</button>
                <button disabled={busy !== null} onClick={() => void applyTitleSuggestion()}>起标题</button>
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
                onCopyToLayout={copyToLayout}
              />
            </Suspense>
          </section>
          <aside className="writer-meta">
            <h2>内容 AST</h2>
            <p>写作台只保留标题、正文、金句、列表等结构，不带任何视觉样式。</p>
            <button className="panel-action" disabled={busy !== null} onClick={() => void runWriterSmartFormat()}>
              <Sparkles size={16} />
              {busy === "format" ? "排版中…" : "AI 智能排版"}
            </button>
            <button className="primary-button" onClick={copyToLayout}>
              复制到排版台
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
              <button disabled={busy !== null} onClick={() => void runSmartLayout()}>
                {busy === "layout" ? "分析中…" : "AI智能排版·重新分析"}
              </button>
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

function parseFirstTitle(input: string): string {
  return (
    input
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, "").replace(/^#+\s*/, "").trim())
      .find(Boolean) ?? "未命名草稿"
  );
}

function updateArticleTitle(article: ArticleAst, title: string): ArticleAst {
  return {
    ...article,
    meta: { ...article.meta, title },
    blocks: article.blocks.map((block, index) =>
      index === 0 && block.type === "title" ? { ...block, text: title } : block
    ),
  };
}
