# Extension Architecture Convention

The extension has two runtime contexts with strict boundaries:

- **Extension host (`src/`)**: Node.js. Filesystem access, VSCode APIs, no DOM. Owns `CustomTextEditorProvider`, configuration, `TextDocument` lifecycle.
- **Webview (`webview/`)**: Browser sandbox. DOM access, no Node.js, no filesystem. Owns Milkdown editor, rendering pipeline, theme engine.

All communication between them goes through `postMessage`. Do not share state, import across boundaries, or assume access to APIs from the wrong context.

esbuild produces separate bundles: CJS for extension host, ESM for webview. Do not mix module formats within a bundle target.
