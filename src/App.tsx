import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  Check,
  Clipboard,
  Moon,
  Palette,
  Settings,
  Sparkles,
  Smartphone,
  Tablet,
} from "lucide-react";
import { EditorBoundary } from "./components/EditorBoundary";
import { SettingsModal } from "./components/SettingsModal";
import { useColumnResize } from "./hooks/useColumnResize";
import { recommendLayout, recommendLayoutPlan } from "./domain/aiLayout";
import { callChatCompletionsJson, callChatCompletionsText } from "./domain/aiClient";
import { buildLayoutPlanRequest, coerceLayoutPlan } from "./domain/aiLayoutSchema";
import {
  buildSmartFormatRequest,
  buildWritingRequest,
  coerceMarkdownArticle,
  generateDraftLocally,
  protectArticleImagesForAi,
  restoreProtectedImages,
} from "./domain/aiWriting";
import {
  loadAiSettings,
  saveAiSettings,
  normalizeAiSettings,
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
  clearAllVersionHistory,
  deleteDraft,
  deleteVersion,
  getCurrentDraft,
  loadDraftLibrary,
  restoreVersion,
  resetDrafts,
  saveDraftLibrary,
  selectDraft,
  updateCurrentDraftArticle,
  updateCurrentDraftLayoutArticle,
} from "./domain/draftLibrary";
import { copyWechatHtml } from "./domain/clipboard";
import { createFeedback, type Feedback } from "./domain/feedback";
import { mergeStylePreset } from "./domain/styleEngine";
import { defaultStylePreset, stylePresets } from "./domain/stylePresets";
import { applyRolesToArticle, hasAnyRole, planToOverrides } from "./domain/layoutPlan";
import { derivePaletteOverrides } from "./domain/paletteDerive";
import type { ArticleAst, LayoutPlan, LayoutRecommendation, StyleOverrides } from "./domain/types";
import { renderWechatHtml } from "./domain/wechatRenderer";

type Workspace = "writer" | "layout";
type PreviewDevice = "phone" | "tablet";
type BusyState = null | "writing" | "format" | "layout";
type LayoutAiStatus =
  | { phase: "idle" }
  | { phase: "running" }
  | { phase: "success" | "fallback" | "error"; message: string; at: number };

const storage = typeof window === "undefined" ? undefined : window.localStorage;
const WriterEditor = lazy(() => import("./components/WriterEditor"));
const LayoutEditor = lazy(() => import("./components/LayoutEditor"));
const previewDefaultWidth = 390;
const previewMinWidth = 300;
const canvasMinWidth = 744;

