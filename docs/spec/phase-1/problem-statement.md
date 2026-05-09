---
title: "Problem Statement"
phase: 1
project: "markdown-preview"
date: 2026-05-08
status: draft
seeded_from: "cairn/projects/markdown-preview/spec.md"
---

# Problem Statement

## The Problem

There is no good way to read and edit markdown as a human. Developers can stare at raw syntax or open a read-only preview — but they can't do both in the same place. Every tool forces a split: edit here, read over there, lose your scroll position, lose your context, switch modes constantly. The result is that the format LLMs and developers have converged on as their shared language is one that's still painful to actually work with. This is true across editors, but the pain is sharpest in VSCode — where the largest developer population lives and where the dominant preview extension has an unpatched critical vulnerability.

The dominant third-party extension (Markdown Preview Enhanced, 9.2M installs) has an unpatched high-severity XSS vulnerability (CVE-2025-65716, CVSS 8.8) and a maintainer who hasn't responded in 8+ months. But even if it were patched and maintained, it still wouldn't solve the core problem — it's read-only, side-panel-only, and can't be edited inline.

The problem is universal but the v1 solution targets VSCode. Expansion to other editors (JetBrains, Zed) or standalone use is possible if the product earns it, but not planned.

## Who Has This Problem

Developers who write and review markdown regularly inside VSCode. This includes:

- Developers writing documentation (READMEs, ADRs, guides, CLAUDE.md files)
- Technical writers and content creators drafting blog posts, tutorials, and curriculum
- Engineers working with LLM-generated markdown output (Claude Code, Cursor, Copilot)
- Open source maintainers managing project documentation

See `phase-1/user-personas.md` for the full persona: The Agentic Developer.

## Current Solutions & Workarounds

| Solution | What's broken |
|----------|--------------|
| **VSCode built-in preview** | Side-panel only. Takes half your screen. No theming beyond VSCode theme. Basic rendering. |
| **Markdown Preview Enhanced** (9.2M installs) | Unpatched XSS (CVE-2025-65716, CVSS 8.8). Maintainer unresponsive 8+ months. Crashes. Side-panel only. |
| **Other VSCode extensions** | Fragmented, poorly maintained, limited features. None offer in-tab preview. |
| **External tools (Typora, Obsidian, etc.)** | Requires leaving VSCode. Context switch. Doesn't integrate with editor workflow. |
| **Browser-based preview** (GitHub, local server) | Manual refresh. Doesn't match final styling. Extra tooling overhead. |

[Open Decision] The competitive analysis is light — specifically, what other VSCode extensions exist in this space and what are their actual install numbers and limitations? Typora and Obsidian are mentioned as external but not analyzed.

## Why It Matters

- **Security exposure**: Millions of developers are running an extension with a known remote code execution vulnerability. Every markdown file they preview is an attack surface.
- **Productivity loss**: Side-panel preview forces a split layout, halving usable editor space. Developers toggle between raw and preview constantly — each context switch costs time and focus.
- **Styling disconnect**: Blog authors, documentation writers, and content creators can't see how their markdown will actually render in its target context. The preview looks nothing like the output.

The long-term value prop is the full package: active maintenance by someone who uses it daily, theming, and WYSIWYG editing. The security gap is the door-opener, not the foundation.

## Why Now

Three things converged:

1. **Security vacuum**: The most-installed third-party markdown preview extension has a critical vulnerability and an absent maintainer. Users are actively looking for alternatives.
2. **LLM-driven markdown explosion**: AI tools have made markdown the lingua franca of software development. Claude Code generates CLAUDE.md files, planning docs, specs, and ADRs. Cursor, Copilot, and similar tools output markdown constantly. Writing assistants draft articles in markdown. The volume of markdown a developer interacts with daily has multiplied — and it's all being read in raw form or through inadequate previewers that can't be edited inline.
3. **No innovation in the space**: Nobody has built in-tab toggle, Tailwind-native theming, or frontmatter rendering as styled cards. The feature ceiling in existing tools is low.

[Assumption: The "absent maintainer" window is temporary. If MPE gets forked or patched, the security positioning weakens. The product needs to stand on its own UX merits.]

## Assumptions

- Developers prefer in-tab preview over side-panel preview [Assumption: untested — conventional, but nobody's shipped it to validate]
- The VSCode extension marketplace is the right distribution channel [Assumption: seems obvious, but worth confirming there isn't a better wedge]
- Tailwind-native theming is a meaningful differentiator, not a niche feature [Assumption: depends on what percentage of target users use Tailwind]
- There's a viable path to open core monetization for a markdown preview tool [Assumption: unvalidated — free tools in this space set expectations]
- LLM-driven markdown usage will continue growing [Assumption: reasonable but worth tracking]
