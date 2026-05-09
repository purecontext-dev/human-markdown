---
title: "Phase 2 Summary: Validation & Market Fit"
project: markdown-preview
date: 2026-05-09
---

## Key Outcomes

- **Go decision.** Founder-as-user validation — the pain is real, the timing is right, the risk is execution not market.
- **Value prop centered on edit-in-place.** The strongest fit is WYSIWYG editing eliminating the preview-to-raw-to-preview cycle. One-keystroke toggle and Tailwind theming are strong secondary fits.
- **Scope refined:** Full markdown rendering in MVP (KaTeX, Mermaid, everything). PDF export cut. Spell checking and GitHub rendering theme added. WYSIWYG editing confirmed as core product.
- **Biggest risk: Milkdown round-trip fidelity.** Prototype spike needed early. Fallback plan: custom ProseMirror + Remark bridge.
- **Monetization: launch free.** Publicity and portfolio value outweigh revenue. Pro tier only if organic demand warrants it.
- **Priority tiers need restructuring in Phase 3.** Original P1-P4 is stale. Recommended: MVP (WYSIWYG + rendering + toggle + built-in themes), fast follow (custom theming + spell checking), later (export + TOC + search).

## Documents Produced

- **value-proposition-canvas.md** — Full jobs/pains/gains mapping. 8 pains identified, all with pain relievers. Strong fits: edit-in-place, one-keystroke toggle, Tailwind theming, table rendering, GitHub theme. No over-serves after scope adjustments.
- **validation-summary.md** — Go decision with evidence table. 3 assumptions validated, 2 low-risk unvalidated (Tailwind differentiator, open core viability). 4 risks ranked with mitigations.

## Open Questions

- Tailwind theming adoption — unvalidated but low-risk (JSON themes and VSCode theme inheritance cover non-Tailwind users)
- Single-maintainer sustainability if the project gains traction
- Bundle size budget not yet defined — full plugin set could be heavy

## Context for Next Phase

Phase 3 (Product Definition) has seeded drafts of the product vision and PRD from the original spec, but both need significant rework:
- Product vision needs: success metrics, non-goals, and the vision statement should reflect WYSIWYG-as-core (not preview-as-core)
- PRD needs: priority tiers restructured (P1-P4 → MVP/fast-follow/later), user stories grounded in the agentic developer persona, scope boundaries defined, edge cases covered
- The product name is **Human Markdown**
- GitHub rendering theme is a new addition to capture in the PRD
