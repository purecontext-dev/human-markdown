# ADR-008: CSS Custom Properties Theme Engine

## Status

Accepted

## Context

The original spec and tech manifest called for `@tailwindcss/typography` as the theming foundation. The editor needed to look like a reading experience (finished document), not like code, while respecting the user's light/dark VSCode theme.

## Decision

All styling uses hand-written CSS custom properties (`--hm-*` tokens) defined in TypeScript and injected into the webview. No `@tailwindcss/typography`. The default theme is `"auto"`, which detects VSCode's active color kind (light/dark/high-contrast) and applies the matching built-in theme. Users can explicitly override with `"light"`, `"dark"`, or `"github"`.

## Why Not Tailwind Typography

Tailwind Typography is designed for static sites, not VSCode webviews:

- Requires a PostCSS/Tailwind build pipeline — adds build complexity for a single concern
- Opinions about spacing, sizing, and colors would need constant overriding to match VSCode's look
- Bundle weight for a package whose design values we'd fight against

Tailwind Typography's design values (spacing ratios, line-heights, font stacks) were used as **inspiration** for the `--hm-*` token definitions, but the package was never installed.

## Theme Architecture

- **Three built-in themes:** Light (warm neutrals inspired by Tailwind Typography), Dark (GitHub-dark colors), GitHub (exact GitHub.com markdown rendering)
- **Auto-detection:** reads VSCode's `ColorThemeKind` on ready and on theme change
- **Token injection:** theme tokens sent to webview via `postMessage` on `ready` and broadcast on setting/color-theme changes
- **All styles use `--hm-*` properties** — migrated from `--vscode-*` to custom namespace for independence from VSCode's internal token naming
- **Typography optimized for reading:** system font stack at prose sizing, not the coding font. This is what makes it feel "human."

## Alternatives Considered

1. **`@tailwindcss/typography`** — rejected for the reasons above
2. **Inherit everything from VSCode theme** — rejected. Looks like code rather than a document, which defeats the product purpose.
3. **Fixed theme with no auto-detection** — rejected. Light theme forced on dark-mode users (or vice versa) is hostile.
4. **Custom CSS file injection** — discussed as a future feature for power users, not for initial implementation

## Consequences

### Positive

- Zero external dependencies for theming
- Full control over every design token
- Dark-mode users get dark prose out of the box, light-mode users get light — no mismatch
- Custom property namespace (`--hm-*`) is stable regardless of VSCode internal changes

### Negative

- Hand-maintained token set — no design system automation
- Three themes to keep visually consistent
- Users with high-contrast themes may not get perfect results (auto maps to light or dark)

## Related Decisions

- [ADR-007](007-codemirror-for-raw-mode.md): CodeMirror theme tokens are separate — VSCode doesn't expose syntax colors as CSS variables
