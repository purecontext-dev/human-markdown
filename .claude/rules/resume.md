# Session Resume Context

## Status
In-place mode toggle shipped (branch: `feat/in-place-mode-toggle`). PR created, pending merge.

## Key decisions
- **CodeMirror fallback chosen over native editor swap** — `vscode.openWith` had unacceptable re-init cost; embedded CodeMirror in the webview instead.
- **Font-family generic fallback** — VSCode's `editor.fontFamily` doesn't guarantee a generic CSS family. `escapeFontFamily()` appends `monospace` when none is present, preventing serif fallback in the webview sandbox.
- **Zoom compensation factor is 1.1** — not 1.2. Matches VSCode's actual zoom step per `window.zoomLevel` unit.

## Key context
- Bundle is 470KB gzipped (under 500KB target), 78 tests pass
- Cleanup task list: `docs/plans/post-mvp-cleanup.md`
- Backlog: `docs/plans/backlog.md`
