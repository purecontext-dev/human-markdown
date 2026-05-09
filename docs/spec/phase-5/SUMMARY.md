---
title: "Phase 5 Summary: Technical Planning"
project: markdown-preview
date: 2026-05-09
---

## Key Outcomes

- **Architecture defined.** Two runtime contexts: extension host (Node.js) owns document lifecycle and config; webview (browser) owns rendering, editing, and theming. Communication via VSCode's `postMessage` API.
- **Full stack locked in.** TypeScript, pnpm, esbuild, Vitest, Biome, husky + lint-staged. All choices align with user preferences and VSCode ecosystem standards.
- **Three ADRs accepted:**
  - ADR-001: Milkdown as WYSIWYG engine with ProseMirror + Remark fallback
  - ADR-002: `CustomTextEditorProvider` for same-tab editing
  - ADR-003: Shared rendering pipeline across preview and edit modes
- **Prototype spike defined.** 3-5 day spike to validate: round-trip fidelity, webview stability, block editing UX, table editing, bundle size. Exit criteria: if 3+ of 5 fail, pivot to custom bridge.
- **CI/CD: GitHub Actions.** Lint/typecheck/test on push. Tag-triggered marketplace publishing via `vsce`. Developer controls releases via git tags.
- **Performance targets set.** File open < 200ms, toggle < 100ms, block re-render < 50ms, bundle < 500KB gzipped.
- **Security is a competitive differentiator.** Strict CSP, no network requests, adversarial XSS test suite, Dependabot. Direct contrast with MPE's CVE-2025-65716.

## Documents Produced

- **technical-spec.md** — Architecture diagram, component breakdown (CustomTextEditorProvider, rendering pipeline, Milkdown editor, configuration manager, theme engine), data flows for key user actions, performance requirements, prototype spike definition.
- **tech-manifest.md** — Full stack with rationale and trade-offs for every choice. CI/CD pipeline. Code style settings.
- **adrs.md** — Three ADRs with status, context, alternatives, consequences, and enforcement rules.
- **security-checklist.md** — Threat model, webview CSP, dependency security, OWASP relevance, adversarial testing plan, competitive positioning.

## Open Questions

- `CustomTextEditorProvider` edge cases with extension conflicts and language feature retention in raw mode (validate in prototype spike)
- Bundle size budget (500KB target) — may need adjustment based on Mermaid + KaTeX actual sizes with lazy loading

## Context for Next Phase

Phase 6 (Development Preparation) produces the artifacts needed to start building: CLAUDE.md for the development repo, task breakdown, repo structure, testing strategy. The ADR enforcement rules should become rules in the exported project's `.claude/rules/`. The prototype spike should be the first task in the breakdown. CI/CD pipeline config (GitHub Actions) should be scaffolded.
