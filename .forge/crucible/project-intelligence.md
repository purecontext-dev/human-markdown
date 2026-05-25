# Project Intelligence — human-markdown

*Last scoured: 2026-05-19*

A WYSIWYG markdown editor for VSCode. Opens `.md` files rendered, edits inline, toggles to raw with one keystroke. Themeable.

- **Repo:** github.com/purecontext-dev/human-markdown
- **License:** MIT
- **Version:** 0.1.0 (marketplace release prep)

## Tech stack

- **Language:** TypeScript (strict mode, `tsc --noEmit` for typecheck)
- **Runtime:** VSCode extension host (Node) + webview (browser)
- **Editor engine:** Milkdown 7.6 (ProseMirror + Remark) — WYSIWYG; CodeMirror 6 — raw mode
- **Renderers:** Shiki (syntax), KaTeX (math), Mermaid (diagrams) — separate IIFE bundles, lazy-loaded
- **Build:** esbuild (dual CJS extension host + IIFE webview bundles) via `esbuild.config.mjs`
- **Test:** Vitest 2.x (jsdom env for webview tests)
- **Lint/format:** Biome 1.9 (single quotes, 2-space, 100 width, semicolons asNeeded)
- **Package manager:** pnpm (with `onlyBuiltDependencies` allowlist)
- **Hooks:** husky + lint-staged (biome check --write on staged TS/JSON/MD)
- **Packaging:** `@vscode/vsce` → `.vsix`
- **CI:** GitHub Actions (`.github/`)

## Repo map

- `src/` — extension host code (Node)
  - `extension.ts` — activation entry, command registration
  - `editor-provider.ts` — `CustomTextEditorProvider` implementation, webview lifecycle, postMessage
  - `messages.ts` — host↔webview message type contracts
  - `theme-resolver.ts` — resolves `auto`/`light`/`dark`/`github` against VSCode color theme
  - `providers/`, `rendering/`, `themes/`, `utils/` — present but currently empty (scaffolding)
- `webview/` — browser-side code, bundled separately
  - `editor/` — Milkdown WYSIWYG + CodeMirror raw editor, plugins (math, frontmatter, code-block-view, task-list-toggle), viewport observer, styles, lazy loaders for Shiki/KaTeX/Mermaid
  - `editor/__fixtures__/` — markdown fixtures for round-trip tests
  - `shared/` — `remark-tight-lists.ts` (round-trip helper), `theme/tokens.ts` (CSS variable tokens)
  - `preview/` — empty (ADR-003 retired)
- `dist/` — built artifacts: `extension.js`, `webview/`, plus separate `shiki.js` / `mermaid.js` / `katex.js` IIFE bundles
- `test/fixtures/` — host-side fixtures (currently minimal; most tests co-located in `webview/editor/`)
- `docs/adrs/` — single `adrs.md` containing all ADRs
- `docs/spec/` — phase-1..phase-6 planning specs
- `docs/plans/` — `backlog.md`, `shipped.md`, `post-mvp-cleanup.md`, `mvp/`
- `.claude/rules/` — project-specific behavior rules loaded by Claude sessions
- `.husky/`, `.github/`, `.vscode/`, `.forge/` — tooling

## Architecture summary

Two runtime contexts connected only by `postMessage`:

