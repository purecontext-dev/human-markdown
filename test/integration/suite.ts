import assert from 'node:assert/strict'
import * as vscode from 'vscode'

const EXTENSION_ID = 'purecontext.human-markdown'
const VIEW_TYPE = 'humanMarkdown.preview'

interface IntegrationTest {
  name: string
  skipReason?: string
  run: () => Promise<void>
}

const tests: IntegrationTest[] = [
  {
    name: 'activates the extension in a real Extension Host',
    run: async () => {
      const extension = vscode.extensions.getExtension(EXTENSION_ID)
      assert.ok(extension, `Expected ${EXTENSION_ID} to be available`)

      await extension.activate()

      assert.equal(extension.isActive, true)
      assert.ok(
        await commandExists('humanMarkdown.toggle'),
        'Expected humanMarkdown.toggle to be registered',
      )
    },
  },
  {
    name: 'opens markdown with the Human Markdown custom editor without changing document text',
    run: async () => {
      const uri = await writeWorkspaceFile(
        'open-with-human-markdown.md',
        '# Human Markdown\n\nOriginal content.\n',
      )
      const document = await vscode.workspace.openTextDocument(uri)
      const before = document.getText()

      await openHumanMarkdown(uri)

      assert.equal(document.getText(), before)
      assert.equal(document.isDirty, false)
    },
  },
  {
    name: 'keeps the backing TextDocument usable while the custom editor is open',
    run: async () => {
      const uri = await writeWorkspaceFile(
        'text-document-while-custom-editor-open.md',
        '# Backing Document\n\nOriginal content.\n',
      )
      const document = await vscode.workspace.openTextDocument(uri)

      await openHumanMarkdown(uri)

      const edit = new vscode.WorkspaceEdit()
      const end = document.positionAt(document.getText().length)
      edit.insert(uri, end, '\nAppended by integration test.\n')
      assert.equal(await vscode.workspace.applyEdit(edit), true)

      assert.match(document.getText(), /Appended by integration test\./)
      assert.equal(document.isDirty, true)
    },
  },
  {
    name: 'webview edit updates the backing TextDocument',
    run: async () => {
      const uri = await writeWorkspaceFile(
        'webview-edit-updates-text-document.md',
        '# Sync\n\nOriginal content.\n',
      )
      const document = await vscode.workspace.openTextDocument(uri)

      await openHumanMarkdown(uri)
      await sendWebviewMessage(uri, {
        type: 'edit',
        content: '# Sync\n\nEdited from webview.\n',
        revision: 1,
      })

      await waitForDocumentText(document, '# Sync\n\nEdited from webview.\n')
      assert.equal(document.isDirty, true)
    },
  },
  {
    name: 'save after webview edit writes disk bytes',
    run: async () => {
      const uri = await writeWorkspaceFile(
        'webview-edit-save-writes-disk.md',
        '# Save\n\nOriginal content.\n',
      )
      const document = await vscode.workspace.openTextDocument(uri)
      const content = '# Save\n\nPersisted from webview.\n'

      await openHumanMarkdown(uri)
      await clearWebviewMessages(uri)
      await sendWebviewMessage(uri, { type: 'edit', content, revision: 1 })
      await waitForDocumentText(document, content)
      await sendWebviewMessage(uri, { type: 'save', content, requestId: 42 })

      await waitForWebviewMessage(uri, (message) => {
        return message.type === 'save-success' && message.requestId === 42
      })
      const diskContent = new TextDecoder().decode(await vscode.workspace.fs.readFile(uri))
      assert.equal(diskContent, content)
      assert.equal(document.isDirty, false)
    },
  },
  {
    name: 'dirty webview plus non-overlapping external change merges',
    run: async () => {
      const uri = await writeWorkspaceFile('non-overlapping-external-merge.md', 'A\nB\nC\n')
      const document = await vscode.workspace.openTextDocument(uri)

      await openHumanMarkdown(uri)
      await clearWebviewMessages(uri)
      await sendWebviewMessage(uri, { type: 'dirty-state', isDirty: true })
      await sendWebviewMessage(uri, { type: 'edit', content: 'A local\nB\nC\n', revision: 1 })
      await waitForDocumentText(document, 'A local\nB\nC\n')
      await waitForProviderState(uri, (state) => state.webviewIsDirty === true)
      await settle()

      await replaceDocument(document, 'A\nB\nC external\n')
      await settle()

      const merged = 'A local\nB\nC external\n'
      await waitForDocumentText(document, merged)
      await waitForWebviewMessage(uri, (message) => {
        return message.type === 'merge-update' && message.content === merged
      })
    },
  },
  {
    name: 'dirty webview plus overlapping external change surfaces conflict',
    run: async () => {
      const uri = await writeWorkspaceFile('overlapping-external-conflict.md', 'A\nB\nC\n')
      const document = await vscode.workspace.openTextDocument(uri)

      await openHumanMarkdown(uri)
      await clearWebviewMessages(uri)
      await sendWebviewMessage(uri, { type: 'dirty-state', isDirty: true })
      await sendWebviewMessage(uri, { type: 'edit', content: 'A local\nB\nC\n', revision: 1 })
      await waitForDocumentText(document, 'A local\nB\nC\n')
      await waitForProviderState(uri, (state) => state.webviewIsDirty === true)
      await settle()

      await replaceDocument(document, 'A external\nB\nC\n')

      await waitForWebviewMessage(uri, (message) => message.type === 'external-change')
    },
  },
  {
    name: 'accept external discards local dirty content',
    run: async () => {
      const uri = await writeWorkspaceFile('accept-external-discards-local.md', 'A\nB\nC\n')
      const document = await vscode.workspace.openTextDocument(uri)
      const local = 'A local\nB\nC\n'
      const external = 'A external\nB\nC\n'

      await createConflict(uri, document, local, external)
      await sendWebviewMessage(uri, { type: 'accept-external' })

      await waitForDocumentText(document, external)
      await waitForWebviewMessage(uri, (message) => {
        return message.type === 'update' && message.content === external
      })
      await waitForProviderState(uri, (state) => state.webviewIsDirty === false)
    },
  },
  {
    name: 'keep mine preserves local content and stays dirty until saved',
    run: async () => {
      const uri = await writeWorkspaceFile('keep-mine-stays-dirty.md', 'A\nB\nC\n')
      const document = await vscode.workspace.openTextDocument(uri)
      const local = 'A local\nB\nC\n'
      const external = 'A external\nB\nC\n'

      await createConflict(uri, document, local, external)
      await sendWebviewMessage(uri, { type: 'keep-mine', content: local })

      await waitForDocumentText(document, local)
      await waitForProviderState(uri, (state) => state.webviewIsDirty === true)
      assert.equal(document.isDirty, true)
    },
  },
  {
    name: 'same file open in two editor groups sees shared updates',
    run: async () => {
      const uri = await writeWorkspaceFile(
        'same-file-two-editor-groups.md',
        '# Shared\n\nOriginal content.\n',
      )
      const document = await vscode.workspace.openTextDocument(uri)
      const edited = '# Shared\n\nEdited from the first editor group.\n'

      await openHumanMarkdown(uri, vscode.ViewColumn.One)
      await openHumanMarkdown(uri, vscode.ViewColumn.Beside)
      await waitForSessionCount(uri, 2)
      await clearWebviewMessages(uri, 0)
      await clearWebviewMessages(uri, 1)

      await sendWebviewMessage(
        uri,
        {
          type: 'edit',
          content: edited,
          revision: 1,
        },
        0,
      )

      await waitForDocumentText(document, edited)
      await waitForWebviewMessage(
        uri,
        (message) => message.type === 'update' && message.content === edited,
        1,
      )
    },
  },
]

