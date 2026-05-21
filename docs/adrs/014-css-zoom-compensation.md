# ADR-014: CSS Zoom Compensation for VSCode Window Zoom Level

## Status

Accepted

## Context

When `window.zoomLevel` is set in VSCode (e.g., -1 to shrink the UI), the native editor compensates at the rendering level. Webview content gets inversely scaled, making fonts appear smaller than the native editor. The visual mismatch is noticeable.

## Decision

Apply CSS `zoom` on `#preview-container` only (the Milkdown WYSIWYG area), not on `<html>` or `<body>`. The zoom factor is computed from `Math.pow(1.2, -zoomLevel)` with empirical tuning.

## What We Tried

Initially applied `zoom` to `<html>`. This broke CodeMirror's coordinate mapping: `getBoundingClientRect()` returns zoomed coordinates while mouse events report viewport coordinates. The result was the cursor landing at end-of-line on every click in raw mode.

## Alternatives Considered

1. **Zoom on `<html>`** — tried, broke CodeMirror cursor positioning
2. **Font-size-only compensation** — tried, didn't match because webview scaling affects more than just fonts (spacing, borders, images)
3. **No compensation** — rejected. The visual mismatch between the webview and native editor is distracting, especially at negative zoom levels.

## Implementation Notes

The mathematically correct factor for `zoomLevel: -1` is `1.2` (since VSCode scales by `1.2^zoomLevel`). The actual factor used is `1.1` — empirically tuned because `1.2` made text slightly too large relative to the native editor. This is pragmatic, not principled.

## Consequences

### Positive

- Webview text size approximately matches the native editor at any zoom level
- CodeMirror works correctly (not inside the zoomed container)

### Negative

- Empirical tuning factor may drift as VSCode changes its zoom implementation
- The Milkdown container and CodeMirror container render at different effective zoom levels — minor visual inconsistency during mode toggle

## Related Decisions

- [ADR-007](007-codemirror-for-raw-mode.md): CodeMirror's coordinate system is why zoom must be scoped
