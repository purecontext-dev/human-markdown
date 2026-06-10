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
  postMessage: (msg: ExtensionToWebviewMessage) => void
  getMessages: () => ExtensionToWebviewMessage[]
  getWebviewEvents: () => WebviewToExtensionMessage[]
  getState: () => Record<string, unknown>
  clearMessages: () => void
  clearWebviewEvents: () => void
  holdNextWebviewEdit: () => void
  releaseHeldWebviewEdit: () => void
}

export class MarkdownEditorProvider implements vscode.CustomTextEditorProvider {
  static readonly viewType = 'humanMarkdown.preview'

  private readonly savedStates = new Map<string, { scrollTop: number; mode: 'preview' | 'raw' }>()
  private readonly webviews = new Set<vscode.Webview>()
  private readonly documentSyncSessions = new Map<string, DocumentSyncSession>()
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

    const syncSession = this.getOrCreateDocumentSyncSession(document)
    syncSession.addWebview(webview)
    let onMessageReceived: (msg: WebviewToExtensionMessage) => void = () => {}
    const sessionMessages: ExtensionToWebviewMessage[] = []
    const webviewEvents: WebviewToExtensionMessage[] = []
    const documentKey = document.uri.toString()
    const testSession: TestSession = {
      uri: document.uri,
      sendMessage: (msg) => onMessageReceived(msg),
      postMessage: (msg) => this.postMessage(webview, msg),
      getMessages: () => [...sessionMessages],
      getWebviewEvents: () => [...webviewEvents],
      getState: () => syncSession.getTestState(),
      clearMessages: () => {
        sessionMessages.length = 0
      },
      clearWebviewEvents: () => {
        webviewEvents.length = 0
      },
      holdNextWebviewEdit: () => {
        syncSession.holdNextWebviewEdit()
      },
      releaseHeldWebviewEdit: () => {
        syncSession.releaseHeldWebviewEdit()
      },
    }
    this.addTestSession(documentKey, testSession)
    this.testMessageSinks.set(webview, sessionMessages)
    const post = (message: ExtensionToWebviewMessage) => {
      this.postSessionMessage(webview, message)
    }

    onMessageReceived = (msg: WebviewToExtensionMessage) => {
      if (msg.type === 'test-event') {
        webviewEvents.push(msg)
        return
      }
      switch (msg.type) {
        case 'ready': {
          syncSession.syncBaseFromDocumentIfClean()
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
          syncSession.enqueueEdit(msg.content, msg.revision, msg.origin, webview)
          break
        }
        case 'dirty-state': {
          syncSession.setDirty(msg.isDirty)
          break
        }
        case 'accept-external': {
          syncSession.enqueueAcceptExternal()
          break
        }
        case 'keep-mine': {
          syncSession.enqueueKeepMine(msg.content, webview)
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
          syncSession.enqueueSave(msg.content, msg.requestId, webview)
          break
        }
      }
    }

    const onMessage = webview.onDidReceiveMessage(onMessageReceived)

