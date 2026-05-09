---
title: "Phase 3 Summary: Product Definition"
project: markdown-preview
date: 2026-05-09
---

## Key Outcomes

- **Product vision rewritten around WYSIWYG-as-core.** Vision statement: "A WYSIWYG markdown editor that lives in your VSCode tab." Not a preview tool with editing bolted on.
- **Priority tiers restructured.** Old P1-P4 replaced with MVP / Fast Follow / Later:
  - **MVP:** WYSIWYG editing (full block coverage via Milkdown), same-tab toggle, complete markdown rendering (GFM, Shiki, KaTeX, Mermaid, frontmatter cards), built-in themes (Light, Dark, GitHub), stability
  - **Fast Follow:** Custom theming (JSON, Tailwind import, VSCode inheritance), spell checking in rendered view
  - **Later:** Export (HTML, rich text copy), search within preview
- **Scope boundaries defined.** VSCode only, no collaboration, no file management, no markdown linting, no PDF export, no outline/TOC.
- **Non-goals codified.** Not a standalone app, not a collaboration tool, not a mobile/web editor, not a markdown linter, not a note-taking app.
- **Success = personal satisfaction.** Founder uses it daily, workflow is meaningfully better. Organic marketplace traction is a welcome bonus, not the success criterion. No install targets or revenue goals.
- **Launch free.** Publicity and portfolio value outweigh revenue. Pro tier only if organic demand warrants it later.
- **Features cut:** PDF export, outline/TOC.
- **Features added:** GitHub-accurate rendering theme, spell checking in WYSIWYG view.

## Documents Produced

- **product-vision.md** — Draft. Vision statement, target audience (agentic developer persona), 5 product principles, 4 key capabilities, competitive differentiation table, success vision, 5 non-goals.
- **prd.md** — Draft. Restructured feature spec with MVP/Fast Follow/Later tiers. User stories by capability area. Full feature specifications for each tier. Scope boundaries, edge cases, dependencies, and open questions.

## Open Questions

- GitHub org: `purecontext-dev` or `jeffreese` personal?
- Marketplace publisher account setup
- `CustomTextEditorProvider` API validation (Phase 5 investigation)
- Milkdown prototype spike needed to validate round-trip fidelity
- Bundle size budget not yet defined

## Context for Next Phase

Phase 4 (Design & UX) should focus on the WYSIWYG editing experience — what the editor looks and feels like, how block-level editing interactions work, how the toggle transition feels, and how theming surfaces in the UI. The information architecture is relatively simple (it's a single-file editor, not a multi-view app), but the interaction design for block editing, frontmatter cards, and the raw/WYSIWYG toggle needs careful thought. The GitHub theme specifically needs design attention — it should match GitHub's rendering accurately enough that users trust it for README preview.
