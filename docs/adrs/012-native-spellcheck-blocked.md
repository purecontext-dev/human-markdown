# ADR-012: Native Spellcheck Blocked in VSCode Webviews

## Status

Blocked

## Context

A WYSIWYG markdown editor should support spellchecking. The browser's native `spellcheck` attribute is the simplest approach — set `spellcheck="true"` on the contenteditable element, with `spellcheck="false"` on code and frontmatter blocks.

## Decision

Native spellcheck cannot be used. The feature was backed out after implementation. Library-based spellcheck (typo.js, nspell) is the future path if this feature is prioritized.

## What We Tried

Set `spellcheck="true"` on the Milkdown contenteditable element. VSCode explicitly sets `spellcheck: false` at the Electron `BrowserWindow` level in its source code. The spellchecker engine is completely disabled for the entire window, including all webviews. The attribute is silently ignored.

GitHub issue requesting this (vscode #214367) was closed in November 2024 for insufficient upvotes. There is no indication Microsoft plans to change this.

## Future Options

A library-based approach running entirely in the webview:
- **typo.js** or **nspell** — Hunspell-compatible spellcheck in JavaScript
- Would need dictionary files bundled or loaded as additional IIFE bundles
- Red underline rendering via ProseMirror decorations (Milkdown plugin)
- Performance impact of checking large documents needs evaluation

## Consequences

No spellchecking in the current release. Users who need spellcheck can use the Code Spell Checker extension, which works on the raw text but not in the WYSIWYG webview.

## Related Decisions

- [ADR-002](002-custom-text-editor-provider.md): The webview runs inside VSCode's Electron window, inheriting its BrowserWindow-level settings
