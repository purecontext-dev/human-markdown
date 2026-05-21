# ADR-010: Frontmatter as Styled YAML Block

## Status

Accepted

## Context

Markdown files commonly include YAML frontmatter for metadata (title, date, tags, custom config). The editor needs to display frontmatter in WYSIWYG mode. The question was whether to parse it into a structured UI or display it as source.

## Decision

Frontmatter renders as a collapsible, Shiki-highlighted YAML code block with a "FRONTMATTER" label. It is not parsed into a metadata table or key-value editor. `remark-frontmatter` handles the parse/serialize round-trip.

## What We Tried

A partially-built metadata table card approach was removed. It worked for simple key-value pairs (title, date, tags) but broke down with deeply nested YAML, which is common in AI tool configs, Hugo/Jekyll themes, and complex static site generators.

## Alternatives Considered

1. **Parsed metadata table** — partially built, then removed. Breaks on nested YAML, arbitrary arrays, multi-line strings, and complex types.
2. **Hybrid (table for simple, YAML block for complex)** — rejected as over-engineered. The detection heuristic would be fragile, and two rendering modes for the same block type is confusing.
3. **Invisible frontmatter (raw mode only)** — rejected. Frontmatter has become configuration users actively reference and edit. Hiding it in WYSIWYG mode means users switch to raw mode just to check a field.

## Consequences

### Positive

- Handles arbitrary YAML complexity — always accurate to source
- Shiki provides syntax highlighting for readability
- Collapse/expand with state persistence lets users hide it when not needed
- Same rendering pattern as code blocks — consistent mental model

### Negative

- Not as visually polished as a structured metadata UI for simple cases
- Editing requires interacting with raw YAML (same constraint as code blocks — see [ADR-004](004-code-blocks-read-only-in-wysiwyg.md))

## Related Decisions

- [ADR-004](004-code-blocks-read-only-in-wysiwyg.md): Same read-only-in-WYSIWYG pattern
- [ADR-009](009-hybrid-wysiwyg-model.md): Frontmatter follows the rendered-display side of the hybrid model
- [ADR-017](017-shiki-selective-grammars.md): YAML is one of the selected Shiki grammars
