# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Human Markdown, please report it privately via email:

**security@purecontext.dev**

Do not open a public GitHub issue for security vulnerabilities.

You should receive an acknowledgment within 48 hours. We aim to release a fix within 7 days for critical issues.

## Security Model

Human Markdown is a local-only VSCode extension. It processes untrusted input (user-authored markdown files) and renders it in a VSCode webview. There is no network communication, no telemetry, and no server-side component.

### Webview Sandbox

The VSCode webview is the primary security boundary. It runs in a sandboxed iframe with:

- No filesystem access
- No Node.js runtime
- No network access
- No access to other extensions

The webview communicates with the extension host exclusively through `postMessage`. The message protocol accepts only four message types: `edit`, `open-link`, `save-state`, and `ready`.

### Content Security Policy

Every webview sets a strict CSP:

- `default-src 'none'`
- `script-src` uses nonces — no inline scripts
- `style-src` allows inline styles for theme injection
- `img-src` allows HTTPS and data URIs
- No `connect-src` — no outbound network from the webview

### Third-Party Libraries

- **Mermaid** runs with `securityLevel: 'strict'`
- **KaTeX** runs with `strict: true`
- **Shiki** produces sanitized HTML from syntax highlighting
- All three are loaded as separate IIFE bundles with CSP nonces

### Dependency Management

- GitHub Dependabot monitors for known vulnerabilities
- `pnpm audit` runs in CI on every push
- Lock file (`pnpm-lock.yaml`) is committed for reproducible builds

## Scope

The following are in scope for security reports:

- XSS or code execution via crafted markdown files
- CSP bypasses in the webview
- Vulnerabilities in direct dependencies
- Path traversal via image or link handling
- Extension host compromise via message passing

The following are out of scope:

- Vulnerabilities in VSCode itself
- Issues requiring physical access to the machine
- Social engineering attacks
