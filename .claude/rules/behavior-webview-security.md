# Webview Security

Every webview must set a strict Content Security Policy:
- `script-src` uses nonces only — no `eval`, no inline scripts, no `javascript:` URIs
- `style-src` allows inline styles (needed for theme CSS custom properties)
- No `connect-src` — no network requests from the webview

Escape all frontmatter values before rendering. Never use `innerHTML` with user-provided data — use DOM APIs or a sanitization library.

Run Mermaid with `securityLevel: 'strict'`. Run KaTeX in strict mode. Both parse untrusted user input.

The adversarial XSS test suite must pass before every release. Any rendering output containing `<script`, `onerror`, `javascript:`, or unescaped HTML event handler attributes is a test failure.
