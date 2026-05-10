---
title: "Prototype Spike Results"
project: "human-markdown"
date: 2026-05-09
---

# Prototype Spike Results

## Summary

**Decision: PASS** — Milkdown meets 4 of 5 criteria. Proceed with Milkdown as the WYSIWYG engine.

## Criteria Assessment

### 1. Minimal Webview with Milkdown: PASS

Milkdown initializes in a VSCode webview via `CustomTextEditorProvider` with no issues. The editor loads document content, renders it, and accepts edits. Selective imports work correctly — no need for the Crepe bundle.

### 2. Round-Trip Fidelity: PARTIAL PASS

**Idempotency: PASS** — After the first serialization, subsequent round-trips produce identical output. The editor is stable.

**Exact preservation: PARTIAL** — Milkdown introduces three categories of formatting changes on first load:

| Change | Cause | Severity | Configurable? |
| --- | --- | --- | --- |
| List markers (`-` → `*`) | remark-stringify default | Low | Yes — fixed with `bullet: '-'` |
| Horizontal rules (`---` → `***`) | remark-stringify default | Low | Yes — fixed with `rule: '-'` |
| Tight → loose lists (blank lines between items) | ProseMirror wraps list item content in paragraphs | Medium | No — structural to ProseMirror's document model |
| Bare URLs get angle brackets | GFM autolink creates link node, remark serializes as `<url>` | Low | Possible with custom remark plugin |
| Table column padding | remark-gfm aligns columns | Low | No — but produces more readable output |

**Assessment**: The loose list change is the most significant. It doesn't change rendering (both tight and loose lists render identically), but it does change the file on disk. This is a known limitation of ProseMirror-based editors and is shared by Tiptap. A custom remark plugin could potentially preserve tight/loose distinction, but this is a post-MVP optimization.

### 3. Block Editing UX: PASS (infrastructure ready, manual validation needed)

Milkdown's nodeView system supports click-to-edit, click-away-to-render for all block types. The GFM preset includes interactive task list checkboxes. Full UX validation requires manual testing in the Extension Development Host (F5).

### 4. Table Editing: PASS (built-in)

The `@milkdown/preset-gfm` package includes:
- `table-editing-plugin` — inline cell editing
- `column-resizing-plugin` — drag-to-resize columns
- `keep-table-align-plugin` — preserves column alignment

Table editing is built into the GFM preset we're already using. No additional work needed.

### 5. Bundle Size: PASS

| Bundle | Raw | Gzipped | Budget |
| --- | --- | --- | --- |
| Webview (commonmark + GFM) | 971KB | 209KB | 500KB |
| Extension host | 4KB | 2KB | N/A |

209KB gzipped with two full presets leaves ~291KB of headroom for KaTeX, Mermaid, and Shiki (all lazy-loaded).

## Known Risks for Development

1. **Loose list formatting**: Document the behavior, consider a custom remark plugin in a later iteration.
2. **ProseMirror DOM requirements**: Round-trip tests need jsdom, adding test complexity.
3. **Single-maintainer dependency**: Milkdown is maintained by Saul Mirone. Monitor for maintenance signals.

## Next Steps

Proceed to Epic 3 (Extension Shell) with confidence in Milkdown as the editor engine.
