---
title: "UI/UX Specification"
phase: 4
project: "markdown-preview"
date: 2026-05-09
status: draft
---

# UI/UX Specification

## Component Inventory

### Document-Level Components

| Component | Purpose | Variants |
|-----------|---------|----------|
| **Frontmatter Card** | Renders YAML frontmatter as styled key-value metadata | Expanded (default), collapsed, error state (invalid YAML → styled code block) |
| **Document Body** | Scrollable container for rendered markdown content | Themed (Light, Dark, GitHub, custom) |
| **Mode Indicator** | Shows current mode (WYSIWYG / Raw) | Subtle — status bar item or small badge, not a large UI element |

### Block-Level Components

| Component | Purpose | States |
|-----------|---------|--------|
| **Text Block** | Paragraphs, headings | Rendered (default), editing (inline), hover (subtle edit affordance) |
| **List Block** | Ordered, unordered, task lists | Rendered, editing. Task list checkboxes are interactive in rendered state. |
| **Code Block** | Fenced code with syntax highlighting | Rendered (Shiki highlighting + copy button), editing (raw markdown with syntax coloring) |
| **Table Block** | Rendered table with alignment | Rendered (proper column alignment), editing (inline cell editing — attempt first, fall back to raw markdown if quality bar isn't met) |
| **Blockquote** | Styled quote with left border | Rendered, editing |
| **Image** | Rendered image with alt text | Rendered (lazy-loaded), broken state (alt text + error indicator) |
| **Math Block** | KaTeX-rendered equations | Rendered, editing (raw LaTeX), error state (invalid LaTeX → raw with error) |
| **Mermaid Block** | Rendered diagram | Rendered, editing (raw Mermaid syntax), error state (invalid → raw with error) |

### Utility Components

| Component | Purpose |
|-----------|---------|
| **Copy Button** | Appears on code blocks — copies content to clipboard |
| **Collapse Toggle** | Frontmatter card expand/collapse |
| **Theme Selector** | Command palette integration for theme switching |

## Interaction Patterns

### Block Editing (Core Interaction)

This is the most important interaction in the product. It needs to feel natural and fast.

**Entering edit mode:**
- Click on a rendered block → block transitions to editable state
- The block reveals its markdown content inline, styled as an editable text area that fits naturally within the document flow
- Surrounding blocks remain rendered — no full-document mode switch
- Cursor is placed at the click position within the block's text

**While editing:**
- Standard text editing: typing, selection, copy/paste
- Markdown syntax is visible but styled (not raw monospace — light syntax coloring to maintain readability)
- Block height adjusts dynamically as content changes

**Exiting edit mode:**
- Click outside the block → block re-renders
- Press `Escape` → block re-renders
- The transition from editing to rendered should be fast enough to feel instant
- If the markdown is invalid or partially complete, render what's parseable, keep the rest as styled raw text

**Keyboard navigation:**
- `Tab` from an editing block moves focus to the next block (enters edit mode)
- `Shift+Tab` moves to the previous block
- `Enter` within a block creates a new line (standard behavior)
- Arrow keys at block boundaries move to adjacent blocks

[Open Decision] Should `Enter` at the end of a block create a new block (Notion-style) or a new line within the same block (traditional editor)? Markdown semantics suggest new line within block — a blank line creates a new paragraph. Follow markdown convention.

### Mode Toggle

**WYSIWYG → Raw:**
- User presses `Cmd+Shift+V`
- If implementation allows instant swap: hard cut, no animation
- If a rendering delay is unavoidable: brief crossfade (100-200ms) to mask the transition
- Scroll position preserved — raw mode opens at the equivalent line position
- Any in-progress block edit is committed before switching

**Raw → WYSIWYG:**
- User presses `Cmd+Shift+V`
- Same transition behavior as above (instant or brief crossfade)
- Cursor position in raw mode maps to the nearest rendered block
- Document re-renders from the current `TextDocument` state

### Frontmatter Card

- Rendered at the top of the document, above the body content
- Collapsed by default if the user has previously collapsed it (state persisted)
- Click the collapse toggle to expand/collapse
- Key-value layout with typed formatting:
  - Dates: human-readable format
  - Arrays: rendered as pills/tags (purely visual — no click action in single-file context)
  - Booleans: styled indicators (checkmark/x or on/off)
  - Strings: plain text
- On parse failure: show the raw YAML in a styled code block with an error indicator

### Task List Checkboxes

- Checkboxes in task lists (`- [ ]` / `- [x]`) are interactive in rendered mode
- Clicking a checkbox toggles its state and writes the change back to the `TextDocument`
- No need to enter block editing mode — this is a direct manipulation affordance

### Code Block Copy

- Copy button appears on hover (top-right corner of code block)
- Click copies the code content (not the markdown fences) to clipboard
- Brief "Copied" confirmation (tooltip or button state change, 1-2 seconds)

## Responsive Behavior

Not applicable in the traditional sense — VSCode controls the editor pane dimensions. Human Markdown's WYSIWYG view should:
- Respect the pane width — content reflows to fit
- Use a max content width (configurable, default ~720px) with centered layout for readability on wide panes
- On narrow panes: content fills available width, tables scroll horizontally if needed

## Accessibility Requirements

Target: WCAG AA pragmatic baseline.

- **Keyboard navigation**: All block editing interactions accessible via keyboard (Tab/Shift+Tab between blocks, Enter to edit, Escape to exit)
- **Screen reader support**: Rendered content should be semantically correct HTML (proper heading hierarchy, list structure, table markup). Mode changes announced.
- **Color contrast**: All three built-in themes meet WCAG AA contrast ratios (4.5:1 for body text, 3:1 for large text)
- **Focus management**: Visible focus indicators on editable blocks. Focus moves logically when entering/exiting edit mode.
- **Reduced motion**: Respect `prefers-reduced-motion` — skip any crossfade transitions if enabled

## Error Handling UX

| Error | User Experience |
|-------|----------------|
| **Invalid markdown syntax** | Render what's parseable. Show unparseable sections as styled raw text (not an error message — just graceful degradation). |
| **Plugin failure** (Mermaid, KaTeX) | Show the raw block content with a subtle error indicator (icon + "Could not render"). User can still edit the block. |
| **Frontmatter parse failure** | Show raw YAML in a styled code block instead of the metadata card. Subtle "Invalid YAML" indicator. |
| **Image load failure** | Show alt text with a broken image icon. |
| **Webview memory pressure** | Proactively dispose off-screen rendered content. If critical: show a "Document too large for rendered view — switch to raw mode" message with a one-click toggle. |
| **Extension conflict** | If another extension claims the markdown file type, Human Markdown should degrade gracefully (offer to open via command palette instead of auto-activating). |

## Loading States

- **Initial file open**: Render as fast as possible. For typical documents (<500 lines), target sub-200ms render time — no loading indicator needed. For large documents: show content progressively (top-down), no spinner.
- **Toggle transition**: If instant, no loading state. If delayed: crossfade masks the wait. Never show a spinner for a mode toggle.
- **Theme change**: Re-render with new theme tokens. Should be instant (CSS custom property swap, no re-parse). No loading indicator.
- **Heavy plugin render** (large Mermaid diagram, complex math): Render the block placeholder immediately ("Rendering diagram..."), replace with rendered content when ready. Don't block the rest of the document.

## Animation & Motion

Minimal. Animation serves function, not polish.

- **Mode toggle**: Hard cut if instant. Brief crossfade (100-200ms) only if needed to mask rendering delay.
- **Block edit enter/exit**: No animation — the transition between rendered and editing state should be fast enough to not need one. If a slight layout shift occurs, a 50-100ms ease-out prevents jarring jumps.
- **Frontmatter collapse/expand**: Subtle slide animation (150ms) or none — follow the user's `prefers-reduced-motion` setting.
- **Code block copy confirmation**: Button state change (text swap or checkmark icon), no toast or overlay.
- **No gratuitous animation.** No entrance effects, no bouncing, no parallax. This is a productivity tool used all day.
