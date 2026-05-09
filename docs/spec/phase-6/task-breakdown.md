---
title: "Task Breakdown"
phase: 6
project: "markdown-preview"
date: 2026-05-09
status: draft
---

# Task Breakdown

## Epics Overview

1. **Project Scaffolding** — Repo setup, build pipeline, CI/CD
2. **Prototype Spike** — Validate Milkdown in VSCode webview (GATE: pass before continuing)
3. **Extension Shell** — CustomTextEditorProvider, webview lifecycle, mode toggle
4. **Rendering Pipeline** — markdown-it + plugins, frontmatter, theme injection
5. **WYSIWYG Editor** — Milkdown integration, block editing, document sync
6. **Theming** — Built-in themes, theme engine
7. **Stability & Security** — Error boundaries, CSP, adversarial tests, performance
8. **Fast Follow: Custom Theming** — JSON themes, Tailwind import, VSCode theme inheritance
9. **Fast Follow: Spell Checking** — Spell check in WYSIWYG view
10. **Later: Export** — HTML export, rich text copy
11. **Later: Search** — Search within rendered content

```
Scaffolding → Spike ─┬─(pass)──→ Extension Shell → Rendering → WYSIWYG Editor → Theming → Stability
                      │
                      └─(fail)──→ Custom ProseMirror Bridge → (rejoin at WYSIWYG Editor)
```

---

## Epic 1: Project Scaffolding

| # | Task | Size | MVP? | Dependencies |
|---|------|------|------|--------------|
| 1.1 | Initialize repo (pnpm, TypeScript, Biome, Vitest, husky + lint-staged) | S | Yes | None |
| 1.2 | Configure esbuild for dual targets (extension host CJS + webview ESM) | M | Yes | 1.1 |
| 1.3 | Create `package.json` extension manifest (contributes, activation events, commands) | S | Yes | 1.1 |
| 1.4 | Set up GitHub Actions (lint, typecheck, test on push; vsce package + publish on tag) | M | Yes | 1.1 |
| 1.5 | Create VSCode launch config for Extension Development Host (F5 debugging) | S | Yes | 1.2 |

### Acceptance Criteria

- `pnpm build` produces extension host and webview bundles
- `pnpm test` runs Vitest
- `pnpm lint` runs Biome
- F5 launches the extension in a development host
- GitHub Actions runs on push and succeeds

---

## Epic 2: Prototype Spike

| # | Task | Size | MVP? | Dependencies |
|---|------|------|------|--------------|
| 2.1 | Minimal webview with Milkdown editor loading a hardcoded markdown string | M | Yes | 1.2, 1.5 |
| 2.2 | Round-trip fidelity test: load 5+ real-world .md files, edit blocks, compare output | M | Yes | 2.1 |
| 2.3 | Block editing UX: validate nodeView click-to-edit, click-away-to-render | M | Yes | 2.1 |
| 2.4 | Table editing: attempt inline cell editing via Milkdown table plugin | S | Yes | 2.1 |
| 2.5 | Bundle size measurement: selective imports, measure gzipped webview size | S | Yes | 2.1 |
| 2.6 | Spike decision: pass/fail assessment against 5 criteria | S | Yes | 2.2-2.5 |

### Acceptance Criteria

- Round-trip: edited markdown output preserves original formatting (whitespace, heading style, indent style) for all test files
- Block editing: click a rendered paragraph/heading → editable state → click away → re-rendered. Smooth, no jarring transitions.
- Table editing: cells individually editable, or documented as needing raw fallback
- Bundle: < 500KB gzipped with all rendering plugins
- **GATE: 3+ of 5 criteria must pass to proceed. If not, pivot to Epic 2B (custom bridge).**

### Notes

Test corpus should include: a CLAUDE.md file, a blog post with frontmatter, a README with tables and badges, a spec with code blocks and mermaid diagrams, a file with KaTeX math.

---

## Epic 3: Extension Shell

| # | Task | Size | MVP? | Dependencies |
|---|------|------|------|--------------|
| 3.1 | Implement `CustomTextEditorProvider` — register for `.md` files | M | Yes | Epic 1 |
| 3.2 | Webview creation and lifecycle (create, retain on toggle, dispose on tab close) | M | Yes | 3.1 |
| 3.3 | Document sync: send TextDocument content to webview on open and external change | M | Yes | 3.2 |
| 3.4 | Mode toggle: `Cmd+Shift+V` switches between custom editor and default text editor | M | Yes | 3.2 |
| 3.5 | State persistence: scroll position and collapsed sections via `webview.setState`/`getState` | S | Yes | 3.2 |

### Acceptance Criteria

- Opening a `.md` file shows the custom editor (webview) by default
- `Cmd+Shift+V` toggles to raw text editor and back
- Scroll position preserved across toggles
- Webview not destroyed on toggle to raw
- Webview disposed when tab closes (no zombie webviews)

---

## Epic 4: Rendering Pipeline

| # | Task | Size | MVP? | Dependencies |
|---|------|------|------|--------------|
| 4.1 | markdown-it setup with GFM baseline (tables, task lists, strikethrough, autolinks) | M | Yes | 3.3 |
| 4.2 | Shiki integration for code block syntax highlighting | M | Yes | 4.1 |
| 4.3 | KaTeX integration for math rendering (lazy-loaded) | S | Yes | 4.1 |
| 4.4 | Mermaid integration for diagram rendering (lazy-loaded) | M | Yes | 4.1 |
| 4.5 | Footnotes, heading anchors, custom containers | S | Yes | 4.1 |
| 4.6 | Frontmatter parsing (gray-matter) and metadata card rendering | M | Yes | 4.1 |
| 4.7 | Code block copy button | S | Yes | 4.2 |
| 4.8 | Theme injection: CSS custom properties applied to rendered output | M | Yes | 4.1 |

