import { randomBytes } from 'node:crypto'
import * as path from 'node:path'
import * as vscode from 'vscode'
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from './messages'
import { getConfiguredThemeName, resolveThemeTokens } from './theme-resolver'
import { threeWayMerge } from './three-way-merge'
import { WebviewEditSequencer } from './webview-edit-sequencer'

interface TestSession {
  uri: vscode.Uri
  sendMessage: (msg: WebviewToExtensionMessage) => void
  getMessages: () => ExtensionToWebviewMessage[]
  getState: () => Record<string, unknown>
  clearMessages: () => void
  holdNextWebviewEdit: () => void
  releaseHeldWebviewEdit: () => void
}

export class MarkdownEditorProvider implements vscode.CustomTextEditorProvider {
  static readonly viewType = 'humanMarkdown.preview'

  private readonly savedStates = new Map<string, { scrollTop: number; mode: 'preview' | 'raw' }>()
  private readonly webviews = new Set<vscode.Webview>()
  private readonly testSessions = new Map<string, TestSession[]>()
  private readonly testMessageSinks = new WeakMap<vscode.Webview, ExtensionToWebviewMessage[]>()
  private activeWebview: vscode.Webview | null = null

  constructor(private readonly context: vscode.ExtensionContext) {}

  static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new MarkdownEditorProvider(context)

    const registration = vscode.window.registerCustomEditorProvider(
      MarkdownEditorProvider.viewType,
      provider,
      { webviewOptions: { retainContextWhenHidden: true } },
    )

    const toggleCommand = vscode.commands.registerCommand('humanMarkdown.toggle', () => {
      if (provider.activeWebview) {
        provider.postMessage(provider.activeWebview, { type: 'toggle-mode' })
      }
    })

    const findCommand = vscode.commands.registerCommand('humanMarkdown.find', () => {
      if (provider.activeWebview) {
        provider.postMessage(provider.activeWebview, { type: 'show-find' })
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

    const noopCommand = vscode.commands.registerCommand('humanMarkdown.noop', () => {})

    const undoCommand = vscode.commands.registerCommand('humanMarkdown.undo', () => {
      if (provider.activeWebview) {
        provider.postMessage(provider.activeWebview, { type: 'undo' })
      }
    })

    const redoCommand = vscode.commands.registerCommand('humanMarkdown.redo', () => {
      if (provider.activeWebview) {
        provider.postMessage(provider.activeWebview, { type: 'redo' })
      }
    })

    const onConfigChange = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('humanMarkdown.theme')) {
        provider.broadcastTheme()
      }
      if (e.affectsConfiguration('humanMarkdown.autoSave')) {
        provider.broadcastAutoSave()
      }
    })

    const onColorThemeChange = vscode.window.onDidChangeActiveColorTheme(() => {
      if (getConfiguredThemeName() === 'auto') {
        provider.broadcastTheme()
      }
    })

    const disposables: vscode.Disposable[] = [
      registration,
      toggleCommand,
      findCommand,
      selectThemeCommand,
      noopCommand,
      undoCommand,
      redoCommand,
      onConfigChange,
      onColorThemeChange,
    ]

    if (process.env.HUMAN_MARKDOWN_TEST_HOOKS === '1') {
      disposables.push(...provider.registerTestHooks())
    }

