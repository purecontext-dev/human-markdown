---
title: "MVP Plan"
project: "human-markdown"
date: 2026-05-09
---

# MVP Plan: Human Markdown

## Overview

Human Markdown is a WYSIWYG markdown editor for VSCode. Users open markdown files, read them rendered, edit them inline, and toggle to raw with one keystroke. The MVP delivers full WYSIWYG editing, complete markdown rendering, three built-in themes, and rock-solid stability.

## Requirements

- WYSIWYG editing via Milkdown (ProseMirror + Remark) with full block-type coverage
- Same-tab toggle between WYSIWYG and raw mode (`Cmd+Shift+V`)
- Complete markdown rendering: GFM, Shiki, KaTeX, Mermaid, frontmatter cards, task lists, tables, footnotes
- Built-in themes: Light, Dark, GitHub
- Stability: error boundaries, graceful degradation, webview lifecycle management
- Security: strict CSP, no XSS, adversarial test suite

## Architectural Notes

- Two runtime contexts: extension host (Node.js) and webview (browser), connected via `postMessage`
- `CustomTextEditorProvider` owns the editor tab for `.md` files
- Shared rendering pipeline feeds both read-only preview and WYSIWYG modes (ADR-003)
- Milkdown is primary editor engine; custom ProseMirror + Remark bridge is fallback (ADR-001)
- Prototype spike validates Milkdown before full development (GATE)

## Risk Flags

1. **Milkdown round-trip fidelity** — Critical. Must preserve original formatting. Prototype spike validates.
2. **Bundle size** — Full plugin set (KaTeX, Mermaid, Shiki, Milkdown) could exceed 500KB budget. Lazy-loading mitigates.
3. **Webview stability** — VSCode webviews have memory constraints. Must not repeat MPE's crash patterns.
4. **Table inline editing** — May fall back to raw markdown if quality bar isn't met.

## Dependencies

| Dependency | Purpose |
|-----------|---------|
| Milkdown | WYSIWYG editing engine |
| markdown-it + plugins | Rendering pipeline |
| gray-matter | Frontmatter parsing |
| Shiki | Syntax highlighting |
| KaTeX | Math rendering |
| Mermaid | Diagram rendering |
| @tailwindcss/typography | Theme foundation |
| esbuild | Bundler |

## Out of Scope

- Custom theming (JSON, Tailwind, VSCode inheritance) — Fast Follow
- Spell checking — Fast Follow
- Export (HTML, rich text) — Later
- Search within preview — Later
- Non-VSCode editors — Future
- Collaboration — Non-goal
- PDF export — Cut
- Outline/TOC — Cut