- **Extension host (Node):** `src/editor-provider.ts` registers a `CustomTextEditorProvider` for `viewType: humanMarkdown.preview`. It owns the `TextDocument`, manages webview HTML (with strict CSP + nonces), and shuttles edits between document and webview. Toggle to raw uses `vscode.openWith` to swap the editor type in the same tab — never a separate panel. Configuration (`humanMarkdown.theme`, `defaultMode`) is resolved via `src/theme-resolver.ts`.
- **Webview (browser):** `webview/editor/index.ts` boots Milkdown with selective imports (commonmark + gfm presets, listener plugin), a CodeMirror-backed code-block nodeView, a custom math plugin/view, and a frontmatter plugin. Shiki/KaTeX/Mermaid are loaded as static `<script>` IIFE bundles (not dynamic `import()` — doesn't work in `vscode-webview://`), gated by a viewport observer to only mount when visible.

Theme tokens are defined once in `webview/shared/theme/tokens.ts` and applied as CSS custom properties — no inline styles. Round-trip fidelity (markdown → edit → markdown without spurious diffs) is a hard invariant; `webview/shared/remark-tight-lists.ts` patches a known Remark serializer gap.

## ADRs

Single file: `docs/adrs/adrs.md`.

- **ADR-001 — Milkdown as WYSIWYG Engine with ProseMirror Fallback** (Accepted). Milkdown chosen over Tiptap/BlockNote/Lexical/Plate/MDXEditor/raw ProseMirror. Boundary: only use Milkdown plugin API, no direct ProseMirror or DOM manipulation. Fallback is custom ProseMirror+Remark bridge if spike fails.
- **ADR-002 — CustomTextEditorProvider for Same-Tab Editing** (Accepted). Own the editor tab via `CustomTextEditorProvider`; toggle to raw via `vscode.openWith`. No `WebviewPanel`, no sidebar/panel views.
- **ADR-003 — Shared Rendering Pipeline** (Retired). No read-only preview exists; Milkdown handles all rendering with its own Remark. Theme tokens still shared via CSS custom properties.

## Rules (`.claude/rules/`)

- **behavior-bundle-performance.md** — Selective Milkdown imports only (never Crepe/415KB). Lazy-load Mermaid/KaTeX.
- **behavior-custom-editor-provider.md** — All webview content through `CustomTextEditorProvider`; raw toggle uses `vscode.openWith` (enforces ADR-002).
- **behavior-milkdown-api-boundary.md** — All editing via Milkdown plugin API; no direct ProseMirror or DOM manipulation (enforces ADR-001).
- **behavior-round-trip-fidelity.md** — Editor must not introduce formatting changes the user didn't make (indent style, blank lines, list markers, etc.).
- **behavior-shared-rendering-pipeline.md** — ADR-003 retired: no markdown-it pipeline. Theme tokens via CSS custom properties only, no inline styles.
- **behavior-webview-security.md** — Strict CSP with nonces; `unsafe-eval` allowed only because Mermaid needs `Function("return this")`. Heavy libs as static IIFE `<script>` tags, not dynamic `import()`.
- **convention-extension-architecture.md** — Strict boundary: `src/` is Node (no DOM), `webview/` is browser (no Node/fs/VSCode API).
- **resume.md** — Transient session-resume note, not a durable rule (safe to ignore for review).

## Conventions

- Files: kebab-case. Classes: PascalCase. Functions/variables: camelCase.
- Tests co-located: `*.test.ts` next to source (e.g. `webview/editor/round-trip.test.ts`, `webview/editor/bundle-size.test.ts`, `webview/shared/theme/tokens.test.ts`). `test/` holds host fixtures only.
- Biome: single quotes, 2-space indent, 100 line width, semicolons asNeeded. `organizeImports` on. Ignores: `dist/`, `node_modules/`, `*.vsix`.
- Branch prefixes: `feat/`, `fix/`, `chore/`, `refactor/`, `docs/`. Never commit to main; PR-based flow.
- Strict TS; avoid `any`.

## Key entry points

- Extension host activation: `src/extension.ts`
- Custom editor provider: `src/editor-provider.ts`
- Host↔webview message contracts: `src/messages.ts`
- Theme resolution: `src/theme-resolver.ts`
- Webview boot: `webview/editor/index.ts`
- Webview styles: `webview/editor/styles.ts`, `webview/editor/editor.css`
- Theme tokens: `webview/shared/theme/tokens.ts`
- Round-trip helper: `webview/shared/remark-tight-lists.ts`
- Build config: `esbuild.config.mjs`
- Package manifest / VSCode contributions: `package.json`

## Recent change classes (last ~30 commits)

- **MVP foundation (PRs #1–#7):** prototype spike, extension shell + postMessage, rendering pipeline (later partly retired), WYSIWYG editor (Milkdown + code blocks + mermaid + keyboard nav), theming (auto/light/dark/github), stability & security (error boundaries, XSS suite, viewport-aware rendering), in-place mode toggle with embedded CodeMirror raw editor.
- **Post-MVP cleanup (PR #8):** CSP tightening, frontmatter fixes, Shiki integration, task lists, dead-code removal (ADR-003 retirement).
- **Raw-mode bug fixes (PR #22):** raw mode cursor positioning broken by CSS zoom on `<html>` — fixed.
- **Webview CSS refactor + theming polish (PR #23):** extracted webview CSS, refined theme tokens, fixed code-block interaction.
- **Frontmatter / code-block / dirty-state fixes (PR #24):** frontmatter dark mode coloring, code block padding, external-edit dirty state.
- **Link handling (PR #25):** cmd+click on links now opens correctly instead of erroring.
- **0.1.0 release prep:** KaTeX math integration, marketplace packaging, MIT license.

## Things to watch in review

- **Round-trip fidelity regressions.** Hard invariant per rule + ADR. Any change touching Milkdown plugins, Remark config, `remark-tight-lists`, or fixture handling needs verification against `webview/editor/round-trip.test.ts` + `__fixtures__/`. Past bugs hid in tight-list serialization and frontmatter handling.
- **Bundle size budget.** `webview/editor/bundle-size.test.ts` enforces budgets. Watch for new Milkdown imports pulling in Crepe (415KB), unconditional Mermaid/KaTeX, or accidental React. Lazy-load gates (`viewport-observer.ts`, `*-loader.ts` files) must remain in place.
- **Webview CSP / security.** Any new inline scripts, dynamic `import()` in webview, or new external resources must respect the nonce + `webview.cspSource` policy. `unsafe-eval` is intentional (Mermaid); don't broaden further. No inline styles — use CSS custom properties from `tokens.ts`.
- **ADR boundary violations.** Direct ProseMirror calls outside Milkdown plugins, DOM manipulation for editing, or `WebviewPanel` usage are red flags (violate ADR-001/002). Also: anything resurrecting a markdown-it pipeline (ADR-003 retired).
- **Host/webview context bleed.** `src/` must not import DOM types or webview modules; `webview/` must not import `vscode` or Node builtins. Convention is enforced socially, not by tsconfig project refs.
- **Raw-mode / toggle edge cases.** Recent fixes (#22, #25, dirty-state in #24) suggest the toggle + external-edit path is fragile. Scrutinize changes to `editor-provider.ts` lifecycle, `vscode.openWith` flow, and CodeMirror raw editor mount/unmount.
- **Test coverage gaps.** `src/providers/`, `src/rendering/`, `src/themes/`, `src/utils/`, `webview/preview/` are empty directory stubs — no host-side unit tests beyond fixtures. New host logic typically ships without tests; flag this when reviewing meaningful host changes.
