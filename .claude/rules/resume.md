# Session Resume Context

## Status
Post-MVP cleanup shipped (branch: `fix/post-mvp-cleanup`). PR created, pending merge.

## Key decisions
- **Shiki as separate IIFE bundle** — inline import blew bundle to 2.1MB. Follows the Mermaid pattern: separate `dist/shiki.js` loaded via `<script>` tag. Progressive enhancement — plain text first, highlight async.
- **`$remark` needs explicit options** — Milkdown's `$remark` defaults `initialOptions` to `{}`, which `remark-frontmatter` misinterprets as a matter descriptor missing `type`. Must pass `['yaml']` explicitly.
- **Frontmatter via Milkdown nodeView** — not the old markdown-it table card. Uses `remark-frontmatter` for parsing, `$nodeSchema` for ProseMirror node, `$view` for rendering with Shiki-highlighted YAML.
- **markdown-it pipeline removed** — was dead code (no read-only preview mode exists). ADR-003 retired.

## Key context
- Bundle is 475KB gzipped (under 500KB target), 23 tests pass
- Cleanup task list: `docs/plans/post-mvp-cleanup.md` (all 9 tasks complete)
- Backlog: `docs/plans/backlog.md`
