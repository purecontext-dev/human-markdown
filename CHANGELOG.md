# Changelog

## 0.4.4 - 2026-06-01

### Added
- Bare URLs stay plain text in rich text; only explicit links (`<url>`, `[label](url)`) are clickable. Typing a URL followed by a space turns it into a link.
- Pressing Enter at the end of a typed URL now auto-links it too, matching the space behavior.

### Fixed
- Empty paragraphs serialize as real blank lines instead of `<br />` — pressing Enter for a blank line no longer writes a hardbreak to disk.
- Typed spaces now render correctly, including the space immediately after an auto-linked URL.
- Toggling between rich text and raw, or receiving external edits, no longer introduces formatting drift on lines you didn't touch.

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
