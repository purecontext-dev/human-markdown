---
title: "Phase 1 Summary: Ideation & Problem Discovery"
project: markdown-preview
date: 2026-05-09
---

## Key Outcomes

- **Product name decided: Human Markdown.** Positioning: "AI wrote you a markdown file, we present it in a human format."
- **Core problem reframed.** Not "markdown preview is broken" — it's "there's no good way to read and edit markdown as a human." The edit-preview split is the real pain, not just preview quality.
- **WYSIWYG editing is the product, not a future feature.** The original seed spec had inline editing as Priority 4. Interview revealed it's the primary reason for the extension. Full block-type coverage (paragraphs, headings, lists, code blocks, blockquotes, tables, images) ships in v1.
- **Single persona: The Agentic Developer.** Engineers using AI coding tools who are drowning in markdown files. High-volume consumption (10-30+ files/day), frequent editing, zero tolerance for workflow friction.
- **Editor engine: Milkdown (ProseMirror + Remark), with custom ProseMirror + Remark bridge as fallback.** Full landscape evaluation of 7 options conducted. Milkdown won on markdown-native architecture, framework-agnostic design, and proven VSCode webview use. Prototype spike required to validate before full commitment.
- **Scope: VSCode first.** Problem framed broadly (markdown tooling is broken everywhere) but v1 targets VSCode only. Expansion possible if earned.
- **Spell checking captured as a feature.** In-context spell checking in the WYSIWYG view, not raw markdown.

## Documents Produced

- **problem-statement.md** — Draft. Covers the problem (can't read and edit markdown in the same place), who has it (agentic developers), current solutions (all broken), why it matters (security + productivity + styling), why now (security vacuum + LLM explosion + no innovation). 5 assumptions flagged for Phase 2 validation.
- **user-personas.md** — Draft. One primary persona (The Agentic Developer) with full context, pain points, goals, behavior patterns, technical profile, and switching criteria. Anti-persona defined (The Markdown Tourist). Secondary persona parked for later.

## Open Questions

- Competitive analysis is light — MPE is the main reference point, no systematic survey of other extensions
- 5 assumptions need validation (in-tab preference, VSCode as distribution channel, Tailwind theming value, open core viability, LLM markdown growth)
- Pro tier timing: gate from day one or launch free?
- GitHub org: purecontext-dev or personal?

## Context for Next Phase

Phase 2 (Validation & Market Fit) should focus on validating the 5 assumptions from the problem statement. The strongest validation target is the core UX claim: that developers prefer in-tab WYSIWYG editing over side-panel preview. The persona is well-defined — "The Agentic Developer" — and grounded in real behavior (the founder's daily workflow). The market timing argument (MPE's vulnerability + LLM markdown explosion) is strong but time-bound. The value proposition canvas should center on the edit-in-place experience, not just "better preview."
