# ADR-009: Hybrid WYSIWYG Model

## Status

Accepted

## Context

The original spec described per-block click-to-edit behavior for every block type. During implementation, we recognized that this adds complexity with zero benefit for block types where the editing and rendered states look identical.

## Decision

Text blocks (paragraphs, headings, lists, blockquotes, images, tables) use Milkdown's always-editable default — standard rich text editing like Google Docs or Notion. Code blocks, math, and mermaid get rendered display with editing in raw mode.

This is the Typora/Obsidian model: always-editable for text, with special rendering for blocks where source and output look fundamentally different.

## Alternatives Considered

1. **Per-block click-to-edit for all block types** (original spec) — rejected. For paragraphs, headings, and lists, the editing state looks identical to the rendered state. A toggle adds complexity and user friction with no visual benefit.
2. **Fully always-editable for everything** (pure Google Docs model) — rejected. Code blocks, math, and mermaid would never show their rendered output, defeating the purpose of WYSIWYG.
3. **Read-only preview with edit mode** (original spec's "block toggle") — superseded by the hybrid approach, which is better UX for most content.

## Consequences

### Positive

- Text editing feels natural — no click-to-enter-edit-mode for paragraphs
- Code/math/mermaid show rendered output, which is the whole point of WYSIWYG for those blocks
- Simpler nodeView implementation for text blocks (Milkdown's defaults work)

### Negative

- Two editing paradigms in one editor may confuse users initially
- Code blocks require switching to raw mode for editing — see [ADR-004](004-code-blocks-read-only-in-wysiwyg.md)

## Related Decisions

- [ADR-001](001-milkdown-wysiwyg-engine.md): Milkdown provides the always-editable text behavior
- [ADR-004](004-code-blocks-read-only-in-wysiwyg.md): Code blocks ended up fully read-only after the click-to-edit overlay failed
- [ADR-010](010-frontmatter-styled-yaml-block.md): Frontmatter follows the rendered-display pattern
