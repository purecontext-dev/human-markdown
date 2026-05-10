export function injectEditorStyles() {
  const style = document.createElement('style')
  style.textContent = editorCSS
  document.head.appendChild(style)
}

const editorCSS = `
  .milkdown {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    line-height: 1.6;
    color: var(--vscode-editor-foreground);
    max-width: 800px;
    margin: 0 auto;
  }

  .milkdown .editor {
    outline: none;
  }

  .milkdown h1, .milkdown h2, .milkdown h3,
  .milkdown h4, .milkdown h5, .milkdown h6 {
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    font-weight: 600;
    line-height: 1.25;
    color: var(--vscode-editor-foreground);
  }

  .milkdown h1 { font-size: 2em; border-bottom: 1px solid var(--vscode-editorGroup-border, #444); padding-bottom: 0.3em; }
  .milkdown h2 { font-size: 1.5em; border-bottom: 1px solid var(--vscode-editorGroup-border, #444); padding-bottom: 0.3em; }
  .milkdown h3 { font-size: 1.25em; }
  .milkdown h4 { font-size: 1em; }

  .milkdown p {
    margin: 0 0 1em;
  }

  .milkdown a {
    color: var(--vscode-textLink-foreground, #3794ff);
    text-decoration: none;
  }
  .milkdown a:hover {
    text-decoration: underline;
  }

  .milkdown blockquote {
    margin: 0 0 1em;
    padding: 0 1em;
    border-left: 3px solid var(--vscode-textBlockQuote-border, #555);
    color: var(--vscode-descriptionForeground, #999);
  }

  .milkdown code {
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 0.875em;
    background: var(--vscode-textCodeBlock-background, rgba(128,128,128,0.15));
    color: var(--vscode-editor-foreground);
    padding: 0.2em 0.4em;
    border-radius: 3px;
  }

  .milkdown pre {
    margin: 0 0 1em;
    padding: 1em;
    background: var(--vscode-textCodeBlock-background, rgba(128,128,128,0.15));
    border-radius: 6px;
    overflow-x: auto;
  }
  .milkdown pre code {
    background: none;
    padding: 0;
    font-size: 0.875em;
    line-height: 1.45;
  }

  .milkdown ul, .milkdown ol {
    margin: 0 0 1em;
    padding-left: 2em;
  }
  .milkdown li {
    margin: 0.25em 0;
  }

  .milkdown img {
    max-width: 100%;
    height: auto;
  }

  .milkdown hr {
    border: none;
    border-top: 1px solid var(--vscode-editorGroup-border, #444);
    margin: 1.5em 0;
  }

  .milkdown table {
    border-collapse: collapse;
    width: 100%;
    margin: 0 0 1em;
  }
  .milkdown th, .milkdown td {
    border: 1px solid var(--vscode-editorGroup-border, #444);
    padding: 0.5em 1em;
    text-align: left;
  }
  .milkdown th {
    background: var(--vscode-editorWidget-background, rgba(128,128,128,0.1));
    font-weight: 600;
  }

  .milkdown .code-block-view {
    position: relative;
    margin: 0 0 1em;
  }

  .milkdown .code-block-view .code-rendered {
    position: absolute;
    inset: 0;
    padding: 1em;
    background: var(--vscode-textCodeBlock-background, rgba(128,128,128,0.15));
    border-radius: 6px;
    overflow: hidden;
    pointer-events: none;
    z-index: 1;
    color: var(--vscode-editor-foreground);
  }

  .milkdown .code-block-view .code-rendered pre {
    margin: 0;
    padding: 0;
    background: none;
  }

  .milkdown .code-block-view.editing .code-rendered {
    display: none;
  }

  .milkdown .code-block-view .code-lang {
    position: absolute;
    top: 0.5em;
    right: 0.5em;
    font-size: 0.75em;
    color: var(--vscode-descriptionForeground, #999);
    z-index: 2;
    pointer-events: none;
  }

  .milkdown .code-block-view pre {
    margin: 0;
  }

  .milkdown .code-block-view.is-mermaid:not(.editing) pre {
    display: none;
  }

  .milkdown .code-block-view .mermaid-rendered {
    padding: 1em;
    background: var(--vscode-textCodeBlock-background, rgba(128,128,128,0.15));
    border-radius: 6px;
    display: flex;
    justify-content: center;
  }

  .milkdown .code-block-view .mermaid-rendered svg {
    max-width: 100%;
    height: auto;
  }

  .milkdown .code-block-view.editing .mermaid-rendered {
    display: none;
  }

  .milkdown .code-block-view .mermaid-error {
    color: var(--vscode-errorForeground, #f48771);
    font-size: 0.875em;
    font-family: var(--vscode-editor-font-family, monospace);
    padding: 1em;
    white-space: pre-wrap;
  }
`
