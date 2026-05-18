# Session Resume Context

## Status
Frontmatter and code block fixes shipped (branch: `fix/frontmatter-dark-mode-coloring`). Three tasks from the Human Markdown project addressed.

## Key decisions
- **Code blocks read-only in WYSIWYG** — Rendered Shiki overlay always visible. Text selectable for copying. Editing requires switching to markdown view. Click-to-edit and focusin/focusout editing class management removed.
- **Frontmatter keeps inline editing** — Click-vs-drag detection on rendered overlay (matching prior code-block pattern). Clicks enter editing mode, drags select text.
- **Shiki tabindex stripped** — Shiki generates `<pre tabindex="0">` which steals focus from the editing layer, breaking click-to-edit. Both frontmatter and code-block views strip it.
- **Frontmatter theme-changed listener** — Was missing; code blocks had it. Added with proper cleanup in `destroy()`.
- **CSS inheritance resets** — Global `.milkdown pre` and `.milkdown code` rules bled border/padding/background into Shiki elements inside rendered overlays. Reset in both code-block and frontmatter CSS.
- **External edit dirty state** — `syncingContent` flag absorbs Milkdown normalization during init and external updates, preventing spurious `edit` messages that made the document dirty.

## Key context
- Bundle is 475KB gzipped (under 500KB target), 23 tests pass
- `mock.html` at project root for rapid CSS iteration (not shipped in extension)
- Dead CSS: `.code-block-view.editing` rules are now unreachable (code blocks never enter editing mode). Clean up in follow-up.
- Tasks tracked in purecontext-tasks project "Human Markdown", not in file-source plans
