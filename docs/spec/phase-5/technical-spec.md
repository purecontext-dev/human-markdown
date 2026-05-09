---
title: "Technical Specification"
phase: 5
project: "markdown-preview"
date: 2026-05-09
status: draft
---

# Technical Specification

## System Overview

Human Markdown is a VSCode extension that provides WYSIWYG markdown editing inside editor tabs. The system has two runtime contexts: the **extension host** (Node.js process managed by VSCode) and the **webview** (browser-like environment rendered in the editor tab). These communicate via VSCode's `postMessage` API.

The extension host owns document lifecycle, file I/O, and configuration. The webview owns rendering, editing (Milkdown), and theming. The rendering pipeline is shared — the same markdown-it configuration and theme tokens feed both read-only preview and WYSIWYG editing modes.

## Architecture Diagram

```
┌──────────────────────────────────────────────────────┐
│ VSCode Extension Host (Node.js)                      │
│                                                      │
│  ┌─────────────────────┐  ┌───────────────────────┐  │
│  │ CustomTextEditor     │  │ Configuration         │  │
│  │ Provider             │  │ Manager               │  │
│  │                      │  │                       │  │
│  │ - Register for .md   │  │ - Theme loading       │  │
│  │ - Webview lifecycle  │  │ - Tailwind config     │  │
│  │ - TextDocument sync  │  │   parsing             │  │
│  │ - State persistence  │  │ - Settings            │  │
│  └──────────┬───────────┘  └───────────┬───────────┘  │
│             │                          │              │
│             │     postMessage API      │              │
│             └──────────┬───────────────┘              │
└────────────────────────┼─────────────────────────────┘
                         │
┌────────────────────────┼─────────────────────────────┐
│ Webview (Browser)      │                              │
│                        ▼                              │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Rendering Pipeline                              │  │
│  │                                                 │  │
│  │ markdown → gray-matter → markdown-it → plugins  │  │
│  │                         → theme injection → HTML│  │
│  └──────────────────────┬──────────────────────────┘  │
│                         │                              │
│         ┌───────────────┼───────────────┐              │
│         ▼                               ▼              │
│  ┌──────────────┐              ┌──────────────────┐    │
│  │ Read-Only    │              │ Milkdown Editor  │    │
│  │ Preview      │              │                  │    │
│  │              │              │ - ProseMirror    │    │
│  │ Rendered HTML│              │ - Remark bridge  │    │
│  │ (no editing) │              │ - Block nodeViews│    │
│  └──────────────┘              │ - Bidirectional  │    │
│                                │   document sync  │    │
│                                └──────────────────┘    │
│                                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Theme Engine                                    │   │
│  │ CSS custom properties from active theme         │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

## Component Breakdown

### CustomTextEditorProvider

**Responsibility:** Owns the editor tab for markdown files. Manages the webview lifecycle and bidirectional communication with the webview.

- Registers for `*.md` file types
- Creates webview when a markdown file is opened
- Sends document content to webview on open and on external changes
- Receives edited content from webview and applies to `TextDocument`
- Manages toggle between WYSIWYG and raw mode via `vscode.openWith`
- Persists webview state (scroll position, collapsed sections) via `webview.setState`/`getState`
- Retains webview when toggling to raw mode (don't destroy/recreate)
- Disposes webview when the editor tab closes

### Rendering Pipeline

**Responsibility:** Transforms markdown source into rendered HTML. Shared by both read-only preview and Milkdown editor.

- `gray-matter`: Extract YAML frontmatter and body
- `markdown-it`: Parse and render body with plugin chain
- Plugin set: GFM tables, task lists, footnotes, heading anchors, containers, Shiki (syntax highlighting), KaTeX (math), Mermaid (diagrams)
- Theme injection: Apply CSS custom properties from active theme
- Output: HTML string (for preview) or ProseMirror document (for Milkdown)

### Milkdown Editor

**Responsibility:** WYSIWYG editing in the webview. The core product.

- ProseMirror editor with Remark-based markdown serialization
- Full block-type coverage via node views: paragraphs, headings, lists (ordered, unordered, task), code blocks (with Shiki highlighting), blockquotes, tables, images
- Block-level editing: click to edit inline, click away to re-render
- Bidirectional sync: edits produce clean markdown, written back to `TextDocument` via postMessage
- Round-trip fidelity: preserve original formatting choices, never introduce changes the user didn't make
- Inline table editing (attempt first, fall back to raw if quality bar isn't met)
- Task list checkboxes interactive in rendered state (toggle writes back to document)

### Configuration Manager

**Responsibility:** Theme loading, settings management, Tailwind config parsing.

- Load built-in themes (Light, Dark, GitHub) from bundled JSON
- Load custom JSON themes from user-specified paths
- Parse `tailwind.config.js/ts` to extract theme tokens (Fast Follow)
- Map VSCode's `--vscode-*` CSS custom properties to Human Markdown tokens (Fast Follow)
- Watch config files for changes — trigger webview re-render on theme change
- Manage extension settings (default mode, keybinding, theme selection)

### Theme Engine (Webview)

**Responsibility:** Apply theme tokens as CSS custom properties in the webview.

- Receives theme tokens from extension host via postMessage
- Injects as CSS custom properties on the webview root
- `@tailwindcss/typography` prose classes consume the custom properties
- Theme changes apply immediately (CSS swap, no re-parse)

## Data Flow

### Opening a Markdown File

1. User opens a `.md` file in VSCode
2. `CustomTextEditorProvider.resolveCustomTextEditor()` is called
3. Extension host reads `TextDocument` content
4. Extension host loads active theme configuration
5. Extension host sends document content + theme tokens to webview via `postMessage`
6. Webview rendering pipeline processes markdown → HTML
7. Milkdown initializes with the parsed document
8. User sees rendered, editable content

### Editing a Block

1. User clicks a rendered block in the webview
2. Milkdown's ProseMirror nodeView transitions the block to edit mode
3. User edits the block content (raw markdown visible, styled)
4. User clicks away or presses Escape
5. Milkdown serializes the ProseMirror document back to markdown via Remark
6. Webview sends updated markdown to extension host via `postMessage`
7. Extension host applies the change to the `TextDocument` (preserves undo history)
8. Block re-renders in the webview

### Toggling to Raw Mode

1. User presses `Cmd+Shift+V`
2. Extension host calls `vscode.openWith` to switch to default text editor
3. Webview is retained (not destroyed) — state persists
4. VSCode shows the same `TextDocument` in raw text editor
5. User edits in raw mode with full VSCode language features
6. User presses `Cmd+Shift+V` again
7. Extension host calls `vscode.openWith` to switch back to custom editor
8. Webview receives updated document content and re-renders

## Integration Points

| System | Integration | Failure Mode |
|--------|------------|--------------|
| VSCode Extension API | `CustomTextEditorProvider`, webview API, `TextDocument` | Extension won't activate — can't recover, this is the platform |
| VSCode Marketplace | Publishing via `vsce` + GitHub Actions | Manual publishing as fallback |
| File system | Read theme configs, Tailwind configs | Default theme if config not found |

## System Boundaries

**In scope:**
- Everything that runs inside VSCode (extension host + webview)
- Local file reading (themes, Tailwind configs)
- Webview rendering and editing

**Out of scope:**
- Network requests (no telemetry, no remote themes, no update checking beyond VSCode's built-in)
- Server-side anything
- Multi-file operations (search across files, tag filtering)
- Collaboration / real-time sync

## Performance Requirements

| Metric | Target | Priority |
|--------|--------|----------|
| File open → rendered content visible | < 200ms for files under 500 lines | Must have |
| Mode toggle (WYSIWYG ↔ raw) | < 100ms perceived | Must have |
| Block edit → re-render | < 50ms | Must have |
| Theme change | Instant (CSS swap) | Must have |
| Large file (2000+ lines) | Render with virtualization, no hang | Must have |
| Extension activation | < 500ms | Nice to have |
| Bundle size (webview) | < 500KB gzipped | Nice to have |

## Prototype Spike: Milkdown Validation

Before full development, a focused prototype spike to validate:

1. **Round-trip fidelity**: Load real-world markdown files (CLAUDE.md, blog posts, READMEs with tables, specs with frontmatter). Edit blocks. Verify output markdown matches original formatting.
2. **Webview stability**: Run Milkdown in a VSCode webview for extended use. Monitor memory, check for leaks, test with large documents.
3. **Block editing UX**: Validate that ProseMirror nodeViews can deliver the interaction pattern from the UI/UX spec (click to edit inline, click away to re-render).
4. **Table editing**: Attempt inline table editing via Milkdown's table plugin. Assess quality.
5. **Bundle size**: Measure selective Milkdown imports + all rendering plugins. Compare against 500KB budget.

**Exit criteria:** If 3+ of these 5 criteria fail, pivot to custom ProseMirror + Remark bridge.

**Estimated spike duration:** 3-5 days.
