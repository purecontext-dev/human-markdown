## Technical Architecture (from seed spec)
**Source:** Seed spec (cairn/projects/markdown-preview/spec.md)
**Date:** 2026-05-08

The original spec included a detailed technical architecture section. Key decisions captured here for Phase 5 planning:

**Architecture decisions (all [Open Decision] — exploratory confidence):**
- Extension API: `CustomTextEditorProvider` — owns the editor tab, VSCode manages TextDocument lifecycle
- Markdown renderer: `markdown-it` — VSCode ecosystem standard, rich plugin ecosystem
- WYSIWYG engine: Milkdown (ProseMirror + Remark) — proven in VSCode webviews, plugin-driven, ~120-180KB selective imports. Fallback: custom ProseMirror + Remark bridge if Milkdown doesn't meet quality bar.
- Theming foundation: `@tailwindcss/typography` — purpose-built for prose styling
- Frontmatter parser: `gray-matter` — battle-tested (Gatsby, Astro, VitePress)
- Code highlighting: Shiki — VSCode uses internally, TextMate grammar compatible
- Bundler: esbuild — handles both extension host (CJS) and webview (ESM)
- Language: TypeScript

**Rendering pipeline (shared library):**
markdown source → gray-matter (extract frontmatter + body) → markdown-it (parse + render) → plugins → theme injection (CSS custom properties) → HTML output. Same pipeline feeds preview webview and future Milkdown editor.

**Webview lifecycle:**
- Create on first toggle to preview
- Retain when toggling back to raw (don't destroy/recreate)
- Dispose when editor tab closes
- State persists via `webview.setState`/`getState`

**Directory structure proposed in spec** — see original for full tree. Notably separates `rendering/` (shared library), `providers/`, `editor/` (P4), `webview/` (bundled separately), and `themes/`.

## Editor Engine Decision
**Source:** Phase 1 interview discussion
**Date:** 2026-05-08

**Decision:** Milkdown as primary WYSIWYG engine, with custom ProseMirror + Remark bridge as fallback.

**Rationale:** Full landscape evaluation of 7 options (Milkdown, Tiptap, BlockNote, Lexical, Plate, MDXEditor, ProseMirror direct). Milkdown won on: markdown-native architecture (Remark-based round-trip), framework-agnostic, proven in VSCode webview, low issue count (25). Tiptap was runner-up but markdown is secondary to their product vision and 893 open issues. BlockNote, Lexical, MDXEditor eliminated (lossy markdown, wrong paradigm, or too heavy).

**Fallback plan:** If Milkdown hits friction (abstraction leaks, round-trip bugs, webview performance), build custom ProseMirror + Remark bridge informed by what the prototype spike reveals. Estimated 4-8 weeks for custom bridge.

**Validation needed:** Prototype spike early in development to confirm round-trip fidelity and webview stability before full commitment. [ADR candidate]

## Product Reframe: WYSIWYG is Core, Not Future
**Source:** Phase 1 interview discussion
**Date:** 2026-05-08

**Decision:** WYSIWYG editing is the primary product, not a Phase 4 future feature. The editor should support full block-type coverage from v1: paragraphs, headings, lists (ordered, unordered, task), code blocks with syntax highlighting, blockquotes, tables, images.

**Implication:** The original spec's P1-P4 priority tiers need restructuring. P1 (preview) and P4 (hybrid editing) merge into the actual MVP. Preview mode is a read-only state of the editor, not a separate product. The rendering pipeline being shared between preview and editor is a launch requirement, not future-proofing.

**Positioning shift:** This is "Typora inside VSCode," not "better Markdown Preview Enhanced." Competitive framing should reflect this.
