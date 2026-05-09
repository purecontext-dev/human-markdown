---
title: "Validation Summary"
phase: 2
project: "markdown-preview"
date: 2026-05-09
status: draft
---

# Validation Summary

## Decision: Go

This is a tool the founder uses daily and is building primarily to solve his own problem. The validation bar is different from a startup seeking product-market fit — the market is one person who already knows the pain and is committed to building the solution. Broader adoption is a strategic bonus, not a prerequisite.

The competitive landscape has a security vacuum, an absent maintainer on the dominant extension, and zero innovation in the WYSIWYG-in-VSCode space. The timing is right. The risk is execution (can Milkdown deliver the quality bar in a VSCode webview?), not market.

## Evidence Summary

### What We Validated

| Assumption | Status | Evidence |
|-----------|--------|----------|
| Developers prefer in-tab WYSIWYG over side-panel preview | Validated (founder experience) | Founder's daily workflow confirms: the preview-to-edit-to-preview cycle is painful enough that he reads raw markdown most of the time rather than using the existing preview workflow. The 3+ step process to open MPE is a deterrent. |
| VSCode extension marketplace is the right distribution channel | Validated | It's where the founder looked for this tool. No alternative distribution channel for VSCode extensions exists. The marketplace is the only option. |
| LLM-driven markdown usage will continue growing | Validated (high confidence) | AI tools (Claude Code, Cursor, Copilot) generate markdown as their primary output format. CLAUDE.md, specs, ADRs, planning docs, blog drafts — all markdown. The trend is accelerating, not plateauing. |

### What We Invalidated

Nothing was invalidated. The core thesis (markdown tooling hasn't kept up with the AI-driven explosion in markdown volume) held up under scrutiny. The product reframe — WYSIWYG editing as the core product, not a future feature — strengthened the thesis rather than undermining it.

### What Remains Unvalidated

| Assumption | Risk of Proceeding | Mitigation |
|-----------|-------------------|------------|
| Tailwind-native theming is a meaningful differentiator | Low. Tailwind adoption is growing, and theming can be extended to other styling systems (CSS custom properties, other framework configs) if demand warrants it. Worst case: it's a niche feature that the founder uses and others don't. | Ship Tailwind import alongside JSON themes and VSCode theme inheritance. Three theming approaches cover the spectrum. |
| Open core monetization is viable | Low. Founder's priority is publicity and portfolio building, not revenue. Monetization is a "figure it out later" decision. | Launch free. Monitor for features that organically justify a pro tier. Don't gate anything at launch. |
| Broader market wants this (beyond founder) | Medium. The founder's pain is real but one person's experience doesn't prove market demand. [Assumption: agentic developers as a segment are growing and share this pain] | Ship it, see if installs grow organically. The MPE security vacuum creates a natural trial opportunity. If people switch from MPE for security and stay for the WYSIWYG editing, that's market validation. |

## Scope Implications

### Confirmed In Scope

- WYSIWYG editing as core product (not preview-first with editing later)
- Full markdown rendering — everything a valid markdown file can contain (GFM, KaTeX, Mermaid, frontmatter, task lists, tables, code blocks with syntax highlighting)
- Theming: JSON themes, Tailwind config import, VSCode theme inheritance, GitHub theme
- Same-tab toggle between raw and rendered (one keystroke)
- Spell checking in rendered view
- Export: HTML standalone, rich text copy
- Milkdown as editor engine (with ProseMirror + Remark custom bridge as fallback)

### Removed from Scope

- PDF export — no real user job behind it
- Collaboration / multi-user editing — not a pain point for the persona
- Non-VSCode editors (JetBrains, Zed, standalone) — possible future expansion, not v1

### Added to Scope (since original spec)

- Spell checking in WYSIWYG view (discovered during persona interview)
- GitHub-rendering theme (preview READMEs and PR descriptions as GitHub renders them)
- WYSIWYG editing promoted from P4 to core MVP
- Editor engine fallback plan (custom ProseMirror + Remark bridge if Milkdown doesn't meet quality bar)

## Risk Assessment

### Highest Risks

1. **Milkdown round-trip fidelity in VSCode webview** (Likelihood: Medium, Impact: Critical)
   The entire product depends on Milkdown producing clean, predictable markdown that preserves the original formatting. If round-trip fidelity is poor — if the editor corrupts whitespace, changes heading styles, or mangles tables — the product is unusable. This is an execution risk, not a market risk.

2. **Bundle size** (Likelihood: Medium, Impact: Medium)
   Full plugin set (KaTeX, Mermaid, Shiki, Milkdown) could push the extension beyond reasonable webview load times. The "render everything" decision means no easy cuts.

3. **Webview stability** (Likelihood: Low-Medium, Impact: High)
   VSCode webviews have constraints (memory limits, lifecycle management, no direct DOM access from extension host). MPE's instability is partly attributable to poor webview lifecycle management. Human Markdown must not repeat this.

4. **Single-maintainer sustainability** (Likelihood: Medium, Impact: Medium)
   Founder is building this for personal use and portfolio. If interest grows beyond personal use, maintenance burden scales. No plan for contributors or community yet.

### Mitigations

| Risk | Mitigation |
|------|-----------|
| Milkdown round-trip fidelity | Prototype spike early in development. Test against a corpus of real markdown files (CLAUDE.md, blog posts, specs). Define fidelity acceptance criteria before committing. Fallback: custom ProseMirror + Remark bridge. |
| Bundle size | Selective Milkdown imports (avoid Crepe's 415KB bundle). Lazy-load heavy plugins (Mermaid, KaTeX) — only load when the document contains those block types. Measure and set a budget. |
| Webview stability | Clean webview lifecycle management from day one. Memory-conscious rendering. Error boundaries per section. Learn from MPE's failure modes. |
| Single-maintainer sustainability | Ship open source (MIT). Accept community PRs but don't promise support timelines. The product serves the founder first — community benefit is a side effect. |

## Recommendation for Phase 3

Phase 3 (Product Definition) should restructure the priority tiers from the original spec. The current P1-P4 framing is stale — WYSIWYG editing is no longer P4, it's the product. Recommended restructuring:

- **MVP**: WYSIWYG editing + rendering + same-tab toggle + built-in themes (Light, Dark, GitHub) + stability
- **Fast follow**: Custom theming (JSON, Tailwind import, VSCode inheritance) + spell checking
- **Later**: Export (HTML, rich text) + outline/TOC + search within preview

The PRD already has most of this content but needs the priority tiers rewritten to reflect the reframe. The product vision and success metrics need definition. Forward notes for Phase 5 have the editor engine decision and technical architecture from the original spec — those should be validated, not re-decided.
