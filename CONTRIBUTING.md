# Contributing to Human Markdown

Thanks for your interest in contributing. This guide covers the development setup, conventions, and PR process.

## Getting Started

```bash
git clone https://github.com/purecontext/human-markdown.git
cd human-markdown
pnpm install
pnpm build
```

Press **F5** in VSCode to launch the Extension Development Host for testing.

### Key Commands

| Command | Description |
|---------|-------------|
| `pnpm build` | Build all bundles (extension + webview + IIFE loaders) |
| `pnpm dev` | Watch mode |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm lint` | Lint and format check (Biome) |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm typecheck` | TypeScript strict mode check |
| `pnpm package` | Build and package as .vsix |

## Architecture

The extension has two runtime contexts with strict boundaries:

- **Extension host** (`src/`): Node.js. Manages the `CustomTextEditorProvider`, configuration, and `TextDocument` lifecycle. No DOM access.
- **Webview** (`webview/`): Browser sandbox. Runs the Milkdown WYSIWYG editor, rendering pipeline, and theme engine. No Node.js or filesystem access.

Communication between them is exclusively through `postMessage`. Do not share state or import across boundaries.

Heavy libraries (Shiki, Mermaid, KaTeX) are built as separate IIFE bundles loaded async via `<script>` tags — not inlined into the main webview bundle.

## Code Conventions

- **TypeScript strict mode** — no `any` unless absolutely necessary
- **Biome** for linting and formatting: single quotes, 2-space indent, 100 char line width, semicolons as needed
- **Files**: kebab-case. **Classes**: PascalCase. **Functions/variables**: camelCase.
- **Tests**: co-located (`*.test.ts` next to source)
- **No comments** unless the "why" is non-obvious
- **No unnecessary abstractions** — three similar lines is better than a premature helper

## Making Changes

1. Fork the repo and create a feature branch from `main`:
   ```
   git checkout -b feat/your-feature
   ```
   Use conventional prefixes: `feat/`, `fix/`, `chore/`, `refactor/`, `docs/`.

2. Make your changes. Ensure all checks pass:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm build
   pnpm test
   ```

3. Push and open a PR against `main`. Include:
   - A clear description of what changed and why
   - How to test the change (steps to reproduce in the Extension Development Host)

## What We're Looking For

Good first contributions:

- Bug fixes with a clear reproduction path
- New test fixtures for round-trip fidelity edge cases
- Documentation improvements
- Performance improvements with benchmark evidence

Before starting a large feature, open an issue to discuss the approach. This avoids wasted effort on changes that don't align with the project direction.

## Testing

Unit tests run with Vitest. The test suite covers:

- **Round-trip fidelity** — markdown loaded, parsed by Milkdown, serialized back must match the original
- **Bundle size budgets** — webview <500KB, extension <50KB, KaTeX <150KB (all gzipped)
- **Theme tokens** — all required CSS custom properties present for each theme

Manual testing in the Extension Development Host is expected for UI changes. The test suite verifies code correctness, not feature correctness.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