export default function App() {
  const [workspace, setWorkspace] = useState<Workspace>("layout");
  const [draftLibrary, setDraftLibrary] = useState(() => loadDraftLibrary(storage));
  const [article, setArticle] = useState<ArticleAst>(() => getCurrentDraft(loadDraftLibrary(storage)).article);
  const [layoutArticle, setLayoutArticle] = useState<ArticleAst | null>(
    () => getCurrentDraft(loadDraftLibrary(storage)).layoutArticle ?? null
  );
  const [selectedStyleId, setSelectedStyleId] = useState(defaultStylePreset.id);
  const [recommendation, setRecommendation] = useState<LayoutRecommendation>(() =>
    recommendLayout(createSampleArticle())
  );
  const [planCandidates, setPlanCandidates] = useState<LayoutPlan[]>([]);
  const [activePlanIndex, setActivePlanIndex] = useState<number | null>(null);
  const [userOverrides, setUserOverrides] = useState<StyleOverrides>({});
  const [autoPalette, setAutoPalette] = useState(true);
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
  const [editorVersion, setEditorVersion] = useState(0);
  const [layoutEditorVersion, setLayoutEditorVersion] = useState(0);
  const [layoutAiStatus, setLayoutAiStatus] = useState<LayoutAiStatus>({ phase: "idle" });
  const [feedback, setFeedback] = useState<Feedback>(() =>
    createFeedback("info", "准备就绪，可以开始写作或排版。")
  );
  const [busy, setBusy] = useState<BusyState>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const storageErrorShownRef = useRef(false);
  const layoutScreenRef = useRef<HTMLElement | null>(null);
  const getMaxPreviewWidth = useCallback(() => {
    const totalWidth = Math.max(
      layoutScreenRef.current?.clientWidth ?? 0,
      typeof window === "undefined" ? 0 : window.innerWidth,
      1440
    );
    return totalWidth - 252 - 6 - canvasMinWidth - 16 * 3;
  }, []);
  const { width: previewWidth, handleProps: previewResizeHandleProps } = useColumnResize({
    defaultWidth: previewDefaultWidth,
    minWidth: previewMinWidth,
    storage,
    storageKey: "gzh-preview-width",
    getMaxWidth: getMaxPreviewWidth,
  });

  const allStylePresets = useMemo(() => [...stylePresets, ...customStyles], [customStyles]);
  const currentDraft = useMemo(() => getCurrentDraft(draftLibrary), [draftLibrary]);
  const basePreset =
    allStylePresets.find((preset) => preset.id === selectedStyleId) ?? defaultStylePreset;
  const mergedPreset = useMemo(
    () => mergeStylePreset(basePreset, recommendation.overrides, userOverrides),
    [basePreset, recommendation.overrides, userOverrides]
  );
  const layoutHtml = useMemo(
    () => (layoutArticle ? renderWechatHtml(layoutArticle, mergedPreset) : ""),
    [layoutArticle, mergedPreset]
  );
  const thumbArticle = useMemo(
    () => (layoutArticle ? { ...layoutArticle, blocks: layoutArticle.blocks.slice(0, 10) } : null),
    [layoutArticle]
  );
  const activeArticle = workspace === "layout" && layoutArticle ? layoutArticle : article;
  const wordCount = useMemo(() => astToPlainText(activeArticle).replace(/\s/g, "").length, [activeArticle]);
  const storageUsage = useMemo(
    () => ({
      drafts: byteLength(JSON.stringify(draftLibrary)),
      styles: byteLength(JSON.stringify(customStyles)),
      settings: byteLength(JSON.stringify(aiSettings)),
      total:
        byteLength(JSON.stringify(draftLibrary)) +
        byteLength(JSON.stringify(customStyles)) +
        byteLength(JSON.stringify(aiSettings)),
    }),
    [aiSettings, customStyles, draftLibrary]
  );

  useEffect(() => {
    if (!saveDraft(storage, article)) {
      reportStorageFailure();
    }
    setDraftLibrary((current) => updateCurrentDraftArticle(current, article));
  }, [article]);

  useEffect(() => {
    setDraftLibrary((current) => updateCurrentDraftLayoutArticle(current, layoutArticle));
  }, [layoutArticle]);

  useEffect(() => {
    if (!saveDraftLibrary(storage, draftLibrary)) {
      reportStorageFailure();
    }
  }, [draftLibrary]);

  useEffect(() => {
    saveAiSettings(storage, aiSettings);
  }, [aiSettings]);

  useEffect(() => {
    saveCustomStyles(storage, customStyles);
  }, [customStyles]);

  useEffect(() => {
    if (busy || feedback.tone === "error" || feedback.message.startsWith("准备就绪")) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setFeedback(createFeedback("info", "准备就绪，可以开始写作或排版。"));
    }, 3200);
    return () => window.clearTimeout(timeout);
  }, [busy, feedback]);

  function handleArticleChange(nextArticle: ArticleAst) {
    setArticle(nextArticle);
  }

  function reportStorageFailure() {
    if (storageErrorShownRef.current) {
      return;
    }
    storageErrorShownRef.current = true;
    setFeedback(
      createFeedback("error", "本地存储已满，本次改动未能保存——请到 设置→存储管理 清理。")
    );
  }

  function openArticle(nextArticle: ArticleAst) {
    setArticle(nextArticle);
    setEditorVersion((version) => version + 1);
  }

  function openLayoutArticle(nextArticle: ArticleAst | null) {
    setLayoutArticle(nextArticle);
    setLayoutEditorVersion((version) => version + 1);
  }

  function openDraftFromLibrary(library: ReturnType<typeof loadDraftLibrary>) {
    const draft = getCurrentDraft(library);
    openArticle(draft.article);
    openLayoutArticle(draft.layoutArticle ?? null);
  }

  function createNewDraft() {
    const library = createDraft(draftLibrary, createSampleArticle());
    setDraftLibrary(library);
    openDraftFromLibrary(library);
    setFeedback(createFeedback("success", "已创建新草稿。"));
  }

  function switchDraft(draftId: string) {
    const library = selectDraft(draftLibrary, draftId);
    setDraftLibrary(library);
    openDraftFromLibrary(library);
    setFeedback(createFeedback("info", "已切换草稿。"));
  }

  function removeDraft(draftId: string) {
    const library = deleteDraft(draftLibrary, draftId);
    setDraftLibrary(library);
    openDraftFromLibrary(library);
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

  function removeDraftVersion(versionId: string) {
    setDraftLibrary((current) => deleteVersion(current, versionId));
    setFeedback(createFeedback("success", "已删除历史版本。"));
  }

  function clearVersionHistory() {
    setDraftLibrary((current) => clearAllVersionHistory(current));
    setFeedback(createFeedback("success", "已清空所有版本历史。"));
  }

  function deleteAllDrafts() {
    if (!window.confirm("确认删除全部草稿？此操作不可撤销。")) {
      return;
    }
    const library = resetDrafts(createSampleArticle());
    setDraftLibrary(library);
    openDraftFromLibrary(library);
    setFeedback(createFeedback("success", "已删除全部草稿，并创建空白示例草稿。"));
  }

  function resetLocalData() {
    if (window.prompt("输入“重置”以确认清空草稿、版本、模型设置和本地版式。") !== "重置") {
      return;
    }
    storage?.clear();
    const library = resetDrafts(createSampleArticle());
    setDraftLibrary(library);
    openDraftFromLibrary(library);
    setAiSettings(loadAiSettings(storage));
    setCustomStyles([]);
    setUserOverrides({});
    setSelectedStyleId(defaultStylePreset.id);
    setSettingsOpen(false);
    setFeedback(createFeedback("success", "已重置全部本地数据。"));
  }

  function copyToLayout() {
    if (
      layoutArticle &&
      JSON.stringify(layoutArticle) !== JSON.stringify(article) &&
      !window.confirm("排版台已有内容，确认用写作台当前稿覆盖？")
    ) {
      return;
    }

    setDraftLibrary((current) => createVersionSnapshot(updateCurrentDraftArticle(current, article), "复制到排版台"));
    openLayoutArticle(article);
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
    let streamedText = "";
    let lastFlush = 0;
    const flushStreamToEditor = (force = false) => {
      const now = Date.now();
      if (!force && now - lastFlush < 200) {
        return;
      }
      lastFlush = now;
      const streamedArticle = coerceMarkdownArticle(streamedText);
      if (streamedArticle) {
        openArticle(streamedArticle);
      }
    };
    try {
      const result = await callChatCompletionsText(
        aiSettings,
        {
          ...buildWritingRequest({
            topic: writingTopic,
            style: writingStyle.trim() || "清晰实用",
            words: writingWords,
            genre: writingGenre.trim() || "干货教程",
            outline: writingOutline,
          }),
          stream: true,
        },
        undefined,
        {
          signal: controller.signal,
          onDelta: (delta) => {
            streamedText += delta;
            flushStreamToEditor();
          },
        }
      );
      if (!result.ok) {
        if (result.code === "aborted") {
          if (streamedText.trim()) {
            const partialArticle = coerceMarkdownArticle(streamedText) ?? plainTextToAst(streamedText);
            openArticle(partialArticle);
            setFeedback(createFeedback("info", "已停止生成，并保留已生成的内容。"));
          } else {
            setFeedback(createFeedback("info", result.message));
          }
          return;
        }
        const fallback = generateDraftLocally(writingTopic, writingStyle);
        openArticle(fallback);
        setFeedback(createFeedback("info", `${result.message} 已用本地规则生成草稿。`));
        return;
      }

      flushStreamToEditor(true);
      const aiArticle = coerceMarkdownArticle(result.data);
      if (!aiArticle) {
        openArticle(plainTextToAst(result.data));
        setFeedback(createFeedback("info", "模型返回未按 Markdown 结构，已按纯文本导入，可手动整理或再次点 AI 智能排版。"));
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
    if (
      hasVisualFormatting(article) &&
      !window.confirm("当前稿含有手工样式，AI 智能排版可能覆盖这些样式。继续前会保存版本快照，确认继续？")
    ) {
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

  function saveCurrentStyle() {
    const custom = createCustomStyle(mergedPreset, `${mergedPreset.name} 调整版`);
    setCustomStyles((current) => [...current, custom]);
    setSelectedStyleId(custom.id);
    setFeedback(createFeedback("success", "已保存为我的版式。"));
  }

  function applyPlan(plan: LayoutPlan, index: number | null, statusMessage?: string) {
    const nextRecommendation = {
      styleId: plan.styleId,
      reason: plan.reason,
      overrides: planToOverrides(plan),
    };
    setRecommendation(nextRecommendation);
    setSelectedStyleId(plan.styleId);
    setActivePlanIndex(index);
    if (plan.blocks?.length || hasAnyRole(layoutArticle)) {
      setLayoutArticle((current) => (current ? applyRolesToArticle(current, plan.blocks ?? []) : current));
      setLayoutEditorVersion((version) => version + 1);
    }
    setLayoutAiStatus({
      phase: "success",
      message: statusMessage ?? `已应用：${plan.reason}`,
      at: Date.now(),
    });
    setFeedback(createFeedback("success", statusMessage ?? `已应用：${plan.reason}`));
  }

  async function runSmartLayout() {
    if (busy) {
      return;
    }
    if (!layoutArticle) {
      setLayoutAiStatus({
        phase: "error",
        message: "排版台还没有内容",
        at: Date.now(),
      });
      setFeedback(createFeedback("error", "排版台还没有内容，请先从写作台复制当前稿。"));
      return;
    }
    setBusy("layout");
    setLayoutAiStatus({ phase: "running" });
    setPlanCandidates([]);
    setActivePlanIndex(null);
    setFeedback(createFeedback("info", "正在分析版式…"));
    try {
      const result = await callChatCompletionsJson<unknown>(
        aiSettings,
        buildLayoutPlanRequest(layoutArticle, allStylePresets)
      );
      const coerced = result.ok ? coerceLayoutPlan(result.data, layoutArticle, allStylePresets) : null;
      const plans = coerced ?? recommendLayoutPlan(layoutArticle);
      const fallbackMessage = result.ok ? "模型返回方案不可用" : result.message;
      setPlanCandidates(plans);
      applyPlan(
        plans[0],
        0,
        coerced
          ? `已生成 ${plans.length} 套方案，已应用方案 A`
          : result.ok
            ? "模型返回方案不可用，已用本地规则生成方案 A"
            : `${fallbackMessage} 已用本地规则生成方案 A`
      );
      if (!coerced && result.ok) {
        setLayoutAiStatus({
          phase: "fallback",
          message: "模型返回版式不可用，已用本地规则推荐",
          at: Date.now(),
        });
        setFeedback(createFeedback("info", "模型返回版式不可用，已使用本地规则推荐。"));
      } else if (!coerced) {
        setLayoutAiStatus({
          phase: "fallback",
          message: `${fallbackMessage} 已用本地规则推荐`,
          at: Date.now(),
        });
        setFeedback(createFeedback("info", `${fallbackMessage} 已使用本地规则推荐版式。`));
      }
    } finally {
      setBusy(null);
    }
  }

  async function copyHtml() {
    if (!layoutArticle) {
      setFeedback(createFeedback("error", "排版台还没有内容，请先从写作台复制当前稿。"));
      return;
    }

    setCopied(false);
    try {
      await copyWechatHtml(layoutHtml, astToPlainText(layoutArticle));
      setCopied(true);
      setFeedback(createFeedback("success", "已复制 HTML，可粘贴到公众号。"));
    } catch {
      setFeedback(createFeedback("error", "复制失败，请重试或手动复制导出 HTML。"));
    }
  }

  function setThemeColor(color: string) {
    setUserOverrides((current) => ({
      ...current,
      ...(autoPalette ? derivePaletteOverrides(color) : { "palette.primary": color }),
    }));
  }

  function setBodySize(size: string) {
    setUserOverrides((current) => ({ ...current, "typography.bodySize": size }));
  }

  function setParagraphGap(gap: string) {
    setUserOverrides((current) => ({ ...current, "rhythm.paragraphGap": gap }));
  }

  function setFooterText(text: string) {
    setUserOverrides((current) => ({
      ...current,
      "decorations.footer": "follow-card",
      "decorations.footerText": text,
    }));
  }

  function updateLayoutSettings(next: {
    themeColor?: string;
    bodySize?: string;
    paragraphGap?: string;
    footerText?: string;
    autoPalette?: boolean;
    firstLineIndent?: string;
    headingVariant?: string;
    quoteVariant?: string;
    listVariant?: string;
    dividerVariant?: string;
  }) {
    if (next.themeColor !== undefined) {
      setThemeColor(next.themeColor);
    }
    if (next.bodySize !== undefined) {
      setBodySize(next.bodySize);
    }
    if (next.paragraphGap !== undefined) {
      setParagraphGap(next.paragraphGap);
    }
    if (next.footerText !== undefined) {
      setFooterText(next.footerText);
    }
    if (next.autoPalette !== undefined) {
      setAutoPalette(next.autoPalette);
    }
    if (next.firstLineIndent !== undefined) {
      setUserOverrides((current) => ({
        ...current,
        "rhythm.firstLineIndent": next.firstLineIndent || null,
      }));
    }
    if (next.headingVariant !== undefined) {
      setUserOverrides((current) => ({
        ...current,
        "components.heading.variant": next.headingVariant || null,
      }));
    }
    if (next.quoteVariant !== undefined) {
      setUserOverrides((current) => ({
        ...current,
        "components.quote.variant": next.quoteVariant || null,
      }));
    }
    if (next.listVariant !== undefined) {
      setUserOverrides((current) => ({
        ...current,
        "components.list.variant": next.listVariant || null,
      }));
    }
    if (next.dividerVariant !== undefined) {
      setUserOverrides((current) => ({
        ...current,
        "components.divider.variant": next.dividerVariant || null,
      }));
    }
  }

  function renderPlanThumb(plan: LayoutPlan) {
    if (!thumbArticle) {
      return "";
    }

    const preset = allStylePresets.find((item) => item.id === plan.styleId) ?? defaultStylePreset;
    const merged = mergeStylePreset(preset, planToOverrides(plan), {});
    return renderWechatHtml(applyRolesToArticle(thumbArticle, plan.blocks ?? []), merged);
  }

  function planStyleName(plan: LayoutPlan) {
    return allStylePresets.find((item) => item.id === plan.styleId)?.name ?? plan.styleId;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">微</div>
          <div>
            <strong>{activeArticle.meta.title}</strong>
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
              onClick={() => setWorkspace("layout")}
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
          <button className="primary-button" onClick={copyHtml} disabled={!layoutArticle}>
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
          storageUsage={storageUsage}
          onChange={(next) => updateAiSettings(next)}
          onClose={() => setSettingsOpen(false)}
          onTest={() => void testModelConnection()}
          onClearVersions={clearVersionHistory}
          onDeleteDrafts={deleteAllDrafts}
          onResetLocalData={resetLocalData}
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
                <input
                  list="writing-style-presets"
                  value={writingStyle}
                  onChange={(event) => setWritingStyle(event.target.value)}
                  placeholder="选择或输入自定义风格"
                />
                <datalist id="writing-style-presets">
                  {["清晰实用", "温柔走心", "克制专业", "轻松友好"].map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </label>
              <label className="writer-field">
                目标字数
                <input
                  min={200}
                  max={8000}
                  step={100}
                  type="number"
                  value={writingWords}
                  onChange={(event) => setWritingWords(Number(event.target.value))}
                />
              </label>
              <div className="word-chips" aria-label="快捷字数">
                {[600, 1000, 1500, 2500].map((words) => (
                  <button
                    className={writingWords === words ? "chip active" : "chip"}
                    key={words}
                    type="button"
                    onClick={() => setWritingWords(words)}
                  >
                    {words}
                  </button>
                ))}
              </div>
              <label className="writer-field">
                文体
                <input
                  list="writing-genre-presets"
                  value={writingGenre}
                  onChange={(event) => setWritingGenre(event.target.value)}
                  placeholder="选择或输入自定义文体"
                />
                <datalist id="writing-genre-presets">
                  {["清单体", "观点文", "干货教程", "故事叙述", "资讯速览"].map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
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
          </aside>
          <section className="writing-area">
            <EditorBoundary onReset={() => setEditorVersion((version) => version + 1)}>
              <Suspense fallback={<div className="editor-loading">正在打开写作台...</div>}>
                <WriterEditor
                  article={article}
                  externalVersion={editorVersion}
                  onChangeArticle={handleArticleChange}
                  onCopyToLayout={copyToLayout}
                  readOnly={busy === "writing"}
                />
              </Suspense>
            </EditorBoundary>
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
                  <div className="version-row" key={version.id}>
                    <button onClick={() => restoreDraftVersion(version.id)}>
                      <strong>{version.reason}</strong>
                      <span>{new Date(version.createdAt).toLocaleString()}</span>
                      <em>恢复版本</em>
                    </button>
                    <button aria-label={`删除版本 ${version.reason}`} onClick={() => removeDraftVersion(version.id)}>
                      删除
                    </button>
                  </div>
                ))
              )}
            </section>
          </aside>
        </main>
      ) : (
        <main
          className="layout-screen"
          ref={layoutScreenRef}
          style={{ "--preview-w": `${previewWidth}px` } as CSSProperties}
        >
          <aside className="style-library">
            <div className="section-title">
              <Palette size={16} />
              版式库
            </div>
            <article className="recommend-card">
              <span>AI 合成方案</span>
              <strong>{planCandidates.length > 0 ? `${planCandidates.length} 套候选` : planStyleName({ styleId: recommendation.styleId, reason: recommendation.reason })}</strong>
              <p>{planCandidates.length > 0 ? "点击方案卡可切换整套版式、配色与角色标注。" : recommendation.reason}</p>
              {planCandidates.length > 0 ? (
                <div className="plan-list">
                  {planCandidates.map((plan, index) => (
                    <button
                      className={activePlanIndex === index ? "plan-card selected" : "plan-card"}
                      key={`${plan.styleId}-${index}`}
                      type="button"
                      onClick={() => applyPlan(plan, index)}
                    >
                      <span className="plan-thumb">
                        <span
                          className="plan-thumb-inner"
                          dangerouslySetInnerHTML={{ __html: renderPlanThumb(plan) }}
                        />
                      </span>
                      <span className="plan-meta">
                        <i style={{ background: plan.palette?.primary ?? (allStylePresets.find((item) => item.id === plan.styleId) ?? defaultStylePreset).palette.primary }} />
                        <strong>方案 {String.fromCharCode(65 + index)} · {planStyleName(plan)}</strong>
                      </span>
                      <em>{plan.reason}</em>
                    </button>
                  ))}
                </div>
              ) : null}
              <div className={`layout-ai-status ${layoutAiStatus.phase}`}>
                <i />
                {layoutAiStatus.phase === "idle"
                  ? "尚未运行"
                  : layoutAiStatus.phase === "running"
                    ? "分析中…"
                    : `${layoutAiStatus.message} · ${new Date(layoutAiStatus.at).toLocaleTimeString()}`}
              </div>
              <button disabled={busy !== null || !layoutArticle} onClick={() => void runSmartLayout()}>
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
            {layoutArticle ? (
              <EditorBoundary onReset={() => setLayoutEditorVersion((version) => version + 1)}>
                <Suspense fallback={<div className="editor-loading">正在打开排版画布...</div>}>
                  <LayoutEditor
                    article={layoutArticle}
                    externalVersion={layoutEditorVersion}
                    preset={mergedPreset}
                    onChangeArticle={(nextArticle) => setLayoutArticle(nextArticle)}
                    onResetStyle={() => setUserOverrides({})}
                    onSaveStyle={saveCurrentStyle}
                    settings={{
                      themeColor: String(mergedPreset.palette.primary),
                      bodySize: String(mergedPreset.typography.bodySize),
                      paragraphGap: String(mergedPreset.rhythm.paragraphGap),
                      footerText: String(mergedPreset.decorations.footerText ?? ""),
                      autoPalette,
                      firstLineIndent: String(mergedPreset.rhythm.firstLineIndent ?? ""),
                      headingVariant: String(userOverrides["components.heading.variant"] ?? ""),
                      quoteVariant: String(userOverrides["components.quote.variant"] ?? ""),
                      listVariant: String(userOverrides["components.list.variant"] ?? ""),
                      dividerVariant: String(userOverrides["components.divider.variant"] ?? ""),
                    }}
                    onSettingsChange={updateLayoutSettings}
                  />
                </Suspense>
              </EditorBoundary>
            ) : (
              <section className="layout-empty">
                <h2>排版台还没有内容</h2>
                <p>从写作台复制当前稿后，再做版式推荐、微调和公众号复制。</p>
                <button className="primary-button" onClick={copyToLayout}>
                  从写作台复制当前稿
                </button>
              </section>
            )}
          </section>

          <div className="split-handle" aria-label="调整预览宽度" {...previewResizeHandleProps} />

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
            </div>
            <div className={`device-frame ${previewDevice}${darkPreview ? " dark" : ""}`}>
              {layoutArticle ? (
                <div className="device-screen">
                  <div dangerouslySetInnerHTML={{ __html: layoutHtml }} />
                </div>
              ) : (
                <div className="device-screen">
                  <div className="layout-preview-empty">暂无预览</div>
                </div>
              )}
            </div>
          </aside>
        </main>
      )}
    </div>
  );
}

function hasVisualFormatting(article: ArticleAst): boolean {
  return article.blocks.some((block) => {
    const hasBlockStyle = Boolean(block.style && Object.keys(block.style).length > 0);
    const hasRole = "role" in block && Boolean(block.role);
    if (hasBlockStyle || hasRole) {
      return true;
    }
    if (block.type !== "paragraph") {
      return false;
    }
    return block.runs.some(
      (run) =>
        Boolean(run.marks?.length) ||
        Boolean(
          run.attrs &&
            Object.values(run.attrs).some((value) => typeof value === "string" && value.trim())
        )
    );
  });
}

function byteLength(value: string): number {
  return new Blob([value]).size;
}
