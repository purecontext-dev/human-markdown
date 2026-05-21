# ADR-002: CustomTextEditorProvider for Same-Tab Editing

## Status

Accepted

## Context

Human Markdown needs to replace the default editor view for markdown files with a WYSIWYG webview, and allow toggling back to the raw text editor in the same tab. VSCode's extension API offers several options for embedding custom views.

## Decision

Use `CustomTextEditorProvider` to own the editor tab for markdown files. Toggle between WYSIWYG and raw editing within the same webview (see [ADR-007](007-codemirror-for-raw-mode.md) for how raw mode evolved).

## Alternatives Considered

### WebviewPanel (Side Panel)

The approach used by Markdown Preview Enhanced and VSCode's built-in preview.

- **Pros:** Well-documented, simpler lifecycle management, no conflict with default editor
- **Cons:** Side-panel only — fundamentally conflicts with the "same tab" product principle. Split panes waste screen space. Cannot edit in the preview.

### Custom WebviewView (Sidebar/Panel)

Renders in VSCode's sidebar or panel areas.

- **Pros:** Always visible alongside the editor
- **Cons:** Wrong location — sidebar is for navigation/tools, not document editing. Too small for a full document view.

## Consequences

### Positive

- Editor tab is fully owned — WYSIWYG view is a first-class editor, not a side panel
- `TextDocument` lifecycle is managed by VSCode — save, undo, dirty state all work
- Single tab for both modes — no split panes, no tab proliferation

### Negative

- `CustomTextEditorProvider` is less commonly used than WebviewPanel — fewer examples
- Potential edge cases with extension conflicts (other extensions that claim `.md` files)
- Webview retention across toggles needs careful lifecycle management
- Keyboard events in the webview iframe are consumed by the webview and never reach VSCode's keybinding system — standard shortcuts like Cmd+S and Cmd+F must be intercepted in the webview and forwarded via `postMessage`

## Enforcement

- All webview content must go through the `CustomTextEditorProvider` — no standalone webview panels for preview
- Webview must be retained (not destroyed) when toggling between modes

## Related Decisions

- [ADR-001](001-milkdown-wysiwyg-engine.md): Milkdown runs inside the webview managed by this provider
- [ADR-007](007-codemirror-for-raw-mode.md): Raw mode implementation within the same webview
