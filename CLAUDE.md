# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A personal, local-only WeChat Official Account (公众号) AI-powered writing and formatting tool. Built with React 19 + TypeScript + Vite + Tiptap editor, wrapped in a Tauri 2.x desktop shell. No backend server — everything runs client-side with localStorage persistence.

## Commands

```bash
npm run dev          # Vite dev server at http://127.0.0.1:5173
npm run build        # TypeScript check (tsc -b) + Vite production build
npm test             # vitest run (jsdom environment)
npm run test:watch   # vitest in watch mode
npm test -- -- path/to/file.test.ts   # Run a single test file
npm test -- -- -t "test name"        # Run tests matching a name pattern
npm run lint         # ESLint across the project
npm run tauri:dev    # Tauri desktop dev window
npm run tauri:build  # Tauri desktop production build (Windows)
```

The `build` script runs `tsc -b && vite build` — TypeScript type-checking is a separate pass before bundling. The `test` script runs all tests; use `npm test -- -- src/domain/draftStore.test.ts` to run a single file.

## Architecture

### Two workspaces, one `App` component

`src/App.tsx` is the entire application shell. It renders one of two workspaces based on a `Workspace` state toggle (`"writer"` | `"layout"`):

- **写作台 (Writer)**: Tiptap block editor for composing articles. Sidebar has draft list, AI generation controls, content operations (polish/expand/condense/title), and AI model settings.
- **排版台 (Layout)**: Style library picker (8 built-in + custom presets), WYSIWYG preview of the rendered WeChat HTML, mobile phone preview (light/dark), and a fine-tuning panel for per-block overrides (color, background, alignment). Supports AI-powered multi-plan layout generation (LayoutPlan v5).

Switching from Writer to Layout auto-saves a version snapshot.

Both `WriterEditor` and `LayoutEditor` are loaded via `React.lazy()` + `<Suspense>`. Component tests for these must use async queries (`await screen.findByLabelText(...)`).

**Editor content sync pattern (`externalVersion`):** `App.tsx` passes an `externalVersion` counter to each editor. When the app needs to replace editor content from outside (switching drafts, restoring a version, applying a layout plan), it increments this counter. The editor's `useEffect` watches `externalVersion` and calls `editor.commands.setContent()` with `emitUpdate: false`, avoiding infinite update loops.

**Native dialog rule:** Do not use `window.confirm`, `window.prompt`, `window.alert`, or bare `confirm/prompt/alert`. macOS WKWebView can silently fail these APIs. Use `src/components/ConfirmDialog.tsx` through the app-level async request helpers, or surface status through the feedback bar. ESLint enforces this with `no-restricted-globals` and `no-restricted-properties`.

### Core data model: `ArticleAst` → `ArticleBlock[]`

Defined in `src/domain/types.ts`. An article is a flat array of 9 block types:

| Block type | Key fields |
|---|---|
| `title` | `text` |
| `heading` | `text`, `level?: 1 \| 2 \| 3` |
| `paragraph` | `runs: TextRun[]` (supports bold/italic/underline/strike/emphasis marks + inline color/background/font attrs) |
| `quote` | `text` |
| `list` | `ordered: boolean`, `items: string[]` |
| `image` | `src` (data URL), `caption?` |
| `imageGrid` | `images: GridImage[]`, `layout: "two" \| "three" \| "quad"`, `gap`, `radius` |
| `table` | `rows: TableRow[]` (each row has `cells: string[]`, optional `header: boolean`) |
| `divider` | (no content) |

Every block has an `id`, optional `style: BlockOverride` (per-block CSS overrides), and optional `role: BlockRole` (`"lead"` | `"keyQuote"` | `"emphasis"` | `"steps"` | `"summary"`). Block roles drive special rendering in `wechatRenderer.ts` (e.g., `lead` gets a left border and subdued color; `summary` gets a "小结" badge).

`TextRun` supports inline marks (`bold`, `italic`, `emphasis`, `underline`, `strike`) and inline `attrs` (`color`, `background`, `fontSize`, `fontFamily`).

### Data flow

```
Plain text (Tiptap)
  ↔ tiptapAdapter.ts (TiptapDoc JSON ←→ ArticleAst)
  ↔ draftStore.ts (plainTextToAst / astToPlainText / astToMarkdown)
  → ArticleAst
  → wechatRenderer.ts + merged StylePreset
  → WeChat-compatible inline-styled HTML (no classes, no <style>/<script>)
  → clipboard.ts (Clipboard API text/html, execCommand fallback)
```

Additional pipeline: `wechatCopyPipeline.ts` reshapes lists/tables for WeChat compatibility and inlines external images (via Tauri HTTP plugin or browser fetch) before the final HTML is placed on the clipboard.

The project also uses `turndown` + `turndown-plugin-gfm` for HTML-to-markdown conversion (used in "magic paste" to strip rich text formatting).

Title import is defensive: long or pasted title content is normalized to a max 120-character title and overflow text becomes body paragraphs. Keep this invariant in `draftStore.ts` and `tiptapAdapter.ts` so topbar titles and first-block semantics remain stable.

### Style system: Base → AI overrides → User overrides

