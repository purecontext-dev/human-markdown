# ADR-007: CodeMirror for Raw Mode Instead of Native VSCode Editor

## Status

Accepted

## Context

Human Markdown needs a raw markdown editing mode alongside the WYSIWYG view. The original plan used `vscode.openWith` to swap between the custom editor and VSCode's native text editor. This was implemented and tested.

## Decision

Embed CodeMirror 6 in the webview for raw mode. Toggle between Milkdown and CodeMirror by swapping DOM visibility within the same webview, not by switching editor providers.

## What We Tried

`vscode.openWith` always creates a **separate editor instance** for each editor type. Even when specifying `ViewColumn.Active`, it opens a new tab instead of swapping in-place. This made the WYSIWYG/raw toggle feel like tab-switching rather than an in-place mode toggle — fundamentally wrong for the product.

## Alternatives Considered

1. **`vscode.openWith` to native text editor** — tried, rejected because it creates a new tab. Also loses the toolbar and any webview-level UI.
2. **Styled `<textarea>`** — too basic. No syntax highlighting, no line numbers, no keybindings.
3. **Read-only `<pre>` with edit-in-place** — clunky for actual editing workflows.

## Consequences

### Positive

- Single tab always — toggle just swaps DOM visibility
- Scroll position can be preserved across mode switches
- Full control over the raw editing UI — toolbar buttons, find bar, and CodeMirror all live in the same webview
- CodeMirror adds ~150-200KB, keeping total under the 500KB gzipped budget

### Negative

- CodeMirror's syntax highlighting tokens don't match VSCode's theme — VSCode doesn't expose syntax colors as CSS variables. Light/dark detection with matching CodeMirror highlight styles is the best available approximation.
- Tab indentation (`indentWithTab`) must be explicitly enabled — CodeMirror omits it from `defaultKeymap` for accessibility (Tab should move focus). In a markdown editor where Tab-indent is expected, this is the right trade-off.
- CSS `zoom` on the webview root breaks CodeMirror's coordinate mapping (`getBoundingClientRect()` returns zoomed coordinates while mouse events report viewport coordinates). Zoom compensation must be applied only to the Milkdown container, not the whole page — see [ADR-014](014-css-zoom-compensation.md).

## Related Decisions

- [ADR-002](002-custom-text-editor-provider.md): Both modes live in the same CustomTextEditorProvider webview
- [ADR-006](006-custom-find-bar-search-backends.md): CmSearchBackend wraps CodeMirror's search
- [ADR-014](014-css-zoom-compensation.md): Zoom must avoid CodeMirror's container
