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

    const findCommand = vscode.commands.registerCommand('humanMarkdown.find', () => {
      for (const webview of provider.webviews) {
        provider.postMessage(webview, { type: 'show-find' })
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
      findCommand,
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
    let webviewIsDirty = false

    const applyWebviewEdit = (content: string) => {
      if (content === document.getText()) return
      suppressNextSync = true
      const edit = new vscode.WorkspaceEdit()
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length),
      )
      edit.replace(document.uri, fullRange, content)
      const reset = () => {
        suppressNextSync = false
      }
      vscode.workspace.applyEdit(edit).then(reset, reset)
    }

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
          applyWebviewEdit(msg.content)
          break
        }
        case 'dirty-state': {
          webviewIsDirty = msg.isDirty
          break
        }
        case 'accept-external': {
          webviewIsDirty = false
          vscode.workspace.fs.readFile(document.uri).then((bytes) => {
            const diskContent = new TextDecoder().decode(bytes)
            suppressNextSync = true
            const edit = new vscode.WorkspaceEdit()
            const fullRange = new vscode.Range(
              document.positionAt(0),
              document.positionAt(document.getText().length),
            )
            edit.replace(document.uri, fullRange, diskContent)
            vscode.workspace.applyEdit(edit).then(
              () => {
                suppressNextSync = false
                this.postMessage(webview, { type: 'update', content: diskContent })
              },
              () => {
                suppressNextSync = false
              },
            )
          })
          break
        }
        case 'keep-mine': {
          webviewIsDirty = false
          applyWebviewEdit(msg.content)
          break
        }
        case 'save-state': {
          this.savedStates.set(document.uri.toString(), msg.state)
          break
        }
        case 'open-link': {
          const href = msg.href
          if (/^[a-z][a-z0-9+.-]*:/i.test(href)) {
            vscode.env.openExternal(vscode.Uri.parse(href))
          } else if (!href.startsWith('#')) {
            const docDir = vscode.Uri.joinPath(document.uri, '..')
            const targetUri = vscode.Uri.joinPath(docDir, href)
            vscode.commands.executeCommand('vscode.open', targetUri)
          }
          break
        }
        case 'save': {
          document.save()
          break
        }
      }
    })

    const onDocChange = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() !== document.uri.toString()) return
      if (suppressNextSync) return
      if (webviewIsDirty) {
        this.postMessage(webview, { type: 'external-change', content: document.getText() })
      } else {
        this.postMessage(webview, { type: 'update', content: document.getText() })
      }
    })

    const fileWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(document.uri, '*'),
    )
    const onFileChange = fileWatcher.onDidChange(async (uri) => {
      if (uri.toString() !== document.uri.toString()) return
      if (!webviewIsDirty) return
      const diskBytes = await vscode.workspace.fs.readFile(document.uri)
      const diskContent = new TextDecoder().decode(diskBytes)
      if (diskContent !== document.getText()) {
        this.postMessage(webview, { type: 'external-change', content: diskContent })
      }
    })

    webviewPanel.onDidDispose(() => {
      this.webviews.delete(webview)
      onMessage.dispose()
      onDocChange.dispose()
      onFileChange.dispose()
      fileWatcher.dispose()
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
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'editor.css'),
    )
    const mermaidUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'mermaid.js'),
    )
    const shikiUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'shiki.js'),
    )
    const katexUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'katex.js'),
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
  <link rel="stylesheet" href="${styleUri}">
</head>
<body style="--hm-zoom-compensation: ${zoomCompensation}; --hm-cm-font-family: ${escapeFontFamily(fontFamily)}; --hm-cm-font-size: ${fontSize}px; --hm-cm-line-height: ${lineHeight}px;">
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
  <script nonce="${nonce}" async src="${katexUri}"></script>
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
