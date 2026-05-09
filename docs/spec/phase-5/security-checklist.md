---
title: "Security Checklist"
phase: 5
project: "markdown-preview"
date: 2026-05-09
status: draft
---

# Security Checklist

Human Markdown is a local-only VSCode extension. No network requests, no telemetry, no user accounts, no server-side anything. The security surface is narrow but meaningful — the whole product narrative starts with MPE's unpatched XSS, so Human Markdown must be demonstrably secure.

## Threat Model

The extension processes untrusted input (user-authored and AI-generated markdown files) and renders it in a VSCode webview. The primary threat is malicious content in a markdown file executing code in the webview context.

| Threat | Risk | Mitigation |
|--------|------|------------|
| **XSS via rendered markdown** | High — this is exactly how CVE-2025-65716 works in MPE | Sanitize all rendered HTML. markdown-it's default behavior escapes HTML, but plugins (containers, custom blocks) need auditing. Use VSCode's webview CSP to block inline scripts. |
| **XSS via frontmatter** | Medium — frontmatter values are rendered as HTML in the metadata card | Escape all frontmatter values before rendering. Never use `innerHTML` with user-provided frontmatter data. |
| **Malicious Mermaid/KaTeX input** | Medium — both libraries parse user input and render to DOM | Run Mermaid and KaTeX with sandboxed configurations. Mermaid's `securityLevel: 'strict'` disables click events and JavaScript in diagrams. KaTeX's `strict` mode prevents command injection. |
| **Path traversal via image/link paths** | Low — webview loads images from local paths | Use VSCode's `webview.asWebviewUri` for all local resource loading. Don't resolve arbitrary filesystem paths. |
| **Extension host compromise** | Very Low — the extension host runs with VSCode's permissions | Don't execute arbitrary code from file contents. Config file loading (Tailwind, theme JSON) should parse, not eval. |

## Webview Content Security Policy

Every webview must set a strict CSP via the `<meta>` tag:

```
default-src 'none';
style-src ${webview.cspSource} 'unsafe-inline';
script-src 'nonce-${nonce}';
img-src ${webview.cspSource} https: data:;
font-src ${webview.cspSource};
```

- `script-src` uses nonces — no inline scripts, no `eval`, no `javascript:` URIs
- `style-src` allows inline styles (needed for theme injection via CSS custom properties)
- `img-src` allows HTTPS and data URIs for embedded images
- No `connect-src` — no network requests from the webview

## Dependency Security

- **Automated scanning:** GitHub Dependabot enabled for the repository. Alerts on known vulnerabilities in dependencies.
- **Lock file:** `pnpm-lock.yaml` committed. CI builds use `pnpm install --frozen-lockfile`.
- **Minimal dependencies:** Every dependency must have a clear purpose. Audit the dependency tree before each release — flag transitive dependencies that seem unnecessary.
- **Plugin auditing:** Each markdown-it plugin and Milkdown plugin is a potential XSS vector. Audit rendering output for unescaped HTML, especially in container plugins and custom block types.

## OWASP Relevance

Most OWASP Top 10 categories don't apply (no server, no database, no authentication). The relevant ones:

| OWASP Risk | Applicable? | Notes |
|-----------|-------------|-------|
| A03: Injection (XSS) | **Yes** | Primary risk. Markdown → HTML rendering is the attack surface. Mitigated by CSP, HTML escaping, and plugin auditing. |
| A06: Vulnerable Components | **Yes** | Third-party plugins and rendering libraries. Mitigated by Dependabot, minimal dependencies, lock file. |
| A08: Software and Data Integrity | **Partial** | CI pipeline must not allow tampering. GitHub Actions with pinned action versions. |
| All others | No | No server, no auth, no database, no API. |

## Security Testing

- **Pre-release:** Run a corpus of adversarial markdown files through the renderer — files designed to trigger XSS (script tags, event handlers, javascript: URIs, SVG payloads, Mermaid injection attempts)
- **CI:** Include adversarial test fixtures in the unit test suite. Any rendering output containing `<script`, `onerror`, `javascript:`, or unescaped HTML attributes is a test failure.
- **Dependency audit:** `pnpm audit` in CI. Fail the build on high/critical vulnerabilities.

## Competitive Positioning

Human Markdown's security story is part of its market narrative. The README and marketplace listing should include:
- Strict CSP on all webviews
- No network requests, no telemetry
- Automated dependency scanning
- Adversarial test suite for XSS prevention
- Direct contrast with CVE-2025-65716 in MPE
