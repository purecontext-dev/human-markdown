# Changelog

## 0.2.0 - 2026-05-20

- Three-way merge for external file changes — non-overlapping edits merge silently, conflicting edits show a conflict bar with "Accept External" / "Keep My Edits"
- FileSystemWatcher detects disk changes even when the document is dirty
- Scrollbar gutter stabilized — toolbar buttons no longer shift on mode toggle
- 18 architecture decision records documenting development choices

## 0.1.3 - 2026-05-20

- Cmd+F find bar with pluggable search backends (DOM search for WYSIWYG, CodeMirror search for raw mode)
- Cmd+S save support in the webview
- Tab/Shift+Tab indentation in raw mode

## 0.1.2 - 2026-05-20

- Upgrade CI to Node 22

## 0.1.1 - 2026-05-19

- Open VSX publishing for Cursor marketplace
- Publish skill for release workflow
- Community files (SECURITY.md, CONTRIBUTING.md)
- Demo document

## 0.1.0 - 2026-05-19

Initial release.

- WYSIWYG markdown editing with Milkdown
- Raw markdown editing with CodeMirror
- One-keystroke toggle between modes (Cmd+Shift+V / Ctrl+Shift+V)
- Syntax highlighting via Shiki (15 languages)
- Mermaid diagram rendering
- Math rendering via KaTeX (inline and display)
- GFM support (tables, task lists, strikethrough, autolinks)
- Frontmatter card with collapse/expand
- Light, Dark, and GitHub themes with auto-detection
- Round-trip fidelity for standard markdown
