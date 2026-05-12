# Session Resume Context

## Status
Raw mode cursor positioning fix shipped (branch: `fix/raw-mode-cursor-positioning`). Post-MVP cleanup merged to main.

## Key decisions
- **Zoom compensation scoped to preview only** — CSS `zoom` on `<html>` broke CodeMirror's coordinate mapping (mouse events in viewport space vs `getBoundingClientRect` in zoomed space). Moved zoom from `<html>` to `#preview-container` so CodeMirror has no zoomed ancestors.
- **Skip hidden CM dispatches** — content updates dispatched to a `display: none` CodeMirror editor produce stale layout metrics. Guard with `currentMode === 'raw'`; content syncs on mode switch instead.

## Key context
- Bundle is 475KB gzipped (under 500KB target), 23 tests pass
- Backlog: `docs/plans/backlog.md`
