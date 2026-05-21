# ADR-015: Link Opening via Raw Attribute with Type-Based Routing

## Status

Accepted

## Context

Links in the WYSIWYG editor need to be openable. The webview's base URL is `vscode-webview://some-id/...`, and the DOM property `anchor.href` resolves relative hrefs against that base. A markdown link like `[doc](./file.md)` becomes `vscode-webview://some-id/file.md`, which macOS has no handler for.

## Decision

Use `anchor.getAttribute('href')` (raw HTML attribute) instead of `anchor.href` (DOM property that resolves against the base URL). Route by link type on the extension host side:

- **Scheme-bearing URIs** (`https://`, `mailto:`, etc.) → `vscode.env.openExternal`
- **Relative paths** → resolve against the document's directory, open in VSCode
- **Fragment-only** (`#section`) → no-op (scroll anchors within the document)

Links require Cmd/Ctrl+click (not plain click, which places the cursor in the editable content).

## Implementation Detail

The click interception uses capture-phase listeners:
- `mousedown` (capture) — prevents text selection when Cmd-clicking a link
- `click` (capture) — prevents ProseMirror from placing the cursor, posts the href to the extension host

## Alternatives Considered

1. **Using `anchor.href` (DOM property)** — tried first. Produces `vscode-webview://` URLs that can't be opened.
2. **Opening all links in the webview** — not possible, the webview has no navigation capability and no `connect-src`

## Consequences

### Positive

- Links work correctly for all href types (absolute URLs, relative paths, fragments)
- Cmd+click is consistent with VSCode's link-opening convention in the native editor

### Negative

- Capture-phase listeners interact with ProseMirror's event handling — ordering matters
- Plain clicks don't open links (by design, but may surprise users coming from browser expectations)
