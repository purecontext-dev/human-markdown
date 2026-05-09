# Human Markdown

A WYSIWYG markdown editor for VSCode. Read and edit markdown as a human — rendered, styled, in-place. Toggle to raw with one keystroke.

AI writes the markdown. Human Markdown makes it something you can actually work with.

## Features

- **WYSIWYG editing** — Edit markdown directly in the rendered view. Full block-type coverage.
- **Same-tab toggle** — One keystroke (`Cmd+Shift+V`) switches between rendered and raw mode.
- **Complete rendering** — GFM, syntax highlighting, math, diagrams, frontmatter cards, tables.
- **Theming** — Light, Dark, and GitHub themes. Custom themes via JSON or Tailwind config.
- **Stable** — Strict CSP, error boundaries, no crashes.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) 9+
- [VSCode](https://code.visualstudio.com/) 1.85+

### Install

```bash
pnpm install
```

### Development

```bash
pnpm dev        # Watch mode
# Press F5 in VSCode to launch Extension Development Host
```

### Build & Test

```bash
pnpm build      # Build extension
pnpm test       # Run tests
pnpm lint       # Lint + format check
pnpm typecheck  # Type checking
pnpm package    # Package as .vsix
```

## Project Structure

```
src/                    # Extension host (Node.js)
├── providers/          # CustomTextEditorProvider
├── rendering/          # Shared markdown-it pipeline
├── themes/             # Built-in theme JSON files
└── utils/              # Scroll sync, state management
webview/                # Webview (browser)
├── editor/             # Milkdown WYSIWYG editor
├── preview/            # Read-only preview
└── shared/             # Shared styles, components
docs/                   # Planning docs and specs
test/fixtures/          # Test markdown files
```

## License

MIT