1. **8 built-in `StylePreset`s** in `src/domain/stylePresets.ts` — each defines `palette` (6 colors), `typography`, `rhythm`, per-component `variant` (with a defined vocabulary per component type), and `decorations` (header/footer ornaments).
2. **`styleEngine.ts` → `mergeStylePreset()`** layers overrides in priority: base preset → AI recommendation overrides → user manual overrides. Uses dotted-path notation (`"palette.primary"`, `"rhythm.paragraphGap"`).
3. **`wechatRenderer.ts` → `renderWechatHtml()`** converts the AST + merged preset into pure inline-styled HTML tags (`<h1>`, `<h2>`, `<p>`, `<section>`, `<ul>/<ol>`, `<img>`, `<table>`). No CSS classes, no `<style>` blocks — everything must be inline for WeChat compatibility. Handles all component variants (gradient-band titles, chapter-badge headings, golden-card quotes, arrow-accent lists, etc.) and block roles.
4. **`presetToEditorCss.ts` → `presetToEditorCss()`** generates CSS for the Tiptap editor to visually preview the active style preset. Supports heading auto-numbering via CSS counters when the heading variant is `number-badge` or `chapter-badge`.
5. User can save adjusted presets as custom styles (`customStyles.ts`).

**Two independent rendering paths** serve different purposes in the Layout workspace:
- The **Tiptap editor surface** (`LayoutEditor.tsx`) uses `presetToEditorCss()` to inject a `<style>` tag with CSS class selectors — this gives a live WYSIWYG preview with block-role styling via `[data-block-role]` selectors.
- The **phone/tablet/desktop preview panels** use `renderWechatHtml()` to produce pure inline-styled HTML — this is the actual output that gets copied to the clipboard. These two pipelines must stay visually consistent.

### Layout Plan system (v5)

The current branch (`codex/v5-layout-plan`) adds AI-powered multi-plan layout generation:

- **`aiLayoutSchema.ts`** builds chat completion requests for generating 2-3 `LayoutPlan`s. Each plan specifies a `styleId`, optional `palette.primary`, optional per-component variants, and optional block-role assignments. The `coerceLayoutPlan()` function validates AI responses against the variant vocabulary, blocks that exist in the article, role quotas (e.g., max 1 lead, 2 keyQuotes), and role/block-type compatibility.
- **`layoutPlan.ts`** converts a `LayoutPlan` into `StyleOverrides` (via `paletteDerive.ts` which generates a full palette from a single primary color) and applies block roles to the article.
- **`paletteDerive.ts`** takes a single `primary` hex color and derives `secondary`, `accent`, and `textSub` colors using HSL math from `colorMath.ts`, with contrast-ratio enforcement.

### AI integration (OpenAI-compatible)

- `src/domain/aiClient.ts`: Generic `callChatCompletionsJson<T>()` and `callChatCompletionsText()` — POSTs to `{baseUrl}/chat/completions`. Supports SSE streaming via `options.onDelta`. Auto-detects Tauri runtime to use `@tauri-apps/plugin-http` (bypasses browser CORS). Falls back to browser `fetch`. Handles `400` retries when the model doesn't support `response_format: json_object`.
- `src/domain/aiSettings.ts`: API settings persisted to `localStorage` key `gzh-ai-settings`. Includes `provider` field for per-model quirks (e.g., omitting `temperature` for kimi-k2.6).
- `src/domain/aiWriting.ts`: Builds chat completion requests for article generation; provides local fallback `generateDraftLocally()` and `rewriteSelectionLocally()` when no API key is configured.
- `src/domain/aiLayout.ts` + `aiLayoutSchema.ts`: Builds layout recommendation and layout plan requests; `coerceLayoutRecommendation()` and `coerceLayoutPlan()` validate and sanitize the AI response (allowed style IDs, safe override paths, no prototype pollution, variant vocabulary membership, role quotas). Always falls back to local `recommendLayout()` which does keyword-based genre detection and rule-based overrides.

### Persistence strategy

All data lives in `localStorage` (browser or Tauri WebView). Four separate keys:

| Key | Module | Content |
|---|---|---|
| `gzh-current-draft` | `draftStore.ts` | Single `ArticleAst` JSON |
| `gzh-draft-library` | `draftLibrary.ts` | Multi-draft library with version history (max 12 versions per draft, schema versioning) |
| `gzh-ai-settings` | `aiSettings.ts` | Base URL, model name, API key, provider, max tokens |
| `gzh-custom-style-presets` | `customStyles.ts` | User-saved custom `StylePreset[]` |

All storage modules accept an optional `storage` interface (`{ getItem, setItem }`) so they work in both browser and test environments.

**Image reference system in version history:** Version snapshots can contain large data URLs. To save storage space, the draft library replaces image data URLs with `ref:<blockId>` references when saving versions, and reconstructs them from the current draft (or other versions) via a lookup map on restore. Schema versioning (`DRAFT_SCHEMA_VERSION = 2`) fixes heading level numbering when loading old data.

### Domain module convention

