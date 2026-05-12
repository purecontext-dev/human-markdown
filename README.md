# Human Markdown

A WYSIWYG markdown editor for VSCode. Open any `.md` file, read it rendered, edit it inline. Toggle to raw with one keystroke.

AI writes the markdown. Human Markdown makes it something you can actually read and work with.

## Features

**WYSIWYG Editing** — Click into any block and edit directly in the rendered view. Headings, lists, tables, code blocks, blockquotes, images — all editable in place.

**One-Keystroke Toggle** — `Cmd+Shift+V` (or `Ctrl+Shift+V`) flips between the rendered editor and raw markdown. Same tab, no context switch.

**Full Markdown Rendering** — GFM tables, task lists, math (KaTeX), diagrams (Mermaid), syntax-highlighted code blocks, frontmatter cards, footnotes.

**Built-in Themes** — Light, Dark, and GitHub themes. Auto mode matches your VSCode color scheme. Switch via command palette or settings.

**Round-Trip Fidelity** — Your formatting stays intact. Indent style, heading style, list markers, blank lines — preserved through edits.

**Fast** — Opens in under 200ms. Mode toggle under 100ms. Lazy-loads heavy renderers (Mermaid, KaTeX) only when needed.

## Usage

1. Open any `.md` file
2. Right-click the editor tab → "Reopen Editor With..." → "Human Markdown"
3. Or set as default: `"workbench.editorAssociations": { "*.md": "humanMarkdown.preview" }`

### Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| Human Markdown: Toggle WYSIWYG / Raw | `Cmd+Shift+V` | Switch between rendered and raw |
| Human Markdown: Select Theme | — | Pick a theme from the palette |

### Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `humanMarkdown.theme` | `auto` | Theme: auto, light, dark, github |
| `humanMarkdown.defaultMode` | `wysiwyg` | Default mode when opening files |

## Requirements

- VSCode 1.85+

## Feedback & Issues

Found a bug or have a feature request? Email [support@purecontext.dev](mailto:support@purecontext.dev).
