# Session Resume Context

## Status
MVP shipped. All 7 epics complete and merged. Next work is from the Future Plans backlog (custom-theming, spell-checking, export, search) or Shiki re-integration.

## Key decisions
- **XSS test assertions must be DOM-based** — regex matching on rendered HTML gives false positives (escaped content like `&lt;script` contains the keyword but is safe). Parse with DOMParser, check actual elements/attributes.
- **Viewport-based lazy rendering for mermaid** — IntersectionObserver with 100% rootMargin for render, 200% for dispose. Prevents N mermaid diagrams from all rendering on large doc open.
- **Frontmatter handles malformed YAML** — try/catch in parseFrontmatter, returns raw content on failure.

## Key context
- 78 tests pass (19 rendering, 6 theme, 36 XSS, 15 round-trip, 2 bundle)
- Webview bundle 212KB gzipped
- `pnpm audit --audit-level=high` in CI
