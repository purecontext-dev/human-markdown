import { randomBytes } from 'node:crypto'
import * as vscode from 'vscode'
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from './messages'

export class MarkdownEditorProvider implements vscode.CustomTextEditorProvider {
  static readonly viewType = 'humanMarkdown.preview'

  private readonly savedStates = new Map<string, { scrollTop: number }>()

  constructor(private readonly context: vscode.ExtensionContext) {}

  static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new MarkdownEditorProvider(context)

    const registration = vscode.window.registerCustomEditorProvider(
      MarkdownEditorProvider.viewType,
      provider,
      { webviewOptions: { retainContextWhenHidden: true } },
    )

    const toggleCommand = vscode.commands.registerCommand('humanMarkdown.toggle', () => {
      const uri =
        vscode.window.activeTextEditor?.document.uri ??
        vscode.window.tabGroups.activeTabGroup.activeTab?.input
      if (!uri) return

      const resourceUri = uri instanceof vscode.Uri ? uri : (uri as { uri?: vscode.Uri }).uri

      if (!resourceUri) return

      const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab
      const isCustomEditor = activeTab?.input instanceof vscode.TabInputCustom
      const targetViewType = isCustomEditor ? 'default' : MarkdownEditorProvider.viewType

      vscode.commands.executeCommand('vscode.openWith', resourceUri, targetViewType)
    })

    return vscode.Disposable.from(registration, toggleCommand)
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

    webview.html = this.getHtmlForWebview(webview)

    let suppressNextSync = false

    const onMessage = webview.onDidReceiveMessage((msg: WebviewToExtensionMessage) => {
      switch (msg.type) {
        case 'ready': {
          this.postMessage(webview, { type: 'update', content: document.getText() })
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
      }
    })

    const onDocChange = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() !== document.uri.toString()) return
      if (suppressNextSync) return
      this.postMessage(webview, { type: 'update', content: document.getText() })
    })

    webviewPanel.onDidDispose(() => {
      onMessage.dispose()
      onDocChange.dispose()
    })
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
    const nonce = getNonce()

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource} 'unsafe-eval'; font-src ${webview.cspSource};">
  <title>Human Markdown</title>
  <style>
    body {
      margin: 0;
      padding: 16px;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-editor-foreground);
      background-color: var(--vscode-editor-background);
    }
    #editor {
      max-width: 800px;
      margin: 0 auto;
    }
    .milkdown .editor {
      outline: none;
    }
  </style>
</head>
<body>
  <div id="editor"></div>
  <script nonce="${nonce}" async src="${mermaidUri}"></script>
  <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
</body>
</html>`
  }
}

function getNonce(): string {
  return randomBytes(32).toString('hex')
}
