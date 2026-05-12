import { randomBytes } from 'node:crypto'
import * as vscode from 'vscode'
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from './messages'
import { getConfiguredThemeName, resolveThemeTokens } from './theme-resolver'

export class MarkdownEditorProvider implements vscode.CustomTextEditorProvider {
  static readonly viewType = 'humanMarkdown.preview'

  private readonly savedStates = new Map<string, { scrollTop: number; mode: 'preview' | 'raw' }>()
  private readonly webviews = new Set<vscode.Webview>()

  constructor(private readonly context: vscode.ExtensionContext) {}

  static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new MarkdownEditorProvider(context)

    const registration = vscode.window.registerCustomEditorProvider(
      MarkdownEditorProvider.viewType,
      provider,
      { webviewOptions: { retainContextWhenHidden: true } },
    )

    const toggleCommand = vscode.commands.registerCommand('humanMarkdown.toggle', () => {
      for (const webview of provider.webviews) {
        provider.postMessage(webview, { type: 'toggle-mode' })
      }
    })

    const selectThemeCommand = vscode.commands.registerCommand(
      'humanMarkdown.selectTheme',
      async () => {
        const items: vscode.QuickPickItem[] = [
          { label: 'Auto', description: 'Match VSCode color theme' },
          { label: 'Light', description: 'Light prose theme' },
          { label: 'Dark', description: 'Dark prose theme' },
          { label: 'GitHub', description: 'Match GitHub markdown rendering' },
        ]
        const picked = await vscode.window.showQuickPick(items, {
          placeHolder: 'Select a theme for Human Markdown',
        })
        if (!picked) return
        const themeName = picked.label.toLowerCase()
        await vscode.workspace
          .getConfiguration('humanMarkdown')
          .update('theme', themeName, vscode.ConfigurationTarget.Global)
      },
    )

