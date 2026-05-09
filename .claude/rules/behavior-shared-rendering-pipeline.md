# Shared Rendering Pipeline (ADR-003)

Register all rendering plugins in the shared pipeline — do not create mode-specific plugins. Both read-only preview and WYSIWYG edit modes consume the same markdown-it plugins and theme configuration.

Define theme tokens once and consume them in both modes. Use CSS custom properties for all styling — do not use inline styles in the webview.

When adding or modifying a rendering plugin, test the change in both preview and edit modes.
