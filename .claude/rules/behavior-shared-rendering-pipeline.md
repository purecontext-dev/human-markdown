# Rendering Architecture (ADR-003 Retired)

There is no shared markdown-it rendering pipeline. Milkdown handles all WYSIWYG rendering via its own Remark-based pipeline. Code blocks, frontmatter, and mermaid are rendered through Milkdown nodeViews.

Define theme tokens once using CSS custom properties. Do not use inline styles in the webview.

Heavy rendering libraries (Shiki, Mermaid) are loaded as separate IIFE bundles via static `<script>` tags, not inlined into the main webview bundle.
