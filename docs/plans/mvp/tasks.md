---
title: "MVP Tasks"
project: "human-markdown"
date: 2026-05-09
---

# MVP Tasks

## Epic 1: Project Scaffolding

- [x] Initialize repo (pnpm, TypeScript, Biome, Vitest, husky + lint-staged) (completed during export)
- [x] Configure esbuild for dual targets (extension host CJS + webview ESM) (completed during export)
- [x] Create `package.json` extension manifest (contributes, activation events, commands) (completed during export)
- [x] Set up GitHub Actions (lint, typecheck, test on push; vsce package + publish on tag) (completed during export)
- [x] Create VSCode launch config for Extension Development Host (F5 debugging) (completed during export)

## Epic 2: Prototype Spike (GATE)

- [x] Minimal webview with Milkdown editor loading a hardcoded markdown string
- [x] Round-trip fidelity test: load 5+ real-world .md files, edit blocks, compare output
- [x] Block editing UX: validate nodeView click-to-edit, click-away-to-render
- [x] Table editing: attempt inline cell editing via Milkdown table plugin
- [x] Bundle size measurement: selective imports, measure gzipped webview size
- [x] Spike decision: pass/fail assessment against 5 criteria (3+ must pass to proceed)

## Epic 3: Extension Shell

- [x] Implement `CustomTextEditorProvider` — register for `.md` files
- [x] Webview creation and lifecycle (create, retain on toggle, dispose on tab close)
- [x] Document sync: send TextDocument content to webview on open and external change
- [x] Mode toggle: `Cmd+Shift+V` switches between custom editor and default text editor
- [x] State persistence: scroll position and collapsed sections via `webview.setState`/`getState`

## Epic 4: Rendering Pipeline

- [x] markdown-it setup with GFM baseline (tables, task lists, strikethrough, autolinks)
- [x] Shiki integration for code block syntax highlighting
- [x] KaTeX integration for math rendering (lazy-loaded)
- [x] Mermaid integration for diagram rendering (lazy-loaded)
- [x] Footnotes, heading anchors, custom containers
- [x] Frontmatter parsing (gray-matter) and metadata card rendering
- [x] Code block copy button
- [x] Theme injection: CSS custom properties applied to rendered output

## Epic 5: WYSIWYG Editor

- [x] Milkdown editor initialization with shared rendering pipeline
- [x] Block nodeViews: paragraphs and headings (always-editable, theme-styled)
- [x] Block nodeViews: lists (ordered, unordered, task lists with interactive checkboxes)
- [x] Block nodeViews: code blocks (edit raw, render with Shiki)
- [x] Block nodeViews: blockquotes, images
- [x] Block nodeViews: tables (inline cell editing via GFM preset)
- [x] Bidirectional document sync: edits → markdown → TextDocument via postMessage
- [x] Round-trip fidelity test suite: real-world markdown corpus
- [x] Keyboard navigation: Tab/Shift+Tab between blocks, Escape to exit edit

## Epic 6: Theming

- [ ] Light theme (JSON design tokens + @tailwindcss/typography prose classes)
- [ ] Dark theme
- [ ] GitHub theme (match GitHub's actual markdown rendering)
- [ ] Theme selection via command palette
- [ ] Theme selection via extension settings

## Epic 7: Stability & Security

- [ ] Webview CSP: strict content security policy with nonces
- [ ] Error boundaries: rendering failures isolated per section
- [ ] Graceful degradation: plugin failures show raw block + error indicator
- [ ] Adversarial XSS test suite: corpus of malicious markdown files
- [ ] Large document handling: virtualization for 2000+ line files
- [ ] Memory monitoring: dispose off-screen content under pressure
- [ ] `pnpm audit` in CI — fail on high/critical vulnerabilities
