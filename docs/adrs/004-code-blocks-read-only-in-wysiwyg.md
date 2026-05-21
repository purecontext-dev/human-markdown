# ADR-004: Code Blocks Read-Only in WYSIWYG Mode

## Status

Accepted

## Context

The original design had code blocks using a click-to-edit model: rendered with Shiki syntax highlighting on blur, editable source on focus. This worked conceptually but broke down in practice.

## Decision

Code blocks are read-only in WYSIWYG mode. To edit code, switch to raw mode (Cmd+E). Shiki renders syntax highlighting for display only.

## What We Tried

The click-to-edit overlay approach had Shiki-highlighted `<pre>` elements that swapped to a textarea on click. Two issues killed it:

1. **Focus/tabindex conflict:** Shiki generates `<pre tabindex="0">` by default. When a user clicks on highlighted code, the `<pre>` steals focus via `focusin`, which hides the overlay before the `click` event fires. The click handler never runs, making code blocks un-clickable except in the padding area around the `<pre>`. Stripping `tabindex` from Shiki output fixed the click issue but introduced the second problem.

2. **ProseMirror nodeView lifecycle:** The overlay toggling fought with ProseMirror's nodeView update/destroy cycle. Focus management between the Milkdown editor and the code block overlay caused cursor placement bugs and unexpected selection behavior.

## Alternatives Considered

1. **Click-to-edit with Shiki overlay** — tried, removed due to the focus/tabindex and nodeView lifecycle issues described above
2. **Inline CodeMirror per block** — would have added complexity (a second editor instance per code block) and fought with ProseMirror's selection model
3. **Always-editable code (no highlighting)** — loses the visual value of syntax highlighting in a reading-focused editor

## Consequences

### Positive

- Shiki highlighting renders cleanly without focus management complexity
- No nodeView lifecycle bugs from overlay toggling
- Raw mode (CodeMirror) provides a better code editing experience than any inline approach would

### Negative

- Two-step workflow for code edits: Cmd+E to raw mode, edit, Cmd+E back
- Users expecting Notion/Typora-style inline code editing may be surprised

## Related Decisions

- [ADR-007](007-codemirror-for-raw-mode.md): CodeMirror provides the code editing experience in raw mode
- [ADR-017](017-shiki-selective-grammars.md): Shiki configuration for syntax highlighting
