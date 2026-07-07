# V13 Phase 0 Audit

Date: 2026-07-07

## Findings

| Item | Result |
|---|---|
| P0-1 renderer container | `renderWechatHtml()` already emits a root `<section>` container. Most block-level decorations also use `<section>`. Existing headings still render as `h1/h2/h3`; the scanner currently allows them for backward compatibility. |
| P0-2 WeChat paste rules | Not locally verifiable in this environment. `<span leaf="">` and strict section-only containers must be checked in the WeChat Official Account editor. Current compliance rules are centralized in `src/domain/wechatCompliance.ts`; update this doc with the real paste date/result after manual A/B testing. |
| P0-3 role field | Roles are stored on `ArticleBlock.role`; hints use `ArticleBlock.roleHint`. V13 extends the existing role union instead of replacing it, so old drafts keep working. |
| P0-4 inline marks | Inline marks live in `TextRun.marks`; V13 adds `keyword` and registers a Tiptap mark extension so JSON round trips preserve it. |
| P0-5 schema shape | `aiLayoutSchema.ts` uses hand-written coercion/guards, not zod. V13 follows the same style for `LayoutPlanV2`. |
| P0-6 preset migration | Style presets do not yet have schema versioning. Palette role migration is deferred to E3. |
| P0-7 table chain | Table blocks already round-trip through Tiptap AST and render as inline-styled `<table>/<tr>/<th>/<td>`. A dedicated comparison-table role is not included in V13 v1. |

## Manual P0-2 Checklist

Paste two exported HTML samples into the WeChat Official Account editor:

1. Current output with root/block `<section>` and normal inline `<span>`.
2. Same output with text leaves wrapped as `<span leaf="">`.

Record:

- Test date:
- Browser / OS:
- WeChat editor result for section containers:
- WeChat editor result for `span leaf`:
- Required scanner rule change:
