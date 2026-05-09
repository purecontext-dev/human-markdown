---
title: "Phase 4 Summary: Design & UX"
project: markdown-preview
date: 2026-05-09
---

## Key Outcomes

- **Information architecture is intentionally minimal.** Two modes (WYSIWYG, raw) and a settings surface. No sidebar, no file browser, no multi-panel layout. The extension takes over one editor tab.
- **Block editing is the core interaction.** Click a rendered block to edit it inline — block reveals editable markdown while surrounding content stays rendered. Click away or Escape to re-render. Must feel natural and instant.
- **Mode toggle is pragmatic.** Hard cut if instant, brief crossfade (100-200ms) only if needed to mask rendering delay. No gratuitous animation.
- **Default mode: WYSIWYG** (configurable via settings). Markdown files open rendered by default.
- **Table editing: attempt inline first**, fall back to raw markdown if quality bar isn't met. [Phased Implementation]
- **Frontmatter array pills: purely visual.** No click action — there's no meaningful action in a single-file context.
- **Task list checkboxes are interactive in rendered mode.** Click toggles the checkbox and writes back to the document. No edit mode needed.
- **Accessibility: WCAG AA pragmatic baseline.** Keyboard navigation for all block editing, proper semantic HTML, contrast ratios in all themes, respect `prefers-reduced-motion`.
- **No gratuitous animation.** This is a productivity tool used all day.

## Documents Produced

- **information-architecture.md** — Draft. Two modes + settings. Five key navigation flows documented (open/read, open/read/edit, toggle to raw, change theme, configure Tailwind).
- **ui-ux-spec.md** — Draft. Full component inventory (document-level, block-level, utility). Interaction patterns for block editing, mode toggle, frontmatter, task lists, code block copy. Error handling, loading states, accessibility, animation guidelines.

## Open Questions

- `Enter` key behavior at end of block — follow markdown convention (new line within block, blank line creates new paragraph) vs. Notion-style (new block). Spec recommends markdown convention.
- Exact toggle transition timing depends on implementation — design accommodates both instant and crossfade.

## Context for Next Phase

Phase 5 (Technical Planning) has forward notes from earlier phases in `phase-5/NOTES.md`: editor engine decision (Milkdown primary, ProseMirror + Remark fallback), tech architecture from the seed spec, and the WYSIWYG-as-core reframe. The tech spec should validate the `CustomTextEditorProvider` API choice, define the Milkdown prototype spike, set a bundle size budget, and produce ADRs for the key architectural decisions. The block editing interaction pattern (inline editing with re-render on exit) maps directly to Milkdown's ProseMirror `nodeViews` — this should be validated in the spike.
