# Human Markdown

A WYSIWYG markdown editor for VSCode. Open a markdown file, read it rendered, edit it inline. Toggle to raw with one keystroke. Theme it to match your blog or GitHub.

**Repo:** github.com/purecontext-dev/human-markdown
**License:** MIT

## Git Workflow

Feature branches → PR → merge to main. Branch prefixes: `feat/`, `fix/`, `chore/`, `refactor/`, `docs/`. Never commit directly to main.

## Tech Stack

TypeScript (strict), pnpm, esbuild (dual CJS/ESM), Vitest, Biome, husky + lint-staged. Milkdown (ProseMirror + Remark) for WYSIWYG editing. Shiki for syntax highlighting. GitHub Actions for CI/CD.

## Key Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install dependencies |
| `pnpm build` | Build extension (extension host + webview) |
| `pnpm dev` | Watch mode |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm lint` | Lint + format check (Biome) |
| `pnpm lint:fix` | Auto-fix |
| `pnpm package` | Package as .vsix |
| `pnpm typecheck` | Type checking |

F5 in VSCode launches the Extension Development Host for testing.

## Architecture

Two runtime contexts connected by `postMessage`:

- **Extension Host (Node.js):** `CustomTextEditorProvider` manages webview lifecycle and `TextDocument` sync. Configuration manager handles themes and settings.
- **Webview (Browser):** Milkdown editor for WYSIWYG editing. Shiki and Mermaid as separate IIFE bundles for code/diagram rendering. Theme engine applies CSS custom properties.

See `docs/spec/` for full planning documents and `docs/adrs/` for architectural decisions.

## Conventions

- Extension host source: `src/`, webview source: `webview/`
- Files: kebab-case. Classes: PascalCase. Functions/variables: camelCase.
- Tests co-located (`*.test.ts` next to source)
- Biome: single quotes, 2-space indent, 100 line width, semicolons as needed

## Testing

Unit tests with Vitest. Focus on round-trip fidelity (markdown → edit → markdown), theme token injection, bundle size budgets. No webview integration tests.

## Development Roadmap

See `docs/plans/backlog.md` for the plan queue. The forge plugin provides development workflow skills (`/forge:next`, `/forge:ship`, `/forge:retro`, etc.) — see `plugins/forge/README.md` for the full list.