All files under `src/domain/` are pure TypeScript modules with zero React imports. They export plain functions operating on the types defined in `types.ts`. This makes them testable in isolation — every domain module has a corresponding `*.test.ts` file.

Key domain modules and their roles:
- `draftStore.ts` — AST ↔ plain text/markdown conversion, sample article, localStorage load/save
- `draftLibrary.ts` — multi-draft management with version history (schema v2)
- `tiptapAdapter.ts` — bidirectional `ArticleAst` ↔ `TiptapDoc` conversion
- `wechatRenderer.ts` — AST + preset → WeChat-compatible inline-styled HTML
- `wechatCopyPipeline.ts` — pre-copy HTML reshaping (lists, tables, external image inlining)
- `clipboard.ts` — Clipboard API write with `execCommand` fallback
- `styleEngine.ts` — layered preset merging (base → AI → user)
- `stylePresets.ts` — 8 built-in presets with variant vocabulary definitions
- `presetToEditorCss.ts` — preset → CSS for WYSIWYG editor preview
- `aiClient.ts` — OpenAI-compatible chat completions with SSE streaming
- `aiLayout.ts` — article analysis + rule-based layout recommendation
- `aiLayoutSchema.ts` — AI request building + response validation for layout plans
- `layoutPlan.ts` — converts LayoutPlan → StyleOverrides + applies block roles
- `paletteDerive.ts` — derives full palette from a single primary color
- `colorMath.ts` — HSL conversion, contrast ratio, accessible color adjustment
- `blockOverrides.ts` — per-block style override CRUD
- `imageGrid.ts` — WeChat-compatible image grid layout rendering
- `imageCompress.ts` — client-side image compression
- `magicPaste.ts` — HTML paste → markdown via turndown
- `formatter.ts` — plain text formatting utilities

### Tiptap integration

- `src/components/WriterEditor.tsx`: Thin wrapper around Tiptap's `useEditor` + `EditorContent`. Uses `StarterKit` extensions plus custom extensions. Handles drag-and-drop and paste for images.
- `src/components/BlockMetaExtension.ts`: Custom Tiptap extension that adds global attributes (`blockId`, `blockType`, `blockRole`, `blockStyle`) to all 9 block node types. This is the critical bridge between the AST identity layer and Tiptap's JSON serialization — without it, block IDs and roles would be lost on every editor update.
- `src/components/ImageGridExtension.tsx`: Custom Tiptap NodeView extension for the `imageGrid` block type — renders multi-image grid layouts inline in the editor.
- `src/components/editorShared.ts`: Shared toolbar utilities including font/color constants, popover dismiss hook, and a **format painter** (`PainterSnapshot` + `capturePainter` + `applyPainter`) supporting single-click and double-click continuous modes.
- `src/domain/tiptapAdapter.ts`: Bidirectional conversion between `ArticleAst` ↔ `TiptapDoc` (Tiptap's JSON format). The Tiptap editor renders rich text; on every update it converts back to plain text via `tiptapDocToPlainText`, which flows through `plainTextToAst` to produce the canonical `ArticleAst`.

### Tauri shell

`src-tauri/` contains a minimal Tauri 2.x Rust shell. The Rust side (`lib.rs`) initializes the Tauri builder with the opener and HTTP plugins; all application logic remains in the frontend. `tauri.conf.json` maps the dev server to `http://127.0.0.1:5173` and the production frontend to `../dist`. Window: 1280×780 (min 1024×680). No code signing, notarization, or auto-update. CSP is set to `null` (required for `@tauri-apps/plugin-http` to make arbitrary network requests).

### Styling

All CSS lives in `src/styles.css` (no CSS modules, no CSS-in-JS). The rendered WeChat HTML uses inline styles exclusively. Icons come from `lucide-react`.

WKWebView compatibility is a first-class constraint. Vite builds target `es2019` + `safari14`; rendered WeChat HTML tests scan for unsafe SVG data URI patterns and newer color syntax such as `color-mix()`/`oklch()`. Prefer simple inline CSS that works in Safari/WebKit and WeChat WebView.

The project's original design document is `gzh_tool_design_v3.md` (~80 pages) — it covers product goals, feature decisions, AST+Style architecture, preset designs, and AI layout workflow.

## Testing

- Test runner: vitest with `jsdom` environment, `globals: true`, and `@testing-library/react`
- Setup file: `src/test/setup.ts` (imports `@testing-library/jest-dom/vitest` matchers)
- The setup file polyfills `getClientRects` and `getBoundingClientRect` on `Element`, `Text`, `Node`, and `Range` prototypes — these are required for Tiptap's internal DOM measurements to work in jsdom.
- Domain tests: pure function tests, no DOM needed
- React component tests use `@testing-library/react` with `@testing-library/user-event`
- `src/App.test.tsx`: Smoke test verifying key UI controls render
- All domain modules that accept a storage/fetcher dependency use that parameter for testability (no mocking of globals needed)

## TypeScript config

The project uses TypeScript project references (`tsconfig.json` → `tsconfig.app.json` + `tsconfig.node.json`). Target is ES2022, strict mode enabled, with `noUnusedLocals` and `noUnusedParameters`. Module resolution is `Bundler` (Vite-native).
