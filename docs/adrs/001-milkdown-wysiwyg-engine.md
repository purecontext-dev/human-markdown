# ADR-001: Milkdown as WYSIWYG Engine with ProseMirror Fallback

## Status

Accepted

## Context

Human Markdown's core product is WYSIWYG markdown editing inside a VSCode webview. The editor engine must: run in a browser environment, provide full block-type coverage, round-trip markdown cleanly, be framework-agnostic, and be stable enough for all-day use. Seven options were evaluated (Milkdown, Tiptap, BlockNote, Lexical, Plate, MDXEditor, ProseMirror direct).

## Decision

Use Milkdown (ProseMirror + Remark) as the primary WYSIWYG engine. If Milkdown fails the prototype spike (round-trip fidelity, webview stability, block editing UX, table editing, or bundle size), build a custom ProseMirror + Remark bridge informed by the spike's findings.

## Alternatives Considered

### Tiptap

Largest ecosystem (36.7K stars, 9.8M npm weekly downloads). Markdown support via extension (uses Marked.js).

- **Pros:** Massive community, excellent documentation, framework-agnostic, ~102KB bundle
- **Cons:** Markdown is secondary to the product vision. 893 open issues. Business model shifting toward cloud services — incentive alignment for a self-hosted markdown tool is unclear.

### ProseMirror Direct

The foundation Milkdown and Tiptap build on. Maximum control, minimum bundle (~30-50KB).

- **Pros:** No abstraction layer. Full control over round-trip fidelity. Minimal bundle size.
- **Cons:** 4-8 weeks to build the MDAST-ProseMirror bridge with full block-type coverage. Essentially rebuilding a simpler Milkdown.

### Others Eliminated

- **BlockNote:** Lossy markdown export (documented). Block-oriented paradigm mismatch.
- **Lexical:** Markdown is a known weak spot. Too much custom work.
- **Plate:** React-locked. Would require bundling React in the webview.
- **MDXEditor:** 575KB gzipped. React-locked.

## Consequences

### Positive

- Markdown-native architecture — Remark handles serialization, not an afterthought
- Framework-agnostic — no React in the webview
- Proven in VSCode webviews (existing extension uses Milkdown)
- Low issue count (25) suggests stability
- Fallback plan preserves optionality

### Negative

- Single-maintainer risk (Saul Mirone)
- Smaller community than Tiptap — fewer examples, less Stack Overflow coverage
- Crepe (batteries-included) is 415KB gzipped — must use selective imports
- Milkdown's abstractions may obscure ProseMirror internals when debugging

## Enforcement

- No direct ProseMirror API usage outside of the Milkdown plugin system unless the fallback is triggered
- If the prototype spike fails 3+ criteria, escalate to the fallback plan before continuing development
- All editing functionality must go through the Milkdown plugin API — no DOM manipulation in the webview

## Related Decisions

- [ADR-003](003-shared-rendering-pipeline.md): Shared rendering pipeline (Retired — Milkdown uses its own Remark rendering)
- [ADR-005](005-heavy-libraries-iife-bundles.md): Heavy libraries as separate IIFE bundles
- [ADR-009](009-hybrid-wysiwyg-model.md): Hybrid WYSIWYG model