export async function run(): Promise<void> {
  for (const test of tests) {
    if (test.skipReason) {
      console.log(`skip - ${test.name}: ${test.skipReason}`)
      continue
    }
    try {
      await test.run()
      console.log(`ok - ${test.name}`)
    } catch (err) {
      console.error(`not ok - ${test.name}`)
      throw err
    } finally {
      await vscode.commands.executeCommand('workbench.action.closeAllEditors')
    }
  }
}

async function commandExists(command: string): Promise<boolean> {
  const commands = await vscode.commands.getCommands(true)
  return commands.includes(command)
}

async function writeWorkspaceFile(name: string, content: string): Promise<vscode.Uri> {
  const folder = vscode.workspace.workspaceFolders?.[0]
  assert.ok(folder, 'Expected integration test workspace folder')

  const uri = vscode.Uri.joinPath(folder.uri, name)
  await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(content))
  return uri
}

async function sendWebviewMessage(
  uri: vscode.Uri,
  message: unknown,
  sessionIndex?: number,
): Promise<void> {
  await vscode.commands.executeCommand(
    'humanMarkdown.test.sendMessage',
    uri.toString(),
    message,
    sessionIndex,
  )
}

async function getWebviewMessages(
  uri: vscode.Uri,
  sessionIndex?: number,
): Promise<Array<Record<string, unknown>>> {
  return await vscode.commands.executeCommand(
    'humanMarkdown.test.messages',
    uri.toString(),
    sessionIndex,
  )
}

