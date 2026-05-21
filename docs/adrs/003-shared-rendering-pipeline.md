# ADR-003: Shared Rendering Pipeline

## Status

Retired

## Retirement Note

There is no read-only preview mode — the extension only has WYSIWYG editing (Milkdown) and raw editing (CodeMirror). The shared markdown-it rendering pipeline was never consumed and has been removed. Milkdown uses its own Remark-based rendering. Theme tokens are still shared via CSS custom properties.

The markdown-it pipeline, all hydrators, and the associated XSS test suite (36 tests) were deleted as dead code. The XSS tests specifically tested the markdown-it pipeline, not the Milkdown rendering path. The webview sandbox (no filesystem, no Node.js, no network) is the primary security boundary — see [ADR-011](011-csp-unsafe-eval-mermaid.md) for the full threat model.

## Original Context

The ADR proposed a shared markdown-it rendering pipeline for both a read-only preview and WYSIWYG editing. The read-only preview was never implemented, making the pipeline dead code.

## Related Decisions

- [ADR-001](001-milkdown-wysiwyg-engine.md): Milkdown replaced the need for a shared pipeline
- [ADR-011](011-csp-unsafe-eval-mermaid.md): CSP and security threat model
