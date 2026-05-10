# Webview Security

Every webview must set a strict Content Security Policy:
- `script-src` uses nonces, `webview.cspSource`, and `unsafe-eval` — no inline scripts, no `javascript:` URIs. `unsafe-eval` is required because mermaid's dependency tree uses `Function("return this")` to resolve the global object. The webview sandbox (no filesystem, no Node.js, no network) is the primary security boundary. Heavy libraries (mermaid) are loaded as separate IIFE bundles via static `<script>` tags, not dynamic `import()` (which doesn't work in `vscode-webview://`).
- `style-src` allows inline styles (needed for theme CSS custom properties)
- No `connect-src` — no network requests from the webview

Escape all frontmatter values before rendering. Never use `innerHTML` with user-provided data — use DOM APIs or a sanitization library.

Run Mermaid with `securityLevel: 'strict'`. Run KaTeX in strict mode. Both parse untrusted user input.

The adversarial XSS test suite must pass before every release. Any rendering output containing `<script`, `onerror`, `javascript:`, or unescaped HTML event handler attributes is a test failure.
