---
title: "Information Architecture"
phase: 4
project: "markdown-preview"
date: 2026-05-09
status: draft
---

# Information Architecture

Human Markdown is a single-file editor embedded in a VSCode tab, not a multi-view application. The information architecture is intentionally minimal — the product's complexity lives in interaction design, not navigation.

## Top-Level Structure

There are two modes and one settings surface:

| Area | Description |
|------|-------------|
| **WYSIWYG Mode** | The default. Rendered markdown with inline editing. This is where users spend most of their time. |
| **Raw Mode** | Standard VSCode text editor. Full language features, syntax highlighting, extensions. Toggle back with one keystroke. |
| **Settings** | VSCode's standard extension settings UI. Theme selection, default mode, keybinding config, Tailwind config path. |

There is no sidebar, no file browser, no multi-panel layout. Human Markdown takes over the editor tab for a single markdown file. The user's existing VSCode layout (sidebar, terminal, other tabs) is untouched.

## Navigation Model

Navigation is mode-based, not spatial:

- **Toggle keybinding** (`Cmd+Shift+V`): switches between WYSIWYG and raw mode in the same tab
- **Command palette**: theme selection, settings, export commands
- **Context menu**: right-click options in WYSIWYG mode (copy as rich text, export)
- **No persistent navigation elements** — the editor tab itself is the navigation

## Content Hierarchy

Within the WYSIWYG view, a rendered markdown document has this visual hierarchy:

1. **Frontmatter card** (collapsible, top of document) — metadata rendered as styled key-value pairs
2. **Document body** — rendered markdown content in a single scrollable view
3. **Block-level elements** — each block (heading, paragraph, list, code block, table, etc.) is an independently editable unit

There is no nesting beyond what the markdown itself contains. The hierarchy is the document's own structure.

## URL / Route Structure

Not applicable — Human Markdown is a VSCode extension, not a web app. There are no routes. The extension activates on markdown file types and registers a `CustomTextEditorProvider`.

## Search & Discovery

- **In raw mode**: VSCode's built-in `Cmd+F` search works on raw markdown
- **In WYSIWYG mode** (Later tier): `Cmd+F` searches rendered content
- **No other discovery mechanisms** — this is a file editor, not a content management system

## Key Navigation Flows

### Flow 1: Open and Read
1. Open a `.md` file in VSCode
2. File opens in WYSIWYG mode (default setting)
3. Read rendered content — scroll, collapse/expand frontmatter
4. Close tab or navigate to another file

### Flow 2: Open, Read, and Edit
1. Open a `.md` file — opens in WYSIWYG mode
2. Click a block to edit it inline (block reveals editable content)
3. Edit, click away or press Escape to re-render
4. Changes auto-save per VSCode's settings (or manual `Cmd+S`)

### Flow 3: Toggle to Raw
1. In WYSIWYG mode, press `Cmd+Shift+V`
2. View switches to raw markdown at the same scroll position
3. Edit with full VSCode language features
4. Press `Cmd+Shift+V` to return to WYSIWYG

### Flow 4: Change Theme
1. Open command palette (`Cmd+Shift+P`)
2. Type "Human Markdown: Select Theme"
3. Choose from built-in themes or configured custom themes
4. Preview updates immediately

### Flow 5: Configure Tailwind Theme (Fast Follow)
1. Open extension settings
2. Set `humanMarkdown.tailwindConfig` path to `tailwind.config.js`
3. WYSIWYG view re-renders with extracted theme tokens
4. Config file is watched — changes auto-reload
