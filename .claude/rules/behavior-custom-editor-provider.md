# CustomTextEditorProvider Ownership (ADR-002)

All webview content goes through `CustomTextEditorProvider`. Do not create standalone `WebviewPanel` instances for preview or editing.

The raw mode toggle uses `vscode.openWith` to switch between the custom editor and VSCode's default text editor — do not create a separate editor instance.

Retain the webview when toggling to raw mode (do not destroy and recreate). Dispose the webview only when the editor tab closes.

Any test-only command surface for the custom editor must be gated in both places it can execute: extension-host command registration and webview message handling. Production webviews must ignore test-only messages.
