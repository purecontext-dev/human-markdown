---
title: "Plan Backlog"
project: "human-markdown"
date: 2026-05-10
---

# Plan Backlog

No active plans.

## Future Plans (not yet detailed)

- **cursor-position-mapping** — Map cursor position between raw mode (line:column) and WYSIWYG mode (ProseMirror node position) across mode toggles. Currently only scroll position is preserved. Non-trivial but nice-to-have.
- **custom-theming** — Custom CSS stylesheet injection (workspace-level `.human-markdown.css` auto-detected, or `humanMarkdown.customStylesheet` setting). Scoped under `.hm-content` parent selector to prevent editor UI breakage. Lets users preview markdown styled as their blog/site. Low priority — unclear if anyone would maintain a separate CSS file for this.
- **spell-checking** — Spell check in WYSIWYG view (rendered prose, not raw syntax). Blocked: VSCode sets `spellcheck: false` at the Electron BrowserWindow level ([#214367](https://github.com/microsoft/vscode/issues/214367)). Native browser spellcheck is not viable. Would require a JS-based spellcheck library (nspell + ProseMirror decorations) to implement.
- **export** — HTML standalone export, copy as rich text
- **search** — `Cmd+F` searches rendered content in WYSIWYG mode