async function getProviderState(
  uri: vscode.Uri,
  sessionIndex?: number,
): Promise<Record<string, unknown>> {
  return await vscode.commands.executeCommand(
    'humanMarkdown.test.state',
    uri.toString(),
    sessionIndex,
  )
}

async function clearWebviewMessages(uri: vscode.Uri, sessionIndex?: number): Promise<void> {
  await vscode.commands.executeCommand(
    'humanMarkdown.test.clearMessages',
    uri.toString(),
    sessionIndex,
  )
}

async function getSessionCount(uri: vscode.Uri): Promise<number> {
  return await vscode.commands.executeCommand('humanMarkdown.test.sessionCount', uri.toString())
}

async function openHumanMarkdown(uri: vscode.Uri, viewColumn?: vscode.ViewColumn): Promise<void> {
  await vscode.commands.executeCommand(
    'vscode.openWith',
    uri,
    VIEW_TYPE,
    viewColumn === undefined ? undefined : { viewColumn },
  )
  await waitForCustomEditor(uri, VIEW_TYPE)
  await waitForWebviewMessage(uri, (message) => message.type === 'update')
}

async function waitForWebviewMessage(
  uri: vscode.Uri,
  predicate: (message: Record<string, unknown>) => boolean,
  sessionIndex?: number,
): Promise<void> {
  await waitFor(async () => {
    const messages = await getWebviewMessages(uri, sessionIndex)
    return messages.some(predicate)
  }, `Expected matching webview message for ${uri.toString()}`)
}

async function createConflict(
  uri: vscode.Uri,
  document: vscode.TextDocument,
  local: string,
  external: string,
): Promise<void> {
  await openHumanMarkdown(uri)
  await clearWebviewMessages(uri)
  await sendWebviewMessage(uri, { type: 'edit', content: local, revision: 1 })
  await waitForDocumentText(document, local)
  await waitForProviderState(uri, (state) => state.webviewIsDirty === true)
  await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(external))
  await replaceDocument(document, external)
  await waitForWebviewMessage(uri, (message) => message.type === 'external-change')
}

async function waitForProviderState(
  uri: vscode.Uri,
  predicate: (state: Record<string, unknown>) => boolean,
  sessionIndex?: number,
): Promise<void> {
  await waitFor(async () => {
    const state = await getProviderState(uri, sessionIndex)
    return predicate(state)
  }, `Expected matching provider state for ${uri.toString()}`)
}

async function waitForSessionCount(uri: vscode.Uri, expected: number): Promise<void> {
  await waitFor(async () => {
    return (await getSessionCount(uri)) === expected
  }, `Expected ${expected} webview sessions for ${uri.toString()}`)
}

async function replaceDocument(document: vscode.TextDocument, content: string): Promise<void> {
  const edit = new vscode.WorkspaceEdit()
  edit.replace(
    document.uri,
    new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)),
    content,
  )
  assert.equal(await vscode.workspace.applyEdit(edit), true)
}

async function waitForDocumentText(document: vscode.TextDocument, expected: string): Promise<void> {
  await waitFor(
    () => document.getText() === expected,
    `Expected document text to be ${JSON.stringify(expected)}, got ${JSON.stringify(document.getText())}`,
  )
}

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 100))
}

async function waitForCustomEditor(uri: vscode.Uri, viewType: string): Promise<void> {
  await waitFor(() => {
    const tab = vscode.window.tabGroups.activeTabGroup.activeTab
    return (
      tab?.input instanceof vscode.TabInputCustom &&
      tab.input.viewType === viewType &&
      tab.input.uri.toString() === uri.toString()
    )
  }, `Expected active tab to be ${viewType} for ${uri.toString()}`)
}

async function waitFor(
  predicate: () => boolean | Promise<boolean>,
  message: string,
): Promise<void> {
  const started = Date.now()
  while (Date.now() - started < 5000) {
    if (await predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  assert.fail(message)
}
