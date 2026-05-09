---
title: "Product Requirements Document"
phase: 3
project: "markdown-preview"
date: 2026-05-08
status: draft
seeded_from: "cairn/projects/markdown-preview/spec.md"
---

# Product Requirements Document

## Overview

Human Markdown is a VSCode extension that replaces the default markdown preview experience with an in-tab toggle, rich rendering, custom theming, and (in later phases) inline WYSIWYG editing. The product ships in four priority tiers, with P1 (Core/MVP) targeted for initial release.

## User Stories

[TODO: User stories need to be written against actual personas from Phase 1. The stories below are derived from the feature spec but lack proper persona grounding.]

### Preview & Toggle

- As a developer, I want to toggle between raw markdown and rendered preview in the same tab so that I don't lose screen space to a side panel.
- As a developer, I want my cursor position and scroll position preserved across toggles so that switching feels seamless.
- As a developer, I want unsaved changes preserved when toggling so that I don't lose work.

### Rendering

- As a developer, I want GitHub Flavored Markdown rendered correctly so that my READMEs look right.
- As a developer, I want syntax-highlighted code blocks with a copy button so that I can review and share code samples.
- As a content creator, I want math (KaTeX) and diagram (Mermaid) rendering so that technical documents render completely.
- As a developer, I want YAML frontmatter displayed as a styled metadata card so that I can see document metadata without parsing it mentally.

### Theming

- As a blog author, I want to point the extension at my Tailwind config so that my preview matches my published site.
- As a developer, I want the preview to match my VSCode color theme so that it doesn't clash with my editor.
- As a developer, I want to define custom themes via a simple JSON format so that I can customize the preview without CSS.

### Export

- As a developer, I want to export rendered markdown as standalone HTML so that I can share formatted documents.
- As a content creator, I want to copy rendered markdown as rich text so that I can paste into Google Docs, Slack, or email with formatting preserved.

### WYSIWYG Editing

- As a developer, I want to edit directly in the rendered view so that I can read and edit in the same mode.
- As a developer, I want to click a rendered block to reveal its raw markdown so that I can make precise edits when needed.

## Feature Specifications

### MVP

#### WYSIWYG Editing (Milkdown)

The core product. WYSIWYG editing via Milkdown (ProseMirror + Remark) in a VSCode webview. Bidirectional sync: edits write back to the `TextDocument` as clean markdown.

**Full block-type coverage:**
- Paragraphs and headings (h1-h6)
- Lists (ordered, unordered, task lists)
- Code blocks with syntax highlighting
- Blockquotes
- Tables (with proper alignment, editable in-place)
- Images
- Inline formatting (bold, italic, strikethrough, code, links)

**Block-level editing:** Click a rendered block to reveal its raw markdown for precise editing. Click away to re-render.

**Round-trip fidelity requirements:**
- Clean, predictable markdown output
- Preserve original formatting choices (indent style, blank lines, heading style)
- Never introduce formatting changes the user didn't make
- Test against a corpus of real-world markdown files (CLAUDE.md, blog posts, specs, READMEs)

**Editor engine:** Milkdown primary, with custom ProseMirror + Remark bridge as fallback if Milkdown doesn't meet quality bar. Prototype spike required early in development to validate round-trip fidelity and webview stability.

#### Same-Tab Toggle

Register a `CustomTextEditorProvider` for markdown files. Use `vscode.openWith` to swap between WYSIWYG view and raw text editor. Default keybinding: `Cmd+Shift+V`.

**Behavior:**
- WYSIWYG mode: rendered, editable markdown in a webview
- Raw mode: standard VSCode text editing, full language features
- Toggle preserves: cursor position (mapped to nearest element), scroll position, unsaved changes
- Document remains the same `TextDocument` — VSCode handles save, undo, dirty state

[Open Decision] `CustomTextEditorProvider` needs validation as the right API. Edge cases with extension conflicts, language features in raw mode, and `TextDocument` lifecycle management need investigation during Phase 5.

[Open Decision] Overriding `Cmd+Shift+V` replaces a built-in VSCode behavior. Likely the right default since Human Markdown supersedes the built-in preview, but should be configurable.

#### Complete Markdown Rendering

Everything a valid markdown file can contain, Human Markdown renders. No "unsupported syntax" messages.

**Rendering pipeline:** markdown-it with full plugin set:
- GFM (tables, task lists, strikethrough, autolinks)
- Shiki — syntax highlighting (VSCode-native, TextMate grammar compatible)
- KaTeX — math rendering
- Mermaid — diagram rendering
- `markdown-it-footnote` — footnotes
- `markdown-it-anchor` — heading anchors
- `markdown-it-container` — custom containers (admonitions, callouts)

