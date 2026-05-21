# ADR-011: CSP unsafe-eval Required for Mermaid

## Status

Accepted

## Context

The original CSP policy had no `unsafe-eval`. Mermaid's dependency tree (lodash and/or d3) contains `Function("return this")` — an indirect eval to resolve the global object. This pattern was initially missed by `grep "new Function"` because it uses `Function(...)` without `new`.

Without `unsafe-eval`, even `mermaid.parse()` (not just render) crashes the entire webview. The CSP violation is uncatchable and kills the process.

## Decision

Add `unsafe-eval` to CSP `script-src`. Accept the theoretical risk, mitigated by the webview sandbox.

## Threat Model

The webview sandbox is the real security boundary:

- **No filesystem access** — can't read or write files
- **No Node.js** — can't spawn processes or require modules
- **No network** — `connect-src` is not set, so no outbound requests
- **Isolated origin** — the `vscode-webview://` scheme is unique per webview instance

For an attacker to exploit `unsafe-eval`, they would need a crafted markdown file that triggers eval through Mermaid/d3's code path, and the worst outcome is DOM manipulation within the already-sandboxed iframe. CSP is defense-in-depth here, not the primary boundary.

Additional mitigations:
- Mermaid runs with `securityLevel: 'strict'` for input sanitization
- KaTeX runs in strict mode
- All frontmatter values are escaped before rendering

## Alternatives Considered

1. **Drop mermaid entirely** — initially recommended, but mermaid diagram rendering is a valuable feature for technical documentation
2. **Render mermaid in a nested sandboxed iframe with permissive CSP** — isolates the eval to a sub-frame, but adds significant complexity for marginal security gain given the existing sandbox
3. **Dynamic `import('mermaid')` instead of IIFE** — tried, but `import()` hangs in `vscode-webview://` (see [ADR-005](005-heavy-libraries-iife-bundles.md))
4. **No `unsafe-eval`** — tried extensively. Mermaid crashes the webview process. Not viable.

## Research

Microsoft's own `vscode-markdown-mermaid` extension was investigated. It doesn't set its own CSP (uses VSCode's built-in preview CSP, which is more permissive than what `CustomTextEditorProvider` gets). This confirmed that Mermaid fundamentally requires eval in some form.

## Consequences

### Positive

- Mermaid diagrams render in WYSIWYG mode
- Single, clear CSP policy rather than complex iframe nesting

### Negative

- `unsafe-eval` in the CSP is a concession — documented here so the reasoning is preserved
- Future library additions must be evaluated against this threat model

## Related Decisions

- [ADR-005](005-heavy-libraries-iife-bundles.md): Mermaid loaded as IIFE bundle
- [ADR-003](003-shared-rendering-pipeline.md): XSS test suite was for the dead markdown-it pipeline, not this threat model