### Acceptance Criteria

- All valid markdown syntax renders correctly in the webview
- Code blocks have syntax highlighting and a functioning copy button
- KaTeX renders math blocks and inline math
- Mermaid renders diagrams (lazy-loaded only when document contains mermaid blocks)
- Frontmatter displays as collapsible metadata card with typed formatting
- Links open in browser, not webview
- Images lazy-load

---

## Epic 5: WYSIWYG Editor

| # | Task | Size | MVP? | Dependencies |
|---|------|------|------|--------------|
| 5.1 | Milkdown editor initialization with shared rendering pipeline | L | Yes | Epic 4 |
| 5.2 | Block nodeViews: paragraphs and headings (click to edit, click away to render) | L | Yes | 5.1 |
| 5.3 | Block nodeViews: lists (ordered, unordered, task lists with interactive checkboxes) | M | Yes | 5.2 |
| 5.4 | Block nodeViews: code blocks (edit raw, render with Shiki) | M | Yes | 5.2 |
| 5.5 | Block nodeViews: blockquotes, images | M | Yes | 5.2 |
| 5.6 | Block nodeViews: tables (attempt inline cell editing) | L | Yes | 5.2 |
| 5.7 | Bidirectional document sync: edits → markdown → TextDocument via postMessage | L | Yes | 5.1 |
| 5.8 | Round-trip fidelity test suite: real-world markdown corpus | M | Yes | 5.7 |
| 5.9 | Keyboard navigation: Tab/Shift+Tab between blocks, Escape to exit edit | M | Yes | 5.2 |

### Acceptance Criteria

- All block types editable inline in the WYSIWYG view
- Task list checkboxes toggle in rendered state without entering edit mode
- Edits produce clean markdown that preserves original formatting
- Keyboard navigation works between blocks
- Round-trip test suite passes against the full test corpus

### Notes

This is the largest and highest-risk epic. 5.6 (table editing) may fall back to raw markdown editing if inline cell editing doesn't meet quality bar. 5.7 (document sync) is the most architecturally complex task — the bridge between Milkdown's ProseMirror document model and the TextDocument markdown must be reliable.

---

## Epic 6: Theming

| # | Task | Size | MVP? | Dependencies |
|---|------|------|------|--------------|
| 6.1 | Light theme (JSON design tokens + @tailwindcss/typography prose classes) | M | Yes | 4.8 |
| 6.2 | Dark theme | S | Yes | 6.1 |
| 6.3 | GitHub theme (match GitHub's actual markdown rendering) | M | Yes | 6.1 |
| 6.4 | Theme selection via command palette | S | Yes | 6.1 |
| 6.5 | Theme selection via extension settings | S | Yes | 6.1 |

### Acceptance Criteria

- Three themes available and switchable
- Theme changes apply instantly (CSS swap, no re-parse)
- GitHub theme matches GitHub's rendering for headings, code blocks, tables, blockquotes, and task lists
- Theme persists across sessions

---

## Epic 7: Stability & Security

| # | Task | Size | MVP? | Dependencies |
|---|------|------|------|--------------|
| 7.1 | Webview CSP: strict content security policy with nonces | S | Yes | 3.2 |
| 7.2 | Error boundaries: rendering failures isolated per section | M | Yes | 4.1 |
| 7.3 | Graceful degradation: plugin failures show raw block + error indicator | S | Yes | 4.3, 4.4 |
| 7.4 | Adversarial XSS test suite: corpus of malicious markdown files | M | Yes | 4.1 |
| 7.5 | Large document handling: virtualization for 2000+ line files | M | Yes | 5.1 |
| 7.6 | Memory monitoring: dispose off-screen content under pressure | M | Yes | 5.1 |
| 7.7 | `pnpm audit` in CI — fail on high/critical vulnerabilities | S | Yes | 1.4 |

### Acceptance Criteria

- No XSS possible through any markdown input (adversarial suite passes)
- Plugin failures don't crash the editor
- 2000+ line files render without hanging
- CSP blocks inline scripts and eval

---

## Implementation Sequence

### Phase 1: Foundation (Epics 1-2)
1. Project scaffolding (1 week)
2. Prototype spike (3-5 days) — **GATE**

### Phase 2: Core (Epics 3-5, sequential)
3. Extension shell (1 week)
4. Rendering pipeline (1-2 weeks)
5. WYSIWYG editor (2-3 weeks) — largest epic, critical path

### Phase 3: Polish (Epics 6-7, partially parallel)
6. Theming (1 week)
7. Stability & security (1 week, partially parallel with theming)

### MVP Ship

**Estimated MVP timeline: 7-10 weeks**

---

## Post-MVP Backlog

### Fast Follow

| Epic | Task | Size | Notes |
|------|------|------|-------|
| Custom Theming | JSON theme loading from user-specified path | M | |
| Custom Theming | Tailwind config import — parse and extract theme tokens | L | Watch for changes, live reload |
| Custom Theming | VSCode theme inheritance via `--vscode-*` CSS properties | M | |
| Spell Checking | Spell check in WYSIWYG view (rendered prose, not raw syntax) | L | Research integration approach — browser spellcheck API, or custom dictionary |

### Later

| Epic | Task | Size | Notes |
|------|------|------|-------|
| Export | HTML export — standalone file with inline styles | M | |
| Export | Copy as rich text — paste into Docs/Slack/email with formatting | M | |
| Search | `Cmd+F` searches rendered content in WYSIWYG mode | M | |
