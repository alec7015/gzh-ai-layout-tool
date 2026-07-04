# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A personal, local-only WeChat Official Account (公众号) AI-powered writing and formatting tool. Built with React 19 + TypeScript + Vite + Tiptap editor, wrapped in a Tauri 2.x desktop shell. No backend server — everything runs client-side with localStorage persistence.

## Commands

```bash
npm run dev          # Vite dev server at http://127.0.0.1:5173
npm run build        # TypeScript check + Vite production build
npm test             # vitest run (jsdom environment)
npm run test:watch   # vitest in watch mode
npm run lint         # ESLint across the project
npm run tauri:dev    # Tauri desktop dev window
npm run tauri:build  # Tauri desktop production build (Windows)
```

## Architecture

### Two workspaces, one `App` component

`src/App.tsx` is the entire application shell. It renders one of two workspaces based on a `Workspace` state toggle (`"writer"` | `"layout"`):

- **写作台 (Writer)**: Tiptap block editor for composing articles. Sidebar has draft list, AI generation controls, content operations (polish/expand/condense/title), and AI model settings.
- **排版台 (Layout)**: Style library picker (8 built-in + custom presets), WYSIWYG preview of the rendered WeChat HTML, mobile phone preview (light/dark), and a fine-tuning panel for per-block overrides (color, background, alignment).

Switching from Writer to Layout auto-saves a version snapshot.

### Core data model: `ArticleAst` → `ArticleBlock[]`

Defined in `src/domain/types.ts`. An article is a flat array of 7 block types:

| Block type | Key fields |
|---|---|
| `title` | `text` |
| `heading` | `text` |
| `paragraph` | `runs: TextRun[]` (supports bold/italic/emphasis marks) |
| `quote` | `text` |
| `list` | `ordered: boolean`, `items: string[]` |
| `image` | `src` (data URL), `caption?` |
| `divider` | (no content) |

Every block has an `id` and optional `style: BlockOverride` (per-block CSS overrides).

### Data flow

```
Plain text (Tiptap)
  ↔ tiptapAdapter.ts (TiptapDoc JSON ←→ ArticleAst)
  ↔ draftStore.ts (plainTextToAst / astToPlainText)
  → ArticleAst
  → wechatRenderer.ts + merged StylePreset
  → WeChat-compatible inline-styled HTML (no classes, no <style>/<script>)
  → clipboard.ts (Clipboard API text/html, execCommand fallback)
```

### Style system: Base → AI overrides → User overrides

1. **8 built-in `StylePreset`s** in `src/domain/stylePresets.ts` — each defines `palette`, `typography`, `rhythm`, per-component `variant`, and `decorations` (header/footer ornaments).
2. **`styleEngine.ts` → `mergeStylePreset()`** layers overrides in priority: base preset → AI recommendation overrides → user manual overrides. Uses dotted-path notation (`"palette.primary"`, `"rhythm.paragraphGap"`).
3. **`wechatRenderer.ts` → `renderWechatHtml()`** converts the AST + merged preset into pure inline-styled HTML tags (`<h1>`, `<h2>`, `<p>`, `<section>`, `<ul>/<ol>`, `<img>`). No CSS classes, no `<style>` blocks — everything must be inline for WeChat compatibility.
4. User can save adjusted presets as custom styles (`customStyles.ts`).

### AI integration (OpenAI-compatible)

- `src/domain/aiClient.ts`: Generic `callChatCompletionsJson<T>()` — POSTs to `{baseUrl}/chat/completions`, parses JSON from the response. Accepts a `fetcher` parameter for testability.
- `src/domain/aiSettings.ts`: API settings persisted to `localStorage` key `gzh-ai-settings`.
- `src/domain/aiWriting.ts`: Builds chat completion requests for article generation; provides local fallback `generateDraftLocally()` and `rewriteSelectionLocally()` when no API key is configured.
- `src/domain/aiLayout.ts` + `aiLayoutSchema.ts`: Builds layout recommendation requests; `coerceLayoutRecommendation()` validates and sanitizes the AI response (allowed style IDs, safe override paths, no prototype pollution). Always falls back to local `recommendLayout()` which does keyword-based genre detection and rule-based overrides.

### Persistence strategy

All data lives in `localStorage` (browser or Tauri WebView). Four separate keys:

| Key | Module | Content |
|---|---|---|
| `gzh-current-draft` | `draftStore.ts` | Single `ArticleAst` JSON |
| `gzh-draft-library` | `draftLibrary.ts` | Multi-draft library with version history (max 12 versions per draft) |
| `gzh-ai-settings` | `aiSettings.ts` | Base URL, model name, API key |
| `gzh-custom-style-presets` | `customStyles.ts` | User-saved custom `StylePreset[]` |

All storage modules accept an optional `storage` interface (`{ getItem, setItem }`) so they work in both browser and test environments.

### Domain module convention

All files under `src/domain/` are pure TypeScript modules with zero React imports. They export plain functions operating on the types defined in `types.ts`. This makes them testable in isolation — every domain module has a corresponding `*.test.ts` file.

### Tiptap integration

- `src/components/WriterEditor.tsx`: Thin wrapper around Tiptap's `useEditor` + `EditorContent`. Uses `StarterKit` extensions only. Handles drag-and-drop and paste for images.
- `src/domain/tiptapAdapter.ts`: Bidirectional conversion between `ArticleAst` ↔ `TiptapDoc` (Tiptap's JSON format). The Tiptap editor renders rich text; on every update it converts back to plain text via `tiptapDocToPlainText`, which flows through `plainTextToAst` to produce the canonical `ArticleAst`.

### Tauri shell

`src-tauri/` contains a minimal Tauri 2.x Rust shell. The Rust side (`lib.rs`) only initializes the Tauri builder with the opener plugin — all application logic is in the frontend. `tauri.conf.json` maps the dev server to `http://127.0.0.1:5173` and the production frontend to `../dist`. No code signing, notarization, or auto-update.

### Styling

All CSS lives in `src/styles.css` (no CSS modules, no CSS-in-JS). The rendered WeChat HTML uses inline styles exclusively.

## Testing

- Test runner: vitest with `jsdom` environment and `@testing-library/react`
- Setup file: `src/test/setup.ts` (imports `@testing-library/jest-dom/vitest` matchers)
- Domain tests: pure function tests, no DOM needed
- `src/App.test.tsx`: Smoke test verifying key UI controls render
- All domain modules that accept a storage/fetcher dependency use that parameter for testability (no mocking of globals needed)
