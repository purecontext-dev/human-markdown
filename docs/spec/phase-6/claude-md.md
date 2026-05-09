---
title: "CLAUDE.md"
phase: 6
project: "markdown-preview"
date: 2026-05-09
status: draft
---

# CLAUDE.md

```markdown
# Human Markdown

A WYSIWYG markdown editor for VSCode. Open a markdown file, read it rendered, edit it inline. Toggle to raw with one keystroke. Theme it to match your blog or GitHub.

**Repo:** github.com/purecontext-dev/human-markdown
**License:** MIT

## Key Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install dependencies |
| `pnpm build` | Build extension (extension host + webview via esbuild) |
| `pnpm dev` | Watch mode — rebuilds on change |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm lint` | Lint and format check (Biome) |
| `pnpm lint:fix` | Auto-fix lint and format issues |
| `pnpm package` | Package as .vsix for local install |
| `pnpm typecheck` | TypeScript type checking |

To test the extension: press F5 in VSCode to launch the Extension Development Host.

## Architecture

Two runtime contexts connected by VSCode's `postMessage` API:

**Extension Host (Node.js):**
- `CustomTextEditorProvider` — registers for `.md` files, manages webview lifecycle, syncs `TextDocument`
- Configuration Manager — theme loading, Tailwind config parsing, settings

**Webview (Browser):**
- Milkdown editor (ProseMirror + Remark) — WYSIWYG editing with block-level nodeViews
- Rendering pipeline — markdown-it + plugins (shared by preview and edit modes)
- Theme engine — CSS custom properties from active theme

Data flow: Extension host sends document content + theme tokens to webview. Webview sends edited markdown back. Extension host applies changes to `TextDocument`.

### Key Boundaries

- Extension host code runs in Node.js — it has filesystem access but no DOM
- Webview code runs in a browser sandbox — it has DOM but no Node.js APIs or filesystem access
- All communication between them goes through `postMessage` — no shared state
- The rendering pipeline is shared by both read-only preview and WYSIWYG edit modes — changes to rendering affect both

## Conventions

### File Organization

- Extension host source: `src/`
- Webview source: `webview/`
- Built-in themes: `src/themes/` (JSON files)
- Tests co-located: `*.test.ts` next to source files
- esbuild configs produce separate bundles for extension host (CJS) and webview (ESM)

### Naming

- Files: kebab-case (`preview-provider.ts`, `theme-engine.ts`)
- Classes: PascalCase
- Functions/variables: camelCase
- Constants: SCREAMING_SNAKE_CASE
- Types/interfaces: PascalCase, no `I` prefix

### Code Style

- Biome handles formatting and linting
- Semicolons: as needed
- Quotes: single
- Indent: 2 spaces
- Line width: 100

## Architectural Rules

These come from ADRs — do not violate without updating the ADR.

1. **All WYSIWYG editing goes through Milkdown's plugin API.** No direct ProseMirror API usage outside the plugin system. No DOM manipulation in the webview for editing purposes. (ADR-001)

2. **All webview content goes through `CustomTextEditorProvider`.** No standalone webview panels. Raw mode toggle uses `vscode.openWith`, not a separate editor instance. Webview is retained (not destroyed) when toggling to raw. (ADR-002)

3. **Rendering plugins are registered in the shared pipeline.** No mode-specific plugins. Theme tokens defined once, consumed by both modes. All styling through CSS custom properties — no inline styles. (ADR-003)

4. **Strict CSP on all webviews.** Script-src uses nonces only. No eval, no inline scripts, no javascript: URIs. No network requests from the webview. (Security checklist)

5. **All frontmatter values are escaped before rendering.** Never use innerHTML with user-provided data. (Security checklist)

6. **Mermaid runs with `securityLevel: 'strict'`. KaTeX runs in strict mode.** (Security checklist)

## Behavioral Notes

- This is a VSCode extension, not a web app. No server, no database, no API.
- The prototype spike (Milkdown validation) should be completed before full feature development. If 3+ of 5 spike criteria fail, pivot to custom ProseMirror + Remark bridge.
- Round-trip fidelity is critical — the editor must never introduce formatting changes the user didn't make. Test against real-world markdown files.
- Bundle size matters. Use selective Milkdown imports (not Crepe). Lazy-load Mermaid and KaTeX — only when the document contains those block types. Target < 500KB gzipped for the webview bundle.
- Performance targets: file open < 200ms, toggle < 100ms, block re-render < 50ms.
- No telemetry, no network requests, no tracking. This extension is local-only.

## Testing

- Unit tests with Vitest, co-located with source
- Focus testing on: rendering pipeline output, round-trip fidelity (markdown → edit → markdown), theme token injection, frontmatter parsing
- Adversarial XSS test suite: markdown files designed to trigger script injection. Any rendering output containing `<script`, `onerror`, `javascript:`, or unescaped HTML attributes is a test failure.
- No webview integration tests — VSCode extension integration testing is not worth the investment for this project.
```
