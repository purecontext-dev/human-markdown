---
title: "Architecture Decision Records"
phase: 5
project: "markdown-preview"
date: 2026-05-09
status: draft
---

# Architecture Decision Records

---

# ADR-001: Milkdown as WYSIWYG Engine with ProseMirror Fallback

## Status

Accepted (pending prototype spike validation)

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
- **Cons:** 4-8 weeks to build the MDAST ↔ ProseMirror bridge with full block-type coverage. Essentially rebuilding a simpler Milkdown.

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

- ADR-003: Shared rendering pipeline (Milkdown consumes the same plugins and theme)

---

# ADR-002: CustomTextEditorProvider for Same-Tab Editing

## Status

Accepted (needs validation during prototype spike)

## Context

Human Markdown needs to replace the default editor view for markdown files with a WYSIWYG webview, and allow toggling back to the raw text editor in the same tab. VSCode's extension API offers several options for embedding custom views.

## Decision

Use `CustomTextEditorProvider` to own the editor tab for markdown files. Use `vscode.openWith` to toggle between the custom editor and VSCode's default text editor.

## Alternatives Considered

### WebviewPanel (Side Panel)

The approach used by Markdown Preview Enhanced and VSCode's built-in preview.

- **Pros:** Well-documented, simpler lifecycle management, no conflict with default editor
- **Cons:** Side-panel only — fundamentally conflicts with the "same tab" product principle. Split panes waste screen space. Cannot edit in the preview.

### Custom WebviewView (Sidebar/Panel)

Renders in VSCode's sidebar or panel areas.

- **Pros:** Always visible alongside the editor
- **Cons:** Wrong location — sidebar is for navigation/tools, not document editing. Too small for a full document view.

## Consequences

### Positive

- Editor tab is fully owned — WYSIWYG view is a first-class editor, not a side panel
- `TextDocument` lifecycle is managed by VSCode — save, undo, dirty state all work
- Toggle via `vscode.openWith` is a clean API for switching between custom and default editors

### Negative

- `CustomTextEditorProvider` is less commonly used than WebviewPanel — fewer examples
- Potential edge cases with extension conflicts (other extensions that claim `.md` files)
- Must validate that language features (IntelliSense, snippets) work correctly in raw mode after toggling
- Webview retention across toggles needs careful lifecycle management

## Enforcement

- All webview content must go through the `CustomTextEditorProvider` — no standalone webview panels for preview
- The raw mode toggle must use `vscode.openWith`, not a separate editor instance
- Webview must be retained (not destroyed) when toggling to raw mode

## Related Decisions

- ADR-001: Milkdown runs inside the webview managed by this provider

---

# ADR-003: Shared Rendering Pipeline

## Status

Accepted

## Context

Human Markdown has two viewing modes: WYSIWYG editing (Milkdown) and read-only preview. Both render the same markdown content with the same theme. The question is whether they share a rendering pipeline or have independent ones.

## Decision

A single rendering pipeline (markdown-it + plugins + theme injection) is shared by both the read-only preview and the Milkdown editor. The pipeline produces HTML for preview mode and feeds the same plugins/theme tokens into Milkdown's ProseMirror rendering for edit mode.

## Alternatives Considered

### Separate Pipelines

Independent rendering for preview (markdown-it) and editing (Milkdown's internal Remark-based rendering).

- **Pros:** Simpler — each mode is self-contained. No coupling between rendering paths.
- **Cons:** Visual inconsistency between modes. Theme changes need to be applied twice. Plugin behavior may differ between markdown-it and Remark rendering. Maintenance burden of two rendering paths.

## Consequences

### Positive

- Visual consistency: toggling between modes shows identical rendering
- Single source of truth for theme tokens and plugin configuration
- Bug fixes and plugin additions apply to both modes automatically
- The "mode switch" feels like changing interactivity, not changing views

### Negative

- Tighter coupling between preview and editor subsystems
- Plugin compatibility must be validated for both markdown-it and Milkdown/Remark contexts
- Theme token format must work for both CSS injection (preview) and ProseMirror styling (editor)

## Enforcement

- All rendering plugins must be registered in the shared pipeline — no mode-specific plugins
- Theme tokens are defined once and consumed by both modes
- Any change to the rendering pipeline must be tested in both preview and edit mode
- No inline styles in the webview — all styling through CSS custom properties from the theme engine

## Related Decisions

- ADR-001: Milkdown consumes the shared pipeline
- ADR-002: CustomTextEditorProvider hosts the webview where the pipeline runs
