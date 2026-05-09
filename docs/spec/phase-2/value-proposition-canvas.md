---
title: "Value Proposition Canvas"
phase: 2
project: "markdown-preview"
date: 2026-05-09
status: draft
---

# Value Proposition Canvas

## Customer Profile

### Jobs to Be Done

**Functional:**
- Review AI-generated markdown for accuracy and quality — read it, understand it, decide if it's right
- Edit markdown content (docs, specs, blog posts) without leaving the rendered view
- Visually parse complex markdown structures (tables, nested lists, frontmatter) that are unreadable in raw form
- Preview blog content styled the way it will actually render on the published site
- Write and refine long-form content (articles, tutorials, documentation) with frequent edits

**Emotional:**
- Stop feeling like the tooling hasn't kept up with how they work — AI generates beautiful structured content, but they're reading it through a keyhole
- Remove the low-grade friction of "I could read this better but it's not worth the 3-step workflow to get there"

### Pains

1. **Raw markdown is not meant to be read by humans.** Markdown is a serialization format — like HTML, it describes rendering intent. Tables, nested structures, and frontmatter are especially painful to parse visually in raw form. But developers read it raw all day because the alternative is worse.
2. **The preview workflow costs more than it saves.** Right-click → open with extension → drag tab back to unsplit pane → lose editing ability. Most of the time, developers just don't bother.
3. **Editing means leaving the preview.** If you want to change something, you switch back to raw, find your place, edit, then re-preview. For files with frequent edits (blog posts, specs), this is painful enough that users give up on preview entirely.
4. **Volume has exploded.** AI tools generate markdown constantly — planning docs, specs, ADRs, summaries. The number of markdown files a developer interacts with daily has multiplied. The inadequacy of current tooling scales with volume.
5. **Blog content looks nothing like the published site.** Generic preview styling gives no indication of what the content will actually look like when rendered on the target site. Context switching to a browser to check is another workflow interruption.
6. **Can't preview how GitHub will render markdown.** READMEs, PR descriptions, and wiki pages render with GitHub's specific markdown flavor and styling. No way to see that in VSCode before pushing.
7. **No spell checking in context.** Existing spell checkers flag markdown syntax and code blocks. There's no way to spell-check the prose in its rendered form.
8. **The dominant extension is a security risk.** MPE has an unpatched critical XSS vulnerability (CVE-2025-65716, CVSS 8.8) and an absent maintainer.

### Gains

- **Review AI output in human-readable form without workflow disruption.** Open a markdown file, see rendered content, make edits, move on. No mode switching, no tab juggling.
- **Actually see tables.** Tables render as tables, not ASCII pipes. This alone changes the review experience for spec documents and data-heavy content.
- **Write blog posts with confidence.** See what the published output will look like while writing. Catch formatting issues before pushing, not after.
- **Produce more content.** Lower friction means less avoidance. Files that currently get skimmed in raw form get properly reviewed. Blog posts get written more fluidly because the edit-preview cycle disappears.

## Value Map

### Products & Services

- In-tab WYSIWYG markdown editor with toggle to raw mode
- Rich rendering (GFM, syntax highlighting, math, diagrams, frontmatter cards, tables)
- Custom theming (JSON themes, Tailwind config import, VSCode theme inheritance)
- Spell checking in rendered view
- Same-tab toggle between raw and rendered (one keystroke)
- Export (HTML, PDF, rich text copy)

### Pain Relievers

| Pain | Reliever |
|------|----------|
| Raw markdown isn't meant to be read | WYSIWYG view renders markdown as humans are meant to see it |
| Preview workflow too clunky | One keystroke toggle, same tab — no right-click, no tab splitting |
| Editing means leaving preview | Edit directly in the rendered view — no mode switching |
| Volume explosion | Every markdown file opens human-readable by default. The tool scales with volume because there's no per-file workflow cost |
| Blog doesn't match published site | Tailwind config import renders preview with your actual site's design tokens |
| Can't see what markdown looks like on GitHub | GitHub theme matches GitHub's actual markdown rendering — preview READMEs, PR descriptions, and wiki pages as they'll appear |
| No spell checking in context | Spell checking operates on rendered prose, not raw syntax |
| Dominant extension is a security risk | Actively maintained, secure, no known vulnerabilities |

### Gain Creators

| Gain | Creator |
|------|---------|
| Review AI output without friction | WYSIWYG is the default view — open file, read rendered content, edit inline |
| Actually see tables | Full table rendering with proper alignment, editable in-place |
| Write blog posts with confidence | Tailwind theming shows published appearance while writing |
| Know what GitHub will render | GitHub theme previews READMEs and PR descriptions accurately |
| Produce more content | Zero-friction editing removes the avoidance behavior that raw markdown causes |

## Fit Assessment

### Strong Fits

- **Edit-in-place ↔ "editing means leaving preview"** — This is the strongest fit. The core product directly eliminates the core pain. Nobody else offers this in VSCode.
- **One-keystroke toggle ↔ "preview workflow too clunky"** — Reduces a 3+ step workflow to a single keypress.
- **Tailwind theming ↔ "blog doesn't match site"** — Direct solve for content creators who publish from markdown. Unique differentiator.
- **Table rendering ↔ "raw markdown unreadable"** — Tables are the most painful raw markdown structure. Rendering them is immediate relief.

### Gaps

- **Collaboration.** The persona works alone. If teams need shared markdown editing (Google Docs-style), this doesn't address it. [Open Decision] Is this a gap that matters, or a non-goal?
- **Non-VSCode users.** v1 is VSCode-only. Developers in JetBrains, Zed, or Neovim have the same pain but no relief.
- **Markdown generation quality.** Human Markdown makes AI-generated markdown readable, but doesn't help if the AI generates *bad* markdown. The tool presents what's there — it doesn't improve the source.

### Over-Serves

- None identified. Math/KaTeX and Mermaid diagrams confirmed as MVP — anything a valid markdown file can contain, Human Markdown renders. PDF export removed — no real user job behind it.