    const onConfigChange = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('humanMarkdown.theme')) {
        provider.broadcastTheme()
      }
    })

    const onColorThemeChange = vscode.window.onDidChangeActiveColorTheme(() => {
      if (getConfiguredThemeName() === 'auto') {
        provider.broadcastTheme()
      }
    })

    return vscode.Disposable.from(
      registration,
      toggleCommand,
      selectThemeCommand,
      onConfigChange,
      onColorThemeChange,
    )
  }

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
  ): Promise<void> {
    const webview = webviewPanel.webview
    webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'dist')],
    }

    const defaultMode = vscode.workspace
      .getConfiguration('humanMarkdown')
      .get<string>('defaultMode', 'wysiwyg')

    webview.html = this.getHtmlForWebview(webview)
    this.webviews.add(webview)

    let suppressNextSync = false

    const onMessage = webview.onDidReceiveMessage((msg: WebviewToExtensionMessage) => {
      switch (msg.type) {
        case 'ready': {
          this.postMessage(webview, { type: 'update', content: document.getText() })
          this.postMessage(webview, {
            type: 'theme',
            tokens: resolveThemeTokens(getConfiguredThemeName()),
          })
          this.postMessage(webview, {
            type: 'set-mode',
            mode: defaultMode === 'raw' ? 'raw' : 'preview',
          })
          const saved = this.savedStates.get(document.uri.toString())
          if (saved) {
            this.postMessage(webview, { type: 'restore-state', state: saved })
          }
          break
        }
        case 'edit': {
          if (msg.content === document.getText()) return
          suppressNextSync = true
          const edit = new vscode.WorkspaceEdit()
          const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(document.getText().length),
          )
          edit.replace(document.uri, fullRange, msg.content)
          const reset = () => {
            suppressNextSync = false
          }
          vscode.workspace.applyEdit(edit).then(reset, reset)
          break
        }
        case 'save-state': {
          this.savedStates.set(document.uri.toString(), msg.state)
          break
        }
        case 'open-link': {
          vscode.env.openExternal(vscode.Uri.parse(msg.href))
          break
        }
      }
    })

    const onDocChange = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() !== document.uri.toString()) return
      if (suppressNextSync) return
      this.postMessage(webview, { type: 'update', content: document.getText() })
    })

    webviewPanel.onDidDispose(() => {
      this.webviews.delete(webview)
      onMessage.dispose()
      onDocChange.dispose()
    })
  }

  private broadcastTheme() {
    const tokens = resolveThemeTokens(getConfiguredThemeName())
    for (const webview of this.webviews) {
      this.postMessage(webview, { type: 'theme', tokens })
    }
  }

  private postMessage(webview: vscode.Webview, message: ExtensionToWebviewMessage) {
    webview.postMessage(message)
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'index.js'),
    )
    const mermaidUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'mermaid.js'),
    )
    const shikiUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'shiki.js'),
    )
    const nonce = getNonce()

    const editorConfig = vscode.workspace.getConfiguration('editor')
    const fontFamily = editorConfig.get<string>(
      'fontFamily',
      'Menlo, Monaco, Courier New, monospace',
    )
    const fontSize = editorConfig.get<number>('fontSize', 14)
    const lineHeightSetting = editorConfig.get<number>('lineHeight', 0)
    const lineHeight = lineHeightSetting === 0 ? Math.round(fontSize * 1.35) : lineHeightSetting

    const zoomLevel = vscode.workspace.getConfiguration('window').get<number>('zoomLevel', 0)
    const zoomCompensation = 1.1 ** -zoomLevel

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource} 'unsafe-eval'; font-src ${webview.cspSource};">
  <title>Human Markdown</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: var(--vscode-editor-background, var(--hm-color-bg));
      transition: background-color 0.15s ease;
    }
    #toolbar {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      padding: 4px 16px;
      border-bottom: 1px solid var(--vscode-editorWidget-border, rgba(128,128,128,0.2));
      background: var(--vscode-editor-background, var(--hm-color-bg));
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .mode-toggle {
      display: flex;
      border-radius: 4px;
      overflow: hidden;
      border: 1px solid var(--vscode-button-border, rgba(128,128,128,0.3));
    }
    .mode-btn {
      padding: 2px 10px;
      border: none;
      background: transparent;
      color: var(--vscode-foreground, #ccc);
      font-family: var(--vscode-font-family, sans-serif);
      font-size: 11px;
      cursor: pointer;
      transition: background 0.1s ease, color 0.1s ease;
    }
    .mode-btn:hover {
      background: var(--vscode-toolbar-hoverBackground, rgba(128,128,128,0.15));
    }
    .mode-btn.active {
      background: var(--vscode-button-background, #0078d4);
      color: var(--vscode-button-foreground, #fff);
    }
    #preview-container {
      padding: 16px 24px;
      zoom: ${zoomCompensation};
    }
    #editor {
      max-width: var(--hm-max-width, 800px);
      margin: 0 auto;
    }
    .milkdown .editor {
      outline: none;
    }
    #codemirror-container {
      display: none;
    }
    #codemirror-container.active {
      display: block;
    }
    #preview-container.hidden {
      display: none;
    }
    .cm-editor {
      height: calc(100vh - 33px);
    }
    .cm-editor .cm-scroller {
      font-family: ${escapeFontFamily(fontFamily)} !important;
      font-size: ${fontSize}px !important;
      line-height: ${lineHeight}px !important;
    }
  </style>
</head>
<body>
  <div id="toolbar">
    <div class="mode-toggle">
      <button class="mode-btn active" data-mode="preview">Preview</button>
      <button class="mode-btn" data-mode="raw">Markdown</button>
    </div>
  </div>
  <div id="preview-container">
    <div id="editor"></div>
  </div>
  <div id="codemirror-container"></div>
  <script nonce="${nonce}" async src="${mermaidUri}"></script>
  <script nonce="${nonce}" async src="${shikiUri}"></script>
  <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
</body>
</html>`
  }
}

function getNonce(): string {
  return randomBytes(32).toString('hex')
}

function escapeFontFamily(value: string): string {
  const families = value.split(',').map((f) => {
    const trimmed = f.trim().replace(/^['"]|['"]$/g, '')
    return /\s/.test(trimmed) ? `'${trimmed}'` : trimmed
  })
  const generics = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui'])
  if (!families.some((f) => generics.has(f))) families.push('monospace')
  return families.join(', ')
}
