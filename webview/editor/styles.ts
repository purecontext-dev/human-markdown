export function injectEditorStyles() {
  const style = document.createElement('style')
  style.textContent = editorCSS
  document.head.appendChild(style)
}

const editorCSS = `
  .milkdown {
    font-family: var(--hm-font-body);
    font-size: var(--hm-font-size);
    line-height: var(--hm-line-height);
    color: var(--hm-color-text);
    max-width: var(--hm-max-width);
    margin: 0 auto;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-wrap: break-word;
  }

  .milkdown .editor {
    outline: none;
  }

  .milkdown h1, .milkdown h2 {
    margin-top: 1em;
    margin-bottom: 0.5em;
    font-weight: 600;
    line-height: 1.2;
    color: var(--hm-color-heading);
    border-bottom: 1px solid var(--hm-color-border);
    padding-bottom: 0.2em;
  }

  .milkdown h3, .milkdown h4, .milkdown h5, .milkdown h6 {
    margin-top: 0.75em;
    margin-bottom: 0.25em;
    font-weight: 600;
    line-height: 1.2;
    color: var(--hm-color-heading);
  }

  .milkdown h1 { font-size: 2em; }
  .milkdown h2 { font-size: 1.5em; }
  .milkdown h3 { font-size: 1.25em; }
  .milkdown h4 { font-size: 1em; }

  .milkdown p {
    margin: 0 0 1em;
  }

  .milkdown strong {
    color: var(--hm-color-heading);
  }

  .milkdown a {
    color: var(--hm-color-link);
    text-decoration: none;
  }
  .milkdown a:hover {
    text-decoration: underline;
  }

  .milkdown blockquote {
    margin: 0 0 0.35em;
    padding: 0 1em;
    border-left: 4px solid var(--hm-color-blockquote-border);
    color: var(--hm-color-blockquote-text);
  }

  .milkdown code {
    font-family: var(--hm-font-code);
    font-size: 0.875em;
    background: var(--hm-color-code-bg);
    color: var(--hm-color-code-text);
    padding: 0.1em 0.4em;
    border-radius: 3px;
    border: 1px solid var(--hm-color-border);
  }

  .milkdown pre {
    margin: 0 0 0.35em;
    padding: 0.75em;
    background: var(--hm-color-code-bg);
    border: 1px solid var(--hm-color-border);
    border-radius: 6px;
    overflow-x: auto;
  }
  .milkdown pre code {
    background: none;
    padding: 0;
    border: none;
    font-size: 0.875em;
    line-height: 1.3;
  }

  .milkdown ul, .milkdown ol {
    margin: 0 0 0.35em;
    padding-left: 2em;
  }
  .milkdown li {
    margin: 0;
  }

  .milkdown img {
    max-width: 100%;
    height: auto;
    margin: 0.35em 0;
  }

  .milkdown hr {
    border: none;
    height: 2px;
    background: var(--hm-color-border);
    margin: 1em 0;
  }

  .milkdown table {
    border-collapse: collapse;
    width: 100%;
    margin: 0 0 0.35em;
  }
  .milkdown th, .milkdown td {
    border: 1px solid var(--hm-color-table-border);
    padding: 0.25em 0.6em;
    text-align: left;
  }
  .milkdown th {
    background: var(--hm-color-table-header-bg);
    font-weight: 600;
  }
  .milkdown tr:nth-child(2n) {
    background: var(--hm-color-bg-secondary);
  }

  .milkdown .code-block-view {
    position: relative;
    margin: 0 0 0.35em;
  }

  .milkdown .code-block-view .code-rendered {
    position: absolute;
    inset: 0;
    padding: 0.75em;
    background: var(--hm-color-code-bg);
    border: 1px solid var(--hm-color-border);
    border-radius: 6px;
    overflow: hidden;
    user-select: text;
    cursor: text;
    z-index: 1;
    color: var(--hm-color-code-text);
  }

  .milkdown .code-block-view .code-rendered pre {
    margin: 0;
    padding: 0;
    background: none;
    border: none;
    border-radius: 0;
    overflow-x: auto;
    white-space: pre;
  }

  .milkdown .code-block-view.word-wrap .code-rendered pre {
    overflow-x: hidden;
    white-space: pre-wrap;
    overflow-wrap: break-word;
  }

  .milkdown .code-block-view .code-rendered code {
    background: none;
    padding: 0;
    border: none;
  }

  .milkdown .code-block-view .code-lang {
    position: absolute;
    top: 0.5em;
    right: 0.5em;
    font-family: var(--hm-font-code);
    font-size: 0.7em;
    color: var(--hm-color-text-muted);
    background: var(--hm-color-bg-secondary);
    border: 1px solid var(--hm-color-border);
    border-radius: 4px;
    padding: 0.15em 0.5em;
    z-index: 2;
    pointer-events: none;
  }

  .milkdown .code-block-view .code-wrap-toggle {
    position: absolute;
    bottom: 0.5em;
    right: 0.5em;
    font-size: 0.8em;
    color: var(--hm-color-text-muted);
    background: var(--hm-color-bg-secondary);
    border: 1px solid var(--hm-color-border);
    border-radius: 4px;
    padding: 0.1em 0.4em;
    z-index: 3;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s;
    line-height: 1;
  }

  .milkdown .code-block-view:hover .code-wrap-toggle {
    opacity: 1;
  }

  .milkdown .code-block-view.word-wrap .code-wrap-toggle {
    opacity: 1;
    color: var(--hm-color-accent);
    border-color: var(--hm-color-accent);
  }

  .milkdown .code-block-view pre {
    margin: 0;
  }

  .milkdown .code-block-view.word-wrap > pre {
    white-space: pre-wrap;
    overflow-wrap: break-word;
  }

  .milkdown .code-block-view.is-mermaid pre {
    display: none;
  }

  .milkdown .code-block-view.is-mermaid .code-wrap-toggle {
    display: none;
  }

  .milkdown .code-block-view .mermaid-rendered {
    padding: 0.75em;
    background: var(--hm-color-code-bg);
    border: 1px solid var(--hm-color-border);
    border-radius: 6px;
    display: flex;
    justify-content: center;
  }

  .milkdown .code-block-view .mermaid-rendered svg {
    max-width: 100%;
    height: auto;
  }

  .milkdown .code-block-view .mermaid-error {
    color: #f48771;
    font-size: 0.875em;
    font-family: var(--hm-font-code);
    padding: 1em;
    white-space: pre-wrap;
  }

  .milkdown .frontmatter-block {
    position: relative;
    margin: 0 0 0.35em;
    border: 1px solid var(--hm-color-border);
    border-radius: 6px;
    background: var(--hm-color-code-bg);
    overflow: hidden;
  }

  .milkdown .frontmatter-header {
    display: flex;
    align-items: center;
    gap: 0.5em;
    padding: 0.5em 1em;
    cursor: pointer;
    user-select: none;
    font-size: 0.75em;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--hm-color-text-muted);
    border-bottom: 1px solid var(--hm-color-border);
  }

  .milkdown .frontmatter-block.collapsed .frontmatter-header {
    border-bottom: none;
  }

  .milkdown .frontmatter-toggle {
    font-size: 0.75em;
    line-height: 1;
  }

  .milkdown .frontmatter-body {
    position: relative;
  }

  .milkdown .frontmatter-rendered {
    position: absolute;
    inset: 0;
    padding: 1em;
    overflow: hidden;
    z-index: 1;
    color: var(--hm-color-code-text);
    background: var(--hm-color-code-bg);
    user-select: text;
    cursor: text;
  }

  .milkdown .frontmatter-rendered pre {
    margin: 0;
    padding: 0;
    background: none;
    border: none;
    border-radius: 0;
    overflow: visible;
  }

  .milkdown .frontmatter-block.editing .frontmatter-rendered {
    display: none;
  }

  .milkdown .frontmatter-body > pre {
    margin: 0;
    padding: 1em;
    border: none;
    background: none;
  }

  .milkdown .frontmatter-body > pre code,
  .milkdown .frontmatter-rendered code {
    background: none;
    padding: 0;
    border: none;
    font-size: 0.875em;
    line-height: 1.3;
  }

  .milkdown li[data-item-type="task"] {
    list-style: none;
    position: relative;
    margin-left: -1.5em;
    padding-left: 1.5em;
  }

  .milkdown li[data-item-type="task"]::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0.2em;
    width: 16px;
    height: 16px;
    border: 1.5px solid var(--hm-color-border);
    border-radius: 4px;
    cursor: pointer;
    box-sizing: border-box;
  }

  .milkdown li[data-item-type="task"][data-checked="true"]::before {
    background: var(--hm-color-link);
    border-color: var(--hm-color-link);
  }

  .milkdown li[data-item-type="task"][data-checked="true"]::after {
    content: '';
    position: absolute;
    left: 6px;
    top: calc(0.2em + 4px);
    width: 3px;
    height: 6px;
    border: solid white;
    border-width: 0 1.5px 1.5px 0;
    transform: rotate(45deg);
    pointer-events: none;
  }

  .error-banner {
    background: rgba(244, 135, 113, 0.1);
    border: 1px solid #f48771;
    border-radius: 6px;
    padding: 0.75em 1em;
    margin-bottom: 1em;
    font-size: 0.875em;
    color: #f48771;
  }

  .fallback-raw {
    font-family: var(--hm-font-code);
    font-size: 0.875em;
    line-height: 1.3;
    white-space: pre-wrap;
    word-wrap: break-word;
    color: var(--hm-color-text);
  }

  .milkdown .math-display-view {
    position: relative;
    margin: 0 0 0.35em;
  }

  .milkdown .math-display-view .math-rendered {
    position: absolute;
    inset: 0;
    padding: 1em;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1;
    cursor: text;
    user-select: text;
    color: var(--hm-color-text);
    font-size: 1.2em;
    background: var(--hm-color-bg);
    border: 1px solid var(--hm-color-border);
    border-radius: 6px;
    overflow: hidden;
  }

  .milkdown .math-display-view.editing .math-rendered {
    display: none;
  }

  .milkdown .math-display-view pre {
    margin: 0;
    padding: 1em;
    background: var(--hm-color-code-bg);
    border: 1px solid var(--hm-color-border);
    border-radius: 6px;
  }

  .milkdown .math-display-view pre code {
    background: none;
    padding: 0;
    border: none;
    font-size: 0.875em;
    line-height: 1.3;
  }

  .milkdown .math-inline-view {
    cursor: default;
  }

  .milkdown .github-alert {
    margin: 0 0 0.35em;
    padding: 0.75em 1em;
    border-left: 4px solid var(--hm-color-alert-note-border);
    border-radius: 6px;
    background: var(--hm-color-alert-note-bg);
  }

  .milkdown .github-alert[data-alert-type="tip"] {
    border-left-color: var(--hm-color-alert-tip-border);
    background: var(--hm-color-alert-tip-bg);
  }
  .milkdown .github-alert[data-alert-type="important"] {
    border-left-color: var(--hm-color-alert-important-border);
    background: var(--hm-color-alert-important-bg);
  }
  .milkdown .github-alert[data-alert-type="warning"] {
    border-left-color: var(--hm-color-alert-warning-border);
    background: var(--hm-color-alert-warning-bg);
  }
  .milkdown .github-alert[data-alert-type="caution"] {
    border-left-color: var(--hm-color-alert-caution-border);
    background: var(--hm-color-alert-caution-bg);
  }

  .milkdown .github-alert-header {
    display: flex;
    align-items: center;
    gap: 0.4em;
    margin-bottom: 0.35em;
    font-weight: 600;
    font-size: 0.875em;
    color: var(--hm-color-alert-note-icon);
    user-select: none;
  }

  .milkdown .github-alert[data-alert-type="tip"] .github-alert-header {
    color: var(--hm-color-alert-tip-icon);
  }
  .milkdown .github-alert[data-alert-type="important"] .github-alert-header {
    color: var(--hm-color-alert-important-icon);
  }
  .milkdown .github-alert[data-alert-type="warning"] .github-alert-header {
    color: var(--hm-color-alert-warning-icon);
  }
  .milkdown .github-alert[data-alert-type="caution"] .github-alert-header {
    color: var(--hm-color-alert-caution-icon);
  }

  .milkdown .github-alert-icon {
    flex-shrink: 0;
  }

  .milkdown .github-alert-body {
    color: var(--hm-color-text);
  }

  .milkdown .github-alert-body > :last-child {
    margin-bottom: 0;
  }
`