    return vscode.Disposable.from(...disposables)
  }

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
  ): Promise<void> {
    const webview = webviewPanel.webview
    webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'dist'),
        vscode.Uri.joinPath(document.uri, '..'),
      ],
    }

    const defaultMode = vscode.workspace
      .getConfiguration('humanMarkdown')
      .get<string>('defaultMode', 'wysiwyg')

    webview.html = this.getHtmlForWebview(webview)
    this.webviews.add(webview)
    if (webviewPanel.active) this.activeWebview = webview
    webviewPanel.onDidChangeViewState(() => {
      if (webviewPanel.active) this.activeWebview = webview
      else if (this.activeWebview === webview) this.activeWebview = null
    })

    const suppressedDocumentChanges: string[] = []
    let webviewIsDirty = false
    let isSaving = false
    let baseContent = document.getText()
    let lastAppliedFromWebview: string | null = null
    let protectWebviewContentUntil = 0
    let holdNextWebviewEdit = false
    let heldWebviewEditStarted = false
    let releaseHeldWebviewEdit: (() => void) | null = null
    let onMessageReceived: (msg: WebviewToExtensionMessage) => void = () => {}
    const sessionMessages: ExtensionToWebviewMessage[] = []
    const documentKey = document.uri.toString()
    const testSession: TestSession = {
      uri: document.uri,
      sendMessage: (msg) => onMessageReceived(msg),
      getMessages: () => [...sessionMessages],
      getState: () => ({
        webviewIsDirty,
        baseContent,
        lastAppliedFromWebview,
        heldWebviewEditStarted,
        suppressedDocumentChanges: [...suppressedDocumentChanges],
      }),
      clearMessages: () => {
        sessionMessages.length = 0
      },
      holdNextWebviewEdit: () => {
        holdNextWebviewEdit = true
        heldWebviewEditStarted = false
      },
      releaseHeldWebviewEdit: () => {
        releaseHeldWebviewEdit?.()
      },
    }
    this.addTestSession(documentKey, testSession)
    this.testMessageSinks.set(webview, sessionMessages)
    const post = (message: ExtensionToWebviewMessage) => {
      this.postSessionMessage(webview, message)
    }

    const tryMergeExternal = (
      externalContent: string,
      webviewContent = document.getText(),
    ): boolean => {
      const result = threeWayMerge(baseContent, webviewContent, externalContent)
      if (result.conflict) return false
      if (result.merged === document.getText()) {
        baseContent = result.merged
        post({ type: 'merge-update', content: result.merged })
        return true
      }
      suppressDocumentChange(result.merged)
      const edit = new vscode.WorkspaceEdit()
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length),
      )
      edit.replace(document.uri, fullRange, result.merged)
      vscode.workspace.applyEdit(edit).then(
        () => {
          baseContent = result.merged
          post({ type: 'merge-update', content: result.merged })
        },
        () => {
          unsuppressDocumentChange(result.merged)
          post({ type: 'external-change' })
        },
      )
      return true
    }

    const applyWebviewEdit = (content: string, onSuccess?: () => void): Promise<boolean> => {
      const waitForHeldEdit = async () => {
        if (!holdNextWebviewEdit) return
        holdNextWebviewEdit = false
        heldWebviewEditStarted = true
        await new Promise<void>((resolve) => {
          releaseHeldWebviewEdit = resolve
        })
        releaseHeldWebviewEdit = null
        heldWebviewEditStarted = false
      }

      return waitForHeldEdit().then(() => applyWebviewEditNow(content, onSuccess))
    }

    const applyWebviewEditNow = (content: string, onSuccess?: () => void): Promise<boolean> => {
      if (content === document.getText()) {
        onSuccess?.()
        return Promise.resolve(true)
      }
      lastAppliedFromWebview = content
      suppressDocumentChange(content)
      const edit = new vscode.WorkspaceEdit()
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length),
      )
      edit.replace(document.uri, fullRange, content)
      return Promise.resolve(vscode.workspace.applyEdit(edit)).then(
        () => {
          onSuccess?.()
          return true
        },
        () => {
          unsuppressDocumentChange(content)
          return false
        },
      )
    }

    const acceptExternalContent = async () => {
      try {
        const bytes = await vscode.workspace.fs.readFile(document.uri)
        const diskContent = new TextDecoder().decode(bytes)
        if (diskContent === document.getText()) {
          baseContent = diskContent
          lastAppliedFromWebview = null
          webviewIsDirty = false
          post({ type: 'update', content: diskContent })
          return
        }
        suppressDocumentChange(diskContent)
        const edit = new vscode.WorkspaceEdit()
        const fullRange = new vscode.Range(
          document.positionAt(0),
          document.positionAt(document.getText().length),
        )
        edit.replace(document.uri, fullRange, diskContent)
        const applied = await Promise.resolve(vscode.workspace.applyEdit(edit))
        if (applied) {
          baseContent = diskContent
          lastAppliedFromWebview = null
          webviewIsDirty = false
          post({ type: 'update', content: diskContent })
        } else {
          unsuppressDocumentChange(diskContent)
          post({ type: 'external-change' })
        }
      } catch {
        post({ type: 'external-change' })
      }
    }

    const saveWebviewContent = async (content: string, requestId?: number) => {
      const reportSaveSuccess = (content: string) => {
        baseContent = content
        post({ type: 'save-success', requestId })
      }

      const doSave = async () => {
        isSaving = true
        const contentBeforeSave = document.getText()
        lastAppliedFromWebview = contentBeforeSave
        try {
          const saved = await document.save()
          isSaving = false
          if (saved || !document.isDirty) {
            reportSaveSuccess(contentBeforeSave)
          } else {
            post({ type: 'save-failed', requestId, reason: 'save' })
          }
        } catch {
          isSaving = false
          post({ type: 'save-failed', requestId, reason: 'save' })
        }
      }

      if (content !== document.getText()) {
        suppressDocumentChange(content)
        const edit = new vscode.WorkspaceEdit()
        const fullRange = new vscode.Range(
          document.positionAt(0),
          document.positionAt(document.getText().length),
        )
        edit.replace(document.uri, fullRange, content)
        const applied = await Promise.resolve(vscode.workspace.applyEdit(edit))
        if (applied) {
          await doSave()
        } else {
          unsuppressDocumentChange(content)
          post({ type: 'save-failed', requestId, reason: 'apply' })
        }
      } else {
        await doSave()
      }
    }

    const webviewEditSequencer = new WebviewEditSequencer({
      applyEdit: applyWebviewEdit,
      save: saveWebviewContent,
      onHistoryEditApplied: () => {
        protectWebviewContentUntil = Date.now() + 750
      },
    })

    onMessageReceived = (msg: WebviewToExtensionMessage) => {
      switch (msg.type) {
        case 'ready': {
          baseContent = document.getText()
          post({ type: 'update', content: document.getText() })
          post({
            type: 'theme',
            tokens: resolveThemeTokens(getConfiguredThemeName()),
          })
          post({
            type: 'set-mode',
            mode: defaultMode === 'raw' ? 'raw' : 'preview',
          })
          post({
            type: 'auto-save',
            enabled: vscode.workspace
              .getConfiguration('humanMarkdown')
              .get<boolean>('autoSave', false),
          })
          const saved = this.savedStates.get(document.uri.toString())
          if (saved) {
            post({ type: 'restore-state', state: saved })
          }
          break
        }
        case 'edit': {
          webviewIsDirty = true
          webviewEditSequencer.enqueueEdit(msg.content, msg.revision, msg.origin)
          break
        }
        case 'dirty-state': {
          webviewIsDirty = msg.isDirty
          break
        }
        case 'accept-external': {
          webviewEditSequencer.enqueueConflictResolution(acceptExternalContent)
          break
        }
        case 'keep-mine': {
          webviewEditSequencer.enqueueConflictResolution(async () => {
            webviewIsDirty = true
            await applyWebviewEdit(msg.content)
          })
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
        case 'resolve-image-uri': {
          const docDir = vscode.Uri.joinPath(document.uri, '..')
          const imageUri = vscode.Uri.joinPath(docDir, msg.src)
          const relative = path.relative(docDir.fsPath, imageUri.fsPath)
          if (relative.startsWith('..') || path.isAbsolute(relative)) {
            break
          }
          const webviewUri = webview.asWebviewUri(imageUri).toString()
          post({
            type: 'image-uri-resolved',
            src: msg.src,
            webviewUri,
          })
          break
        }
        case 'auto-save-changed': {
          const target = msg.enabled
          vscode.workspace
            .getConfiguration('humanMarkdown')
            .update('autoSave', target, vscode.ConfigurationTarget.Global)
            .then(undefined, () => {
              post({ type: 'auto-save', enabled: !target })
            })
          break
        }
        case 'save': {
          webviewEditSequencer.enqueueSave(msg.content, msg.requestId)
          break
        }
      }
    }

    const onMessage = webview.onDidReceiveMessage(onMessageReceived)

    const onDocChange = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() !== document.uri.toString()) return
      const newContent = document.getText()
      if (consumeSuppressedDocumentChange(newContent)) return
      if (isSaving) return
      if (lastAppliedFromWebview !== null && newContent === lastAppliedFromWebview) return
      if (
        Date.now() < protectWebviewContentUntil &&
        lastAppliedFromWebview !== null &&
        newContent !== lastAppliedFromWebview
      ) {
        post({ type: 'external-change' })
        return
      }
      if (webviewIsDirty) {
        const externalContent = newContent
        webviewEditSequencer.enqueueExternalChange(() => {
          const webviewContent = lastAppliedFromWebview ?? baseContent
          if (!tryMergeExternal(externalContent, webviewContent)) {
            post({ type: 'external-change' })
          }
        })
      } else {
        baseContent = newContent
        lastAppliedFromWebview = null
        post({ type: 'update', content: newContent })
      }
    })

    function suppressDocumentChange(content: string) {
      suppressedDocumentChanges.push(content)
    }

    function unsuppressDocumentChange(content: string) {
      const index = suppressedDocumentChanges.indexOf(content)
      if (index !== -1) suppressedDocumentChanges.splice(index, 1)
    }

    function consumeSuppressedDocumentChange(content: string): boolean {
      const index = suppressedDocumentChanges.indexOf(content)
      if (index === -1) return false
      suppressedDocumentChanges.splice(index, 1)
      return true
    }

    const onDocSave = vscode.workspace.onDidSaveTextDocument((savedDocument) => {
      if (savedDocument.uri.toString() !== document.uri.toString()) return
      const savedContent = document.getText()
      baseContent = savedContent
      lastAppliedFromWebview = savedContent
      post({ type: 'save-success' })
    })

    webviewPanel.onDidDispose(() => {
      this.webviews.delete(webview)
      this.removeTestSession(documentKey, testSession)
      onMessage.dispose()
      onDocChange.dispose()
      onDocSave.dispose()
    })
  }

  private broadcastTheme() {
    const tokens = resolveThemeTokens(getConfiguredThemeName())
    for (const webview of this.webviews) {
      this.postMessage(webview, { type: 'theme', tokens })
    }
  }

  private broadcastAutoSave() {
    const enabled = vscode.workspace
      .getConfiguration('humanMarkdown')
      .get<boolean>('autoSave', false)
    for (const webview of this.webviews) {
      this.postMessage(webview, { type: 'auto-save', enabled })
    }
  }

  private postMessage(webview: vscode.Webview, message: ExtensionToWebviewMessage) {
    this.testMessageSinks.get(webview)?.push(message)
    webview.postMessage(message)
  }

  private postSessionMessage(webview: vscode.Webview, message: ExtensionToWebviewMessage) {
    this.postMessage(webview, message)
  }

  private registerTestHooks(): vscode.Disposable[] {
    return [
      vscode.commands.registerCommand(
        'humanMarkdown.test.sendMessage',
        (uriString: string, message: WebviewToExtensionMessage, sessionIndex?: number) => {
          const session = this.getTestSession(uriString, sessionIndex)
          session?.sendMessage(message)
        },
      ),
      vscode.commands.registerCommand(
        'humanMarkdown.test.messages',
        (uriString: string, sessionIndex?: number) => {
          return this.getTestSession(uriString, sessionIndex)?.getMessages() ?? []
        },
      ),
      vscode.commands.registerCommand(
        'humanMarkdown.test.state',
        (uriString: string, sessionIndex?: number) => {
          return this.getTestSession(uriString, sessionIndex)?.getState() ?? {}
        },
      ),
      vscode.commands.registerCommand(
        'humanMarkdown.test.clearMessages',
        (uriString: string, sessionIndex?: number) => {
          this.getTestSession(uriString, sessionIndex)?.clearMessages()
        },
      ),
      vscode.commands.registerCommand(
        'humanMarkdown.test.holdNextWebviewEdit',
        (uriString: string, sessionIndex?: number) => {
          this.getTestSession(uriString, sessionIndex)?.holdNextWebviewEdit()
        },
      ),
      vscode.commands.registerCommand(
        'humanMarkdown.test.releaseHeldWebviewEdit',
        (uriString: string, sessionIndex?: number) => {
          this.getTestSession(uriString, sessionIndex)?.releaseHeldWebviewEdit()
        },
      ),
      vscode.commands.registerCommand('humanMarkdown.test.sessionCount', (uriString: string) => {
        return this.testSessions.get(uriString)?.length ?? 0
      }),
    ]
  }

  private addTestSession(documentKey: string, session: TestSession) {
    const sessions = this.testSessions.get(documentKey) ?? []
    sessions.push(session)
    this.testSessions.set(documentKey, sessions)
  }

  private removeTestSession(documentKey: string, session: TestSession) {
    const sessions = this.testSessions.get(documentKey)
    if (!sessions) return
    const remaining = sessions.filter((s) => s !== session)
    if (remaining.length === 0) {
      this.testSessions.delete(documentKey)
    } else {
      this.testSessions.set(documentKey, remaining)
    }
  }

  private getTestSession(uriString: string, sessionIndex?: number): TestSession | undefined {
    const sessions = this.testSessions.get(uriString)
    if (!sessions) return undefined
    if (sessionIndex === undefined) return sessions.at(-1)
    return sessions[sessionIndex]
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
<body data-host="${vscode.env.appName === 'Cursor' ? 'cursor' : 'vscode'}" style="--hm-zoom-compensation: ${zoomCompensation}; --hm-cm-font-family: ${escapeFontFamily(fontFamily)}; --hm-cm-font-size: ${fontSize}px; --hm-cm-line-height: ${lineHeight}px;">
  <div id="hm-banner">
    <span class="hm-banner-label">Human Markdown</span>
    <span class="hm-banner-hint" title="Cursor has its own markdown toggle in the tab bar. Use the button below to switch modes — Cursor's toggle will switch you out of Human Markdown.">Use the toggle below to switch modes</span>
  </div>
  <div id="toolbar">
    <label id="autosave-toggle" class="toggle-switch">
      <input type="checkbox" id="autosave-checkbox">
      <span class="toggle-track"></span>
      <span class="toggle-label">Autosave</span>
    </label>
    <div id="formatting-toolbar-slot"></div>
    <button id="mode-toggle-btn" data-mode="preview">View Source</button>
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
