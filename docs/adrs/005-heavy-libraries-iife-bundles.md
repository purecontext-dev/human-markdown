# ADR-005: Heavy Libraries as Separate IIFE Bundles

## Status

Accepted

## Context

The webview needs Mermaid (diagram rendering), Shiki (syntax highlighting), and KaTeX (math rendering). These are large libraries that can't be loaded via ES module dynamic `import()` in the `vscode-webview://` scheme.

## Decision

Build Mermaid, Shiki, and KaTeX as separate IIFE bundles loaded via static `<script>` tags in the webview HTML template. Each IIFE sets a `window.__libraryName` global that the main bundle reads.

## The import() Problem

Dynamic `import()` is fundamentally broken in `vscode-webview://`. The promise hangs indefinitely without resolving or rejecting (`ERR_ACCESS_DENIED` in console). This is a known VSCode limitation — the custom URI scheme doesn't support ES module dynamic imports.

Before discovering this, esbuild was configured with `splitting: true` and `outdir`, which generated hundreds of chunk files (Shiki grammars, themes, Mermaid's internal chunks). Every one of them was dead code that could never load at runtime. The build was changed to `splitting: false` with `outfile` for the main bundle, plus separate IIFE build targets for each heavy library.

## Build Configuration

Each IIFE bundle requires specific esbuild settings:

- **Mermaid:** `external: ['fs']` (dependency tree contains `require('fs')` that crashes in the browser). Script tag must be `async` to prevent the 7MB unminified IIFE from blocking page load. `window.__mermaid` may not be set when code-block-view first tries to use it, so consumers poll with a timeout.
- **Shiki:** Uses `shiki/core` with selective grammars — see [ADR-017](017-shiki-selective-grammars.md).
- **KaTeX:** MathML output mode (no font/CSS dependencies needed). `strict: true` for security.

## Alternatives Considered

1. **Dynamic `import()`** — tried extensively, broken in `vscode-webview://`
2. **Inline into main bundle** — would blow past the 500KB gzipped budget
3. **Web Workers** — considered for Mermaid rendering isolation, but adds complexity and still needs the IIFE approach for loading

## Consequences

### Positive

- Each library loads independently — a Mermaid failure doesn't take down the editor
- Main bundle stays lean (~200KB), heavy libraries only loaded when needed
- Clear separation of concerns in the build

### Negative

- Globals (`window.__mermaid`, etc.) are less ergonomic than proper imports
- Async loading means consumers need null checks and polling
- Separate build targets add complexity to esbuild configuration

## Related Decisions

- [ADR-011](011-csp-unsafe-eval-mermaid.md): Mermaid requires `unsafe-eval` in CSP
- [ADR-017](017-shiki-selective-grammars.md): Shiki bundle size optimization
