---
title: "User Personas"
phase: 1
project: "markdown-preview"
date: 2026-05-08
status: draft
---

# User Personas

## Primary Persona: The Agentic Developer

### Context

A senior or mid-level engineer who has integrated AI coding tools (Claude Code, Cursor, Copilot) deeply into their daily workflow. They don't just use AI occasionally — it's a core part of how they work. As a result, they generate and consume an enormous volume of markdown files every day: CLAUDE.md configs, planning docs, specs, ADRs, blog article drafts, READMEs, and AI-generated documentation. Markdown has become their primary format for both human-written and AI-generated content.

They work in VSCode. They're power users — comfortable with keybindings, extensions, and customization. They've tried the existing markdown preview options and found them all lacking.

### Pain Points

- **The preview workflow is too clunky to bother with.** Right-click → "Open with Markdown Preview Enhanced" → drag the tab back to the unsplit pane. It's 3+ steps just to read a file in a human-friendly format. Most of the time, they just read raw markdown instead.
- **Editing means leaving the preview.** If they do open a preview and want to edit something, they have to switch back to raw markdown and find their place again. The back-and-forth is painful enough that they default to raw for any file they'll edit, even though the reading experience is worse.
- **Volume has exploded.** AI tools generate markdown constantly — planning docs, specs, summaries, code documentation. The sheer volume of markdown they interact with daily has multiplied, but the tooling hasn't kept up. They're drowning in .md files that are unpleasant to read in raw form.
- **Blog writing suffers.** When editing articles or long-form content in markdown, they do frequent edits. The preview-edit-preview cycle is so painful they give up on preview entirely and write in raw markdown, sacrificing the reading experience for editing convenience.
- **No spell checking in context.** Existing spell checkers work on raw markdown, flagging syntax characters and code blocks. There's no spell checking in the rendered view where they're actually reading prose.

### Goals

- Read markdown files in a human-friendly rendered format without leaving their editor tab or splitting their workspace
- Edit markdown directly in the rendered view without switching back to raw syntax
- Have the toggle between raw and rendered be fast enough that it feels like a mode switch, not a workflow disruption
- Preview content styled the way it will actually look when published (blog, docs site)

### Behavior Patterns

- Opens 10-30+ markdown files per day across multiple projects
- Frequently reads AI-generated markdown output to review, refine, or approve it
- Writes blog articles, documentation, and planning docs in markdown
- Uses keybindings heavily — a one-keystroke toggle is essential
- Has tried and abandoned multiple markdown preview extensions
- Currently suffers through raw markdown for most files because the preview workflow costs more than it saves

### Technical Profile

Power user. Lives in VSCode. Comfortable with extensions, config files, and terminal. Uses multiple AI coding tools daily. Likely uses Tailwind or similar utility-first CSS framework for personal/work projects.

### What Would Make Them Switch

- **One keystroke to rendered view, one keystroke back.** No tab splitting, no right-click menus.
- **Inline editing in the rendered view.** The killer feature — they can read *and* edit in the same mode.
- **It has to be stable.** They've been burned by MPE crashes. If this extension crashes or has rendering bugs, they'll uninstall it the same day.
- **It has to be fast.** Toggle latency is the difference between "mode switch" and "page load." If it's perceptibly slow, the keybinding isn't worth it.

---

## Anti-Persona: The Markdown Tourist

Someone who opens a markdown file once a week, reads the README, and moves on. They don't write markdown, they don't edit it frequently, and the built-in VSCode side-panel preview is fine for their needs. They wouldn't notice the difference between Human Markdown and the built-in preview, and they wouldn't pay for pro features.

Human Markdown isn't for people who occasionally glance at a README. It's for people who live in markdown files all day and are frustrated by the gap between what they read and what they can do with it.

---

## Persona Priority

One persona. The agentic developer is the user, the buyer, and the evangelist. Every design decision optimizes for their workflow: high-volume markdown consumption, frequent editing, AI-generated content review, and zero tolerance for workflow friction.

[Open Decision] As the product matures, a secondary persona may emerge — technical writers, content creators, or documentation specialists who aren't engineers but work heavily in markdown. For v1, the agentic developer is the only persona that matters.
