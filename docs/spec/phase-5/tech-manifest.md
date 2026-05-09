---
title: "Technology Manifest"
phase: 5
project: "markdown-preview"
date: 2026-05-09
status: draft
---

# Technology Manifest

## Overview

Stack philosophy: **ecosystem-standard choices, minimal dependencies, TypeScript end-to-end.** Every choice is either what VSCode uses internally (Shiki, TypeScript) or the proven default in the VSCode extension ecosystem (esbuild, markdown-it). No experimental technology. The product's innovation is in the UX, not the stack.

## Language

| Attribute | Details |
|---|---|
| **Choice** | TypeScript (strict mode) |
| **Alternatives Considered** | None — TypeScript is the only real option for VSCode extensions |
| **Rationale** | End-to-end type safety across extension host and webview. VSCode's API is typed. |
| **Trade-offs Accepted** | Build step required (esbuild handles this). |

## WYSIWYG Engine

| Attribute | Details |
|---|---|
| **Choice** | Milkdown (ProseMirror + Remark) |
| **Alternatives Considered** | Tiptap (ProseMirror, largest ecosystem, markdown secondary), Plate (Slate + React, strong MD but React-locked), Lexical (Meta, weak markdown), BlockNote (lossy MD), MDXEditor (too heavy), ProseMirror direct (maximum control, maximum effort) |
| **Rationale** | Markdown-native architecture (Remark-based round-trip). Framework-agnostic. Proven in VSCode webviews. Low issue count (25). ~120-180KB selective imports. |
| **Trade-offs Accepted** | Smaller community than Tiptap. Effectively single-maintainer (Saul Mirone). Fallback plan: custom ProseMirror + Remark bridge (4-8 weeks). Prototype spike validates before full commitment. |

## Rendering

| Attribute | Details |
|---|---|
| **Choice** | markdown-it with plugin ecosystem |
| **Alternatives Considered** | Remark (unified ecosystem) — Milkdown already uses Remark internally, but markdown-it is the VSCode ecosystem standard for rendering |
| **Rationale** | What VSCode uses internally. Rich plugin ecosystem. Well-understood behavior. |
| **Trade-offs Accepted** | Two markdown parsers in the stack (markdown-it for rendering, Remark inside Milkdown for editing). Acceptable because they serve different roles. |

## Syntax Highlighting

| Attribute | Details |
|---|---|
| **Choice** | Shiki |
| **Alternatives Considered** | highlight.js — simpler but less accurate |
| **Rationale** | VSCode uses Shiki internally. TextMate grammar compatible. Accurate highlighting that matches the editor. |
| **Trade-offs Accepted** | Heavier than highlight.js. Lazy-loading per language mitigates. |

## Math Rendering

| Attribute | Details |
|---|---|
| **Choice** | KaTeX |
| **Alternatives Considered** | MathJax — more complete but significantly heavier and slower |
| **Rationale** | Fast, lightweight, handles the vast majority of math markup. |
| **Trade-offs Accepted** | Some edge-case LaTeX not supported. Acceptable for a markdown editor. |

## Diagram Rendering

| Attribute | Details |
|---|---|
| **Choice** | Mermaid |
| **Alternatives Considered** | None — Mermaid is the standard for markdown-embedded diagrams |
| **Rationale** | Industry standard. GitHub renders Mermaid natively. |
| **Trade-offs Accepted** | Large library. Lazy-load only when document contains Mermaid blocks. |

## Frontmatter Parsing

| Attribute | Details |
|---|---|
| **Choice** | gray-matter |
| **Alternatives Considered** | Custom YAML parsing — unnecessary when gray-matter exists |
| **Rationale** | Battle-tested (Gatsby, Astro, VitePress). Handles edge cases. |
| **Trade-offs Accepted** | None significant. |

## Theming Foundation

| Attribute | Details |
|---|---|
| **Choice** | @tailwindcss/typography (prose classes) |
| **Alternatives Considered** | Custom CSS — more work, less consistent |
| **Rationale** | Purpose-built for prose styling. Config-driven. Tailwind import is a product feature — using Typography internally aligns the theming pipeline. |
| **Trade-offs Accepted** | Dependency on Tailwind's design opinions. Customizable via CSS custom properties. |

## Bundler

| Attribute | Details |
|---|---|
| **Choice** | esbuild |
| **Alternatives Considered** | webpack (VSCode's official template uses it, but slow), Rollup (viable but esbuild is faster) |
| **Rationale** | Fast. Handles both extension host (CJS) and webview (ESM) targets. Standard in modern VSCode extension development. |
| **Trade-offs Accepted** | Less plugin ecosystem than webpack. Not needed for this project's complexity. |

## Package Manager

| Attribute | Details |
|---|---|
| **Choice** | pnpm |
| **Alternatives Considered** | npm, yarn — pnpm is the user's default preference |
| **Rationale** | Fast installs, strict dependency resolution, disk-efficient. |
| **Trade-offs Accepted** | Slightly less common in VSCode extension tutorials (most use npm). No practical impact. |

## Testing

| Attribute | Details |
|---|---|
| **Choice** | Vitest |
| **Alternatives Considered** | Jest — viable but Vitest is faster and aligns with esbuild |
| **Rationale** | Fast, TypeScript-native, compatible with esbuild. User's default preference. |
| **Trade-offs Accepted** | Unit tests only. No integration testing of the webview (VSCode extension integration testing is notoriously difficult and not worth the investment for this project). |

## Linting & Formatting

| Attribute | Details |
|---|---|
| **Choice** | Biome |
| **Alternatives Considered** | ESLint + Prettier — two tools, more config |
| **Rationale** | Single tool for linting and formatting. Fast. User's default preference. |
| **Trade-offs Accepted** | Smaller plugin ecosystem than ESLint. Sufficient for this project. |

## Pre-commit Hooks

| Attribute | Details |
|---|---|
| **Choice** | husky + lint-staged |
| **Alternatives Considered** | lefthook — viable but husky is more established |
| **Rationale** | Run Biome and tests on staged files before commit. User's default preference. |
| **Trade-offs Accepted** | None significant. |

## CI/CD

| Attribute | Details |
|---|---|
| **Choice** | GitHub Actions |
| **Alternatives Considered** | None — GitHub Actions is the standard for open source GitHub projects |
| **Rationale** | Free for public repos. First-class `vsce` support. Tag-triggered releases. |
| **Trade-offs Accepted** | None. |

**Pipeline:**

| Trigger | Steps |
|---------|-------|
| Push / PR | Biome lint, type check, Vitest unit tests, esbuild build |
| Git tag (`v*`) | All of the above + `vsce package` + publish to VSCode Marketplace |

## Code Style

| Setting | Value |
|---------|-------|
| Semicolons | asNeeded |
| Quotes | single |
| Indent | 2 spaces |
| Line width | 100 |
| Test files | Co-located (`*.test.ts` next to source) |
