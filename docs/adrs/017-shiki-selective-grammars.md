# ADR-017: Shiki Core with Selective Grammars and JS Regex Engine

## Status

Accepted

## Context

Shiki provides syntax highlighting for code blocks and frontmatter. The full Shiki bundle includes 200+ language grammars and the WASM-based Oniguruma regex engine. Importing the default bundle ballooned the webview from 212KB to 10MB (1.8MB gzipped).

## Decision

Use `shiki/core` with the JavaScript regex engine and 12 explicitly imported language grammars: bash, css, html, javascript, json, markdown, python, rust, sql, typescript, yaml, and go. Two themes (light and dark).

## Alternatives Considered

1. **Full Shiki bundle** — rejected. 10x bundle size increase (212KB → 10MB raw, 393KB → 1.8MB gzipped). Most grammars would never be used.
2. **Dynamic grammar loading via `import()`** — broken in `vscode-webview://` (see [ADR-005](005-heavy-libraries-iife-bundles.md))
3. **WASM Oniguruma engine** — avoided. The WASM binary adds CSP complexity (`wasm-eval` or `wasm-unsafe-eval`) and loading overhead. The JS regex engine handles the selected grammars correctly.
4. **`@codemirror/language-data` for raw mode highlighting** — initially included, bundled parsers for dozens of languages. Removed — only markdown syntax highlighting is needed in raw mode. Bundle dropped from 895KB to 469KB gzipped.

## Consequences

### Positive

- Webview bundle: 2.1MB raw / 393KB gzipped (down from 10MB / 1.8MB)
- JS regex engine avoids WASM CSP requirements
- 12 grammars cover the most common languages in markdown documentation

### Negative

- Languages outside the 12 render as plain text without highlighting
- Adding new grammars requires a code change and rebuild (no runtime loading)
- JS regex engine has minor differences from Oniguruma for edge-case grammar patterns (not observed in practice with the selected grammars)

## Related Decisions

- [ADR-005](005-heavy-libraries-iife-bundles.md): Shiki is loaded as a separate IIFE bundle
- [ADR-004](004-code-blocks-read-only-in-wysiwyg.md): Shiki renders read-only code blocks in WYSIWYG mode
