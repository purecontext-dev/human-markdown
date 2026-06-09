# Changelog

## 0.5.2 - 2026-06-09

### Fixed
- Saving from markdown/raw mode no longer shows a misleading "Save failed" message after normal edits.
- Human Markdown now treats VS Code's text document as the single source of truth for save state, preventing save/close/reopen drift after undo and raw-mode edits.
- The save error indicator no longer shifts the toolbar controls when it appears.

### Improved
- README guidance for Cursor users now calls out Cursor's built-in markdown toggle and points users to Human Markdown's own rich text/raw toggle.

## 0.5.1 - 2026-06-08

### Fixed
- WYSIWYG undo/redo now restores selected-text deletions one step at a time and persists the final undo state when saving, closing, or reopening a document.
- Auto-save and manual save now wait for pending rich-text/raw editor updates before saving, preventing stale content from being written after undo.
- Long frontmatter lines now wrap instead of clipping.

## 0.5.0 - 2026-06-04

### Added
- Formatting toolbar in WYSIWYG mode with buttons for headings (H1-H3), bold, italic, strikethrough, inline code, bullet list, ordered list, and blockquote.
- Keyboard shortcuts for all formatting actions now work without colliding with VS Code defaults (bold, italic, inline code, headings, lists, blockquote, strikethrough, code block).

### Fixed
- Tab key now indents/outdents list items instead of jumping between blocks. Outside of lists, Tab still navigates between blocks.

## 0.4.7 - 2026-06-04

### Added
- Auto-save toggle in the editor toolbar. When enabled, the file saves automatically 2 seconds after you stop typing. Works in both rich text and raw mode. The setting persists as `humanMarkdown.autoSave` (off by default).

### Fixed
- Saving no longer briefly re-dirties the document. Previously, the save's own change event was misinterpreted as an external edit, causing VS Code to show an unsaved indicator immediately after saving.

## 0.4.6 - 2026-06-04

### Improved
- Mode toggle redesigned as a single action button ("View Source" / "View Rendered") instead of a segmented control, making it visually distinct from Cursor's built-in "Preview | Markdown" toggle.
- In Cursor, a "Human Markdown" banner appears at the top of the editor so users can tell at a glance which editor they're in, with guidance to use our toggle instead of Cursor's.
- On first activation in Cursor, the extension offers to set Human Markdown as the default editor for `.md` files to prevent Cursor's built-in preview from taking over.

## 0.4.5 - 2026-06-01

### Improved
- Editing one block in a document no longer reformats the rest of the file. Untouched blocks preserve their original formatting — emphasis style (`_italic_` vs `*italic*`), list markers (`*`/`+` vs `-`), bare URLs, indentation, and blank-line patterns all stay as-written.

## 0.4.4 - 2026-06-01

### Added
- Bare URLs stay plain text in rich text; only explicit links (`<url>`, `[label](url)`) are clickable. Typing a URL followed by a space turns it into a link.
- Pressing Enter at the end of a typed URL now auto-links it too, matching the space behavior.

### Fixed
- Edits made in rich text are no longer lost when switching to raw mode or saving — the live editor is now read directly instead of a stale cache. This was most likely to bite when toggling or saving right after typing, but could drop edits on toggle/save in general.
- `http://`-style URLs and backslash escapes no longer drift (e.g. `http://` → `http\://`) when toggling raw → rich text → raw, even on files you never edited.
- Empty paragraphs serialize as real blank lines instead of `<br />` — pressing Enter for a blank line no longer writes a hardbreak to disk.
- Typed spaces now render correctly, including the space immediately after an auto-linked URL (previously the space could vanish and the cursor stayed stuck inside the link).
- On macOS, finishing a URL no longer required a double space (which triggered system period-substitution and corrupted the link's address).
- Pressing Enter at the end of a URL now splits the line as expected, instead of the keystroke being swallowed.

## 0.4.3 - 2026-05-25

### Fixed
- Task list checkboxes now toggle reliably at all VS Code zoom levels
- Mermaid diagram node labels are now visible (were stripped by SVG sanitizer)

## 0.4.2 - 2026-05-24

### Fixed
- Task list checkboxes now toggle correctly when clicked in WYSIWYG mode

## 0.4.1 - 2026-05-23

### Security
- Sanitize Mermaid SVG output before DOM insertion — strips script, foreignObject, iframe, and dangerous href attributes
- Image protocol allowlist — reject unknown URI schemes instead of passing them through

### Fixed
- Three-way merge base set to merged result instead of disk content, preventing phantom diffs on subsequent external changes
- Concurrent async edits no longer trample the sync-suppression flag (ref-counted instead of boolean)
- Toggle and find commands now target only the active editor, not all open markdown files
- File watcher no longer races with document change handler on external edits
- "Keep mine" conflict resolution defers dirty-state clearing until the edit succeeds
- Save handler captures document text before save I/O, not after — prevents base corruption if the user types during save
- Concurrent update messages during Milkdown init no longer create duplicate live editors
- Tab key no longer traps keyboard focus at document boundaries
- syncingContent flag cleared synchronously after replaceAll (ProseMirror dispatch is synchronous)
- mathInlineView now removes its katex-ready listener on destroy, matching mathDisplayView

### Changed
- Removed `passWithNoTests` from vitest config — test discovery failures now surface in CI
- Excluded sourcemaps from VSIX packaging
- KaTeX output option typed with `as const` to prevent accidental mode switch

## 0.4.0 - 2026-05-22

- Copy-to-clipboard button on code blocks with error feedback on failure
- Offer to reopen markdown files with the WYSIWYG editor on first install
- Save confirmation round-trip prevents silent data loss
- Fixed false "save failed" errors in raw mode
- Fixed double-click timer corruption on copy button

## 0.3.0 - 2026-05-21

- GitHub-style alert blocks (NOTE, TIP, IMPORTANT, WARNING, CAUTION) rendered in WYSIWYG mode
- Local images rendered in WYSIWYG mode via webview URI resolution
- Code blocks now support horizontal scrolling with a wrap toggle
- Fixed undo/redo behavior after mode toggle — external CodeMirror updates no longer create spurious undo entries
- Fixed alert stringify timing crash for github_alert nodes
- Updated Milkdown to 7.21, Shiki to 4.x, TypeScript to 6.0

## 0.2.1 - 2026-05-21

- Increased paragraph spacing in WYSIWYG mode to match standard rendered markdown
- Renamed mode toggle to "Rich Text | Markdown" to avoid confusion with Cursor IDE's built-in toggle

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
