# ADR-006: Custom Find Bar with Pluggable Search Backends

## Status

Accepted

## Context

`editor.action.webvieweditor.showFindWidget` does not exist for `CustomTextEditorProvider`. VSCode's built-in find widget only works with its native text editor, not with custom editor webviews. Users expect Cmd+F to work.

## Decision

Build a custom find bar inside the webview with a `SearchBackend` interface. Two implementations:

- **DomSearchBackend** — uses `window.find()` and DOM TreeWalker for WYSIWYG mode (Milkdown)
- **CmSearchBackend** — wraps CodeMirror's `@codemirror/search` for raw mode

The find bar auto-selects the correct backend based on the active editing mode.

## Alternatives Considered

1. **VSCode's built-in find widget** — doesn't exist for `CustomTextEditorProvider`. The API `editor.action.webvieweditor.showFindWidget` is not a real command.
2. **Single DOM-based search for both modes** — would miss CodeMirror's virtual rendering (lines outside the viewport aren't in the DOM)
3. **CodeMirror search for both modes** — doesn't work for Milkdown's ProseMirror DOM

## Consequences

### Positive

- Cmd+F works in both editing modes with mode-appropriate behavior
- `SearchBackend` interface makes it easy to swap or add backends
- Case-sensitive toggle, match count, and keyboard navigation (Enter/Shift+Enter) match user expectations

### Negative

- Custom find bar must be maintained — styling, keyboard handling, accessibility
- DOM search in WYSIWYG mode has limitations with collapsed/hidden content
- Two search implementations to keep in sync for feature parity

## Related Decisions

- [ADR-002](002-custom-text-editor-provider.md): CustomTextEditorProvider is why the native find widget isn't available
- [ADR-007](007-codemirror-for-raw-mode.md): CodeMirror provides the CmSearchBackend