**Quality targets:**
- Code blocks with syntax highlighting and copy button
- Tables with proper alignment
- Images with lazy loading
- Links open in browser (not webview)

**Bundle size strategy:** Lazy-load heavy plugins (Mermaid, KaTeX) — only load when the document contains those block types. Selective Milkdown imports (avoid Crepe's 415KB bundle). Measure and set a budget.

#### Frontmatter Rendering

Parse YAML frontmatter via `gray-matter`. Render as a styled metadata card:
- Dates: formatted human-readable
- Arrays: rendered as pills/tags
- Booleans: styled indicators
- Strings: plain text
- On parse failure: fall back to styled YAML code block
- Collapsible — user can hide frontmatter

#### Built-in Themes

Three themes out of the box:
- **Light** — clean, warm, readability-optimized
- **Dark** — true dark background, soft contrast
- **GitHub** — matches GitHub's actual markdown rendering (READMEs, PRs, wikis)

All built on `@tailwindcss/typography` prose classes. Theme selection via command palette and extension settings.

#### Stability

- Webview lifecycle management — clean create/dispose, no zombie webviews
- Memory-conscious rendering — virtualize long documents, lazy-render off-screen content
- Error boundaries — rendering failures in one section don't take down the editor
- Graceful degradation — if a plugin (Mermaid, KaTeX) fails to render, show the raw block with an error indicator

### Fast Follow

#### Custom Theming

- **JSON themes**: Users define design tokens (colors, fonts, spacing) in a JSON file. Extension injects as CSS custom properties into the webview.
- **Tailwind config import**: Point at a `tailwind.config.js/ts`, extension extracts theme tokens automatically. Watch the config file for changes — live reload the preview when tokens change. Your blog draft looks like your blog.
- **VSCode theme integration**: Optionally inherit from active VSCode color theme via `--vscode-*` CSS custom properties.

#### Spell Checking

Spell check in the WYSIWYG view, operating on rendered prose rather than raw markdown syntax. Existing VSCode spell checkers (cSpell) work on raw markdown and flag syntax characters and code blocks. Human Markdown checks spelling in the context where you're actually reading and editing.

### Later

#### Export

- **HTML** — standalone file with inline styles (no external dependencies)
- **Copy as Rich Text** — paste into Google Docs, Slack, email with formatting preserved

#### Search Within Preview

`Cmd+F` in WYSIWYG mode searches rendered content, not raw markdown. Highlights matches in the rendered view.

## Scope Boundaries

- **VSCode only.** No JetBrains, Zed, standalone, mobile, or web versions in v1.
- **No collaboration.** Single-user editor. No real-time co-editing, shared cursors, or commenting.
- **No file management.** Not a vault, not a note-taking app. Open a file, work with it, done.
- **No markdown linting or reformatting.** Human Markdown presents content as-is. It doesn't enforce style rules or rewrite markdown beyond what the user explicitly edits.
- **No PDF export.** No real user job behind it.
- **No outline/TOC.** VSCode's built-in outline view is sufficient.

## Edge Cases & Error Handling

- **Malformed markdown:** Render what's parseable, show raw blocks for anything that fails. Never crash.
- **Very large files:** Virtualize rendering — only render visible content plus a buffer. Lazy-load off-screen sections.
- **Conflicting extensions:** If another extension claims markdown file types, Human Markdown should coexist. Document known conflicts.
- **Webview resource limits:** Monitor memory usage. Dispose and recreate webview if it exceeds thresholds rather than letting it degrade.
- **Binary content in markdown:** Images render via URLs/paths. Embedded binary content (base64 images) should render but with size limits to prevent memory issues.

## Dependencies & Integrations

| Dependency | Type | Purpose |
|-----------|------|---------|
| VSCode Extension API | Required | `CustomTextEditorProvider`, webview lifecycle |
| Milkdown | Required | WYSIWYG editing engine (ProseMirror + Remark) |
| markdown-it | Required | Rendering pipeline |
| gray-matter | Required | Frontmatter parsing |
| Shiki | Required | Syntax highlighting |
| KaTeX | Required | Math rendering |
| Mermaid | Required | Diagram rendering |
| @tailwindcss/typography | Required | Theme foundation |
| esbuild | Build | Bundler for extension host (CJS) + webview (ESM) |

## Open Questions

- [ ] GitHub org: `purecontext-dev` or `jeffreese` personal?
- [ ] Marketplace publisher account setup
- [ ] `CustomTextEditorProvider` API validation — confirmed as right approach? (Phase 5 investigation)
- [ ] Milkdown prototype spike — validate round-trip fidelity and webview stability before full commitment
- [ ] Bundle size budget — what's the acceptable load time for the webview?
