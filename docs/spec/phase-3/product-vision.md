---
title: "Product Vision"
phase: 3
project: "markdown-preview"
date: 2026-05-08
status: draft
seeded_from: "cairn/projects/markdown-preview/spec.md"
---

# Product Vision

## Vision Statement

A WYSIWYG markdown editor that lives in your VSCode tab. Read and edit markdown as a human — rendered, styled, in-place. Toggle to raw with one keystroke when you need it. Theme it to match your blog or GitHub. AI writes the markdown; Human Markdown makes it something you can actually work with.

## Target Audience

**Primary persona: The Agentic Developer** — senior/mid-level engineers who use AI coding tools daily and are drowning in markdown files. They open 10-30+ markdown files per day, frequently need to edit what they're reading, and have given up on existing preview tools because the workflow costs more than it saves. See `phase-1/user-personas.md` for the full profile.

## Product Principles

1. **Same tab, not side panel.** The preview replaces the editor view in place. No split panes unless the user wants them.
2. **Instant toggle.** One hotkey flips between raw markdown and rendered preview. Fast enough to feel like a mode switch, not a page load.
3. **Your styles, not ours.** Ship with good defaults, but let users bring their own design tokens. Tailwind config import as a first-class feature.
4. **Stable.** Markdown Preview Enhanced crashes. Human Markdown does not. Webview lifecycle management, memory-conscious rendering, no unbounded DOM growth.
5. **Complete.** If a valid markdown file can contain it, Human Markdown renders it. No "unsupported syntax" messages, no missing block types. It should never feel incomplete.

## Key Capabilities

- **WYSIWYG editing** — Read and edit markdown in rendered form. Full block-type coverage: paragraphs, headings, lists, code blocks, blockquotes, tables, images. Powered by Milkdown (ProseMirror + Remark).
- **Same-tab toggle** — One keystroke switches between WYSIWYG and raw markdown. No tab splitting, no workflow disruption.
- **Complete rendering** — Everything a valid markdown file can contain: GFM, syntax highlighting, math (KaTeX), diagrams (Mermaid), frontmatter cards, task lists, tables, footnotes.
- **Theming** — Built-in themes (Light, Dark, GitHub), custom JSON themes, Tailwind config import, VSCode theme inheritance. See what your content will look like where it's published.

## Differentiation

| Feature | Human Markdown | Everyone Else |
|---------|-------------|---------------|
| WYSIWYG editing in VSCode | Yes — full block-type coverage | No — Typora is standalone, MPE is read-only |
| Same-tab toggle | Yes | No — all side-panel |
| Tailwind-native theming | Yes | No |
| GitHub-accurate rendering | Yes — dedicated GitHub theme | Approximations at best |
| Frontmatter as styled cards | Yes | No — raw YAML or hidden |
| Actively maintained + secure | Yes | MPE has unpatched CVE, absent maintainer |

[Assumption: Competitive differentiation claims should be re-verified at launch time. The extension marketplace moves fast.]

## Success Vision

The founder uses Human Markdown every day and it makes his workflow meaningfully better. That's the baseline. Raw markdown is no longer the default reading experience — every markdown file opens human-readable.

Beyond personal use: the extension gains organic traction in the VSCode marketplace. Developers switching from MPE (for security or quality) discover the WYSIWYG editing and stay. The extension becomes known as the markdown tool for the agentic development era — the one that acknowledges humans shouldn't be reading serialization formats.

No install targets or revenue goals. The product earns attention by being genuinely better, not by chasing metrics. If it becomes a popular package that people prefer, that's a welcome side effect, not the success criterion.

## Non-Goals

- **Not a standalone app.** Human Markdown lives inside VSCode. It's not Typora, not Obsidian, not a web app. Other editors (JetBrains, Zed) are possible future expansions, not v1.
- **Not a collaboration tool.** No real-time co-editing, no shared cursors, no commenting system. This is a single-user editor.
- **Not a mobile or web editor.** Desktop VSCode only.
- **Not a markdown linter or formatter.** Human Markdown presents what's there. It doesn't rewrite, reformat, or opinionize about markdown style (beyond preserving the user's existing formatting on round-trip).
- **Not a note-taking app.** No file management, no vault system, no graph view. Open a markdown file, read it, edit it, move on.