    webviewPanel.onDidDispose(() => {
      this.webviews.delete(webview)
      syncSession.removeWebview(webview)
      this.disposeDocumentSyncSessionIfIdle(documentKey)
      this.removeTestSession(documentKey, testSession)
      onMessage.dispose()
    })
  }

  private getOrCreateDocumentSyncSession(document: vscode.TextDocument): DocumentSyncSession {
    const documentKey = document.uri.toString()
    const existing = this.documentSyncSessions.get(documentKey)
    if (existing) return existing

    const session = new DocumentSyncSession(document, (webview, message) => {
      this.postSessionMessage(webview, message)
    })
    this.documentSyncSessions.set(documentKey, session)
    return session
  }

  private disposeDocumentSyncSessionIfIdle(documentKey: string) {
    const session = this.documentSyncSessions.get(documentKey)
    if (!session || session.hasWebviews) return
    session.dispose()
    this.documentSyncSessions.delete(documentKey)
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
        'humanMarkdown.test.postMessage',
        (uriString: string, message: ExtensionToWebviewMessage, sessionIndex?: number) => {
          this.getTestSession(uriString, sessionIndex)?.postMessage(message)
        },
      ),
      vscode.commands.registerCommand(
        'humanMarkdown.test.webviewEvents',
        (uriString: string, sessionIndex?: number) => {
          return this.getTestSession(uriString, sessionIndex)?.getWebviewEvents() ?? []
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
        'humanMarkdown.test.clearWebviewEvents',
        (uriString: string, sessionIndex?: number) => {
          this.getTestSession(uriString, sessionIndex)?.clearWebviewEvents()
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
<body data-host="${vscode.env.appName === 'Cursor' ? 'cursor' : 'vscode'}" data-test-hooks="${process.env.HUMAN_MARKDOWN_TEST_HOOKS === '1' ? 'true' : 'false'}" style="--hm-zoom-compensation: ${zoomCompensation}; --hm-cm-font-family: ${escapeFontFamily(fontFamily)}; --hm-cm-font-size: ${fontSize}px; --hm-cm-line-height: ${lineHeight}px;">
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

class DocumentSyncSession {
  private readonly webviews = new Set<vscode.Webview>()
  private readonly suppressedDocumentChanges: string[] = []
  private readonly disposables: vscode.Disposable[]
  private readonly webviewEditSequencer: WebviewEditSequencer
  private webviewIsDirty = false
  private isSaving = false
  private baseContent: string
  private lastAppliedFromWebview: string | null = null
  private protectWebviewContentUntil = 0
  private holdNextEdit = false
  private heldWebviewEditStarted = false
  private releaseHeldEdit: (() => void) | null = null

  constructor(
    private readonly document: vscode.TextDocument,
    private readonly post: (webview: vscode.Webview, message: ExtensionToWebviewMessage) => void,
  ) {
    this.baseContent = document.getText()
    this.webviewEditSequencer = new WebviewEditSequencer({
      applyEdit: (content, source) => this.applyWebviewEdit(content, this.asKnownWebview(source)),
      save: (content, requestId, source) =>
        this.saveWebviewContent(content, requestId, source as vscode.Webview | undefined),
      onHistoryEditApplied: () => {
        this.protectWebviewContentUntil = Date.now() + 750
      },
    })
    this.disposables = [
      vscode.workspace.onDidChangeTextDocument((e) => this.handleDocumentChange(e)),
      vscode.workspace.onDidSaveTextDocument((savedDocument) =>
        this.handleDocumentSave(savedDocument),
      ),
    ]
  }

  get hasWebviews(): boolean {
    return this.webviews.size > 0
  }

  addWebview(webview: vscode.Webview) {
    this.webviews.add(webview)
  }

  removeWebview(webview: vscode.Webview) {
    this.webviews.delete(webview)
  }

  dispose() {
    for (const disposable of this.disposables) {
      disposable.dispose()
    }
  }

  syncBaseFromDocumentIfClean() {
    if (this.webviewIsDirty) return
    this.baseContent = this.document.getText()
    this.lastAppliedFromWebview = null
  }

  setDirty(isDirty: boolean) {
    this.webviewIsDirty = isDirty
  }

  enqueueEdit(
    content: string,
    revision: number,
    origin: 'history' | 'edit' | undefined,
    source: vscode.Webview,
  ) {
    this.webviewIsDirty = true
    this.webviewEditSequencer.enqueueEdit(content, revision, origin, source)
  }

  enqueueSave(content: string, requestId?: number, source?: vscode.Webview) {
    this.webviewEditSequencer.enqueueSave(content, requestId, source)
  }

  enqueueAcceptExternal() {
    this.webviewEditSequencer.enqueueConflictResolution(() => this.acceptExternalContent())
  }

  enqueueKeepMine(content: string, source: vscode.Webview) {
    this.webviewEditSequencer.enqueueConflictResolution(async () => {
      this.webviewIsDirty = true
      await this.applyWebviewEdit(content, source)
    })
  }

  holdNextWebviewEdit() {
    this.holdNextEdit = true
    this.heldWebviewEditStarted = false
  }

  releaseHeldWebviewEdit() {
    this.releaseHeldEdit?.()
  }

  getTestState(): Record<string, unknown> {
    return {
      webviewIsDirty: this.webviewIsDirty,
      baseContent: this.baseContent,
      lastAppliedFromWebview: this.lastAppliedFromWebview,
      heldWebviewEditStarted: this.heldWebviewEditStarted,
      suppressedDocumentChanges: [...this.suppressedDocumentChanges],
    }
  }

  private handleDocumentChange(e: vscode.TextDocumentChangeEvent) {
    if (e.document.uri.toString() !== this.document.uri.toString()) return
    const newContent = this.document.getText()
    if (this.consumeSuppressedDocumentChange(newContent)) return
    if (this.isSaving) return
    if (this.lastAppliedFromWebview !== null && newContent === this.lastAppliedFromWebview) return
    if (
      Date.now() < this.protectWebviewContentUntil &&
      this.lastAppliedFromWebview !== null &&
      newContent !== this.lastAppliedFromWebview
    ) {
      this.broadcast({ type: 'external-change' })
      return
    }
    if (this.webviewIsDirty) {
      const externalContent = newContent
      this.webviewEditSequencer.enqueueExternalChange(() => {
        const webviewContent = this.lastAppliedFromWebview ?? this.baseContent
        if (!this.tryMergeExternal(externalContent, webviewContent)) {
          this.broadcast({ type: 'external-change' })
        }
      })
    } else {
      this.baseContent = newContent
      this.lastAppliedFromWebview = null
      this.broadcast({ type: 'update', content: newContent })
    }
  }

  private handleDocumentSave(savedDocument: vscode.TextDocument) {
    if (savedDocument.uri.toString() !== this.document.uri.toString()) return
    const savedContent = this.document.getText()
    this.baseContent = savedContent
    this.lastAppliedFromWebview = savedContent
    if (this.isSaving) return
    this.broadcast({ type: 'save-success' })
  }

  private tryMergeExternal(externalContent: string, webviewContent = this.document.getText()) {
    const result = threeWayMerge(this.baseContent, webviewContent, externalContent)
    if (result.conflict) return false
    if (result.merged === this.document.getText()) {
      this.baseContent = result.merged
      this.broadcast({ type: 'merge-update', content: result.merged })
      return true
    }
    this.suppressDocumentChange(result.merged)
    const edit = new vscode.WorkspaceEdit()
    edit.replace(this.document.uri, this.fullDocumentRange(), result.merged)
    vscode.workspace.applyEdit(edit).then(
      () => {
        this.baseContent = result.merged
        this.broadcast({ type: 'merge-update', content: result.merged })
      },
      () => {
        this.unsuppressDocumentChange(result.merged)
        this.broadcast({ type: 'external-change' })
      },
    )
    return true
  }

  private async applyWebviewEdit(content: string, source?: vscode.Webview): Promise<boolean> {
    await this.waitForHeldEdit()
    if (content === this.document.getText()) {
      this.broadcastExcept(source, { type: 'update', content })
      return true
    }
    this.lastAppliedFromWebview = content
    this.suppressDocumentChange(content)
    const edit = new vscode.WorkspaceEdit()
    edit.replace(this.document.uri, this.fullDocumentRange(), content)
    return Promise.resolve(vscode.workspace.applyEdit(edit)).then(
      () => {
        this.broadcastExcept(source, { type: 'update', content })
        return true
      },
      () => {
        this.unsuppressDocumentChange(content)
        return false
      },
    )
  }

  private async acceptExternalContent() {
    try {
      const bytes = await vscode.workspace.fs.readFile(this.document.uri)
      const diskContent = new TextDecoder().decode(bytes)
      if (diskContent === this.document.getText()) {
        this.baseContent = diskContent
        this.lastAppliedFromWebview = null
        this.webviewIsDirty = false
        this.broadcast({ type: 'update', content: diskContent })
        return
      }
      this.suppressDocumentChange(diskContent)
      const edit = new vscode.WorkspaceEdit()
      edit.replace(this.document.uri, this.fullDocumentRange(), diskContent)
      const applied = await Promise.resolve(vscode.workspace.applyEdit(edit))
      if (applied) {
        this.baseContent = diskContent
        this.lastAppliedFromWebview = null
        this.webviewIsDirty = false
        this.broadcast({ type: 'update', content: diskContent })
      } else {
        this.unsuppressDocumentChange(diskContent)
        this.broadcast({ type: 'external-change' })
      }
    } catch {
      this.broadcast({ type: 'external-change' })
    }
  }

  private async saveWebviewContent(content: string, requestId?: number, source?: vscode.Webview) {
    const reportSaveSuccess = (savedContent: string) => {
      this.baseContent = savedContent
      this.postSaveResponse(source, { type: 'save-success', requestId })
    }

    const doSave = async () => {
      this.isSaving = true
      const contentBeforeSave = this.document.getText()
      this.lastAppliedFromWebview = contentBeforeSave
      try {
        const saved = await this.document.save()
        this.isSaving = false
        if (saved || !this.document.isDirty) {
          reportSaveSuccess(contentBeforeSave)
        } else {
          this.postSaveResponse(source, { type: 'save-failed', requestId, reason: 'save' })
        }
      } catch {
        this.isSaving = false
        this.postSaveResponse(source, { type: 'save-failed', requestId, reason: 'save' })
      }
    }

    if (content !== this.document.getText()) {
      if (this.lastAppliedFromWebview !== content) {
        this.postSaveResponse(source, { type: 'save-failed', requestId, reason: 'stale-content' })
        return
      }
      this.suppressDocumentChange(content)
      const edit = new vscode.WorkspaceEdit()
      edit.replace(this.document.uri, this.fullDocumentRange(), content)
      const applied = await Promise.resolve(vscode.workspace.applyEdit(edit))
      if (applied) {
        await doSave()
      } else {
        this.unsuppressDocumentChange(content)
        this.postSaveResponse(source, { type: 'save-failed', requestId, reason: 'apply' })
      }
    } else {
      await doSave()
    }
  }

  private async waitForHeldEdit() {
    if (!this.holdNextEdit) return
    this.holdNextEdit = false
    this.heldWebviewEditStarted = true
    await new Promise<void>((resolve) => {
      this.releaseHeldEdit = resolve
    })
    this.releaseHeldEdit = null
    this.heldWebviewEditStarted = false
  }

  private suppressDocumentChange(content: string) {
    this.suppressedDocumentChanges.push(content)
  }

  private unsuppressDocumentChange(content: string) {
    const index = this.suppressedDocumentChanges.indexOf(content)
    if (index !== -1) this.suppressedDocumentChanges.splice(index, 1)
  }

  private consumeSuppressedDocumentChange(content: string) {
    const index = this.suppressedDocumentChanges.indexOf(content)
    if (index === -1) return false
    this.suppressedDocumentChanges.splice(index, 1)
    return true
  }

  private fullDocumentRange() {
    return new vscode.Range(
      this.document.positionAt(0),
      this.document.positionAt(this.document.getText().length),
    )
  }

  private broadcast(message: ExtensionToWebviewMessage) {
    for (const webview of this.webviews) {
      this.post(webview, message)
    }
  }

  private postSaveResponse(source: vscode.Webview | undefined, message: ExtensionToWebviewMessage) {
    if (source) {
      if (this.webviews.has(source)) {
        this.post(source, message)
      }
      return
    }
    this.broadcast(message)
  }

  private asKnownWebview(source: unknown): vscode.Webview | undefined {
    return this.webviews.has(source as vscode.Webview) ? (source as vscode.Webview) : undefined
  }

  private broadcastExcept(source: vscode.Webview | undefined, message: ExtensionToWebviewMessage) {
    for (const webview of this.webviews) {
      if (webview !== source) {
        this.post(webview, message)
      }
    }
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
