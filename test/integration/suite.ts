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
    name: 'opens markdown with Human Markdown through the default editor association',
    run: async () => {
      const config = vscode.workspace.getConfiguration('workbench')
      const originalAssociations = config.get<Record<string, string>>('editorAssociations')
      const uri = await writeWorkspaceFile(
        'default-association-human-markdown.md',
        '# Default Association\n\nOpen me as Human Markdown.\n',
      )
      const before = new TextDecoder().decode(await vscode.workspace.fs.readFile(uri))

      try {
        await config.update(
          'editorAssociations',
          {
            ...originalAssociations,
            '*.md': VIEW_TYPE,
          },
          vscode.ConfigurationTarget.Workspace,
        )

        await vscode.commands.executeCommand('vscode.open', uri)
        await waitForCustomEditor(uri, VIEW_TYPE)
        await waitForWebviewMessage(uri, (message) => message.type === 'update')

        const after = new TextDecoder().decode(await vscode.workspace.fs.readFile(uri))
        const document = await vscode.workspace.openTextDocument(uri)
        assert.equal(after, before)
        assert.equal(document.getText(), before)
        assert.equal(document.isDirty, false)
      } finally {
        await config.update(
          'editorAssociations',
          originalAssociations,
          vscode.ConfigurationTarget.Workspace,
        )
      }
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
    name: 'toggle command reaches the active custom editor',
    run: async () => {
      await assertCommandRoutesToActiveEditor(
        'toggle-command-active-editor.md',
        'humanMarkdown.toggle',
        'toggle-mode',
      )
    },
  },
  {
    name: 'find command reaches the active custom editor',
    run: async () => {
      await assertCommandRoutesToActiveEditor(
        'find-command-active-editor.md',
        'humanMarkdown.find',
        'show-find',
      )
    },
  },
  {
    name: 'theme configuration broadcasts to open webviews',
    run: async () => {
      const firstUri = await writeWorkspaceFile(
        'theme-broadcast-one.md',
        '# Theme One\n\nFirst open editor.\n',
      )
      const secondUri = await writeWorkspaceFile(
        'theme-broadcast-two.md',
        '# Theme Two\n\nSecond open editor.\n',
      )
      const config = vscode.workspace.getConfiguration('humanMarkdown')
      const originalTheme = config.get<string>('theme')
      const targetTheme = originalTheme === 'github' ? 'light' : 'github'

      await openHumanMarkdown(firstUri, vscode.ViewColumn.One)
      await openHumanMarkdown(secondUri, vscode.ViewColumn.Beside)
      await clearWebviewMessages(firstUri)
      await clearWebviewMessages(secondUri)

      try {
        await config.update('theme', targetTheme, vscode.ConfigurationTarget.Workspace)

        await waitForWebviewMessage(firstUri, (message) => message.type === 'theme')
        await waitForWebviewMessage(secondUri, (message) => message.type === 'theme')
      } finally {
        await config.update('theme', originalTheme, vscode.ConfigurationTarget.Workspace)
      }
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
    name: 'native VS Code save updates the sync base',
    run: async () => {
      const uri = await writeWorkspaceFile(
        'native-save-updates-sync-base.md',
        '# Native Save\n\nOriginal content.\n',
      )
      const document = await vscode.workspace.openTextDocument(uri)
      const content = '# Native Save\n\nSaved through VS Code.\n'

      await openHumanMarkdown(uri)
      await clearWebviewMessages(uri)
      await sendWebviewMessage(uri, { type: 'edit', content, revision: 1 })
      await waitForDocumentText(document, content)

      assert.equal(await document.save(), true)

      await waitForWebviewMessage(uri, (message) => message.type === 'save-success')
      await waitForProviderState(uri, (state) => state.baseContent === content)
      await waitForProviderState(uri, (state) => state.lastAppliedFromWebview === content)
      assert.equal(document.isDirty, false)
    },
  },
  {
    name: 'clean webview accepts external document change',
    run: async () => {
      const uri = await writeWorkspaceFile(
        'clean-webview-accepts-external-change.md',
        '# External Change\n\nOriginal content.\n',
      )
      const document = await vscode.workspace.openTextDocument(uri)
      const content = '# External Change\n\nChanged outside the webview.\n'

      await openHumanMarkdown(uri)
      await clearWebviewMessages(uri)
      await replaceDocument(document, content)

      await waitForWebviewMessage(uri, (message) => {
        return message.type === 'update' && message.content === content
      })
      await waitForProviderState(uri, (state) => {
        return state.baseContent === content && state.webviewIsDirty === false
      })
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
    name: 'external merge waits for queued webview edits before merging',
    run: async () => {
      const uri = await writeWorkspaceFile('queued-webview-edit-external-merge.md', 'A\nB\nC\n')
      const document = await vscode.workspace.openTextDocument(uri)

      await openHumanMarkdown(uri)
      await clearWebviewMessages(uri)
      await holdNextWebviewEdit(uri)
      await sendWebviewMessage(uri, {
        type: 'edit',
        content: 'A old local\nB\nC\n',
        revision: 1,
      })
      await waitForProviderState(uri, (state) => state.heldWebviewEditStarted === true)
      await sendWebviewMessage(uri, {
        type: 'edit',
        content: 'A latest local\nB\nC\n',
        revision: 2,
      })

      await replaceDocument(document, 'A\nB\nC external\n')
      await releaseHeldWebviewEdit(uri)

      const merged = 'A latest local\nB\nC external\n'
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
    name: 'accept external waits for in-flight webview edit and cancels stale queued edits',
    run: async () => {
      const disk = 'A\nB\nC\n'
      const stale = 'A stale queued local\nB\nC\n'
      const uri = await writeWorkspaceFile('accept-external-serializes-with-edits.md', disk)
      const document = await vscode.workspace.openTextDocument(uri)

      await openHumanMarkdown(uri, vscode.ViewColumn.One)
      await openHumanMarkdown(uri, vscode.ViewColumn.Beside)
      await waitForSessionCount(uri, 2)
      await clearWebviewMessages(uri, 0)
      await clearWebviewMessages(uri, 1)
      await holdNextWebviewEdit(uri)
      await sendWebviewMessage(
        uri,
        {
          type: 'edit',
          content: 'A in-flight local\nB\nC\n',
          revision: 1,
        },
        0,
      )
      await waitForProviderState(uri, (state) => state.heldWebviewEditStarted === true)
      await sendWebviewMessage(uri, { type: 'edit', content: stale, revision: 2 }, 0)
      await sendWebviewMessage(uri, { type: 'accept-external' }, 0)

      await settle()
      assert.equal(document.getText(), disk)
      await releaseHeldWebviewEdit(uri)

      await waitForDocumentText(document, disk)
      await waitForWebviewMessage(
        uri,
        (message) => message.type === 'update' && message.content === disk,
        1,
      )
      await waitForProviderState(uri, (state) => {
        return state.webviewIsDirty === false && state.lastAppliedFromWebview === null
      })
      const peerMessages = await getWebviewMessages(uri, 1)
      assert.equal(
        peerMessages.some((message) => message.type === 'update' && message.content === stale),
        false,
      )
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
    name: 'keep mine waits for in-flight webview edit and cancels stale queued edits',
    run: async () => {
      const uri = await writeWorkspaceFile('keep-mine-serializes-with-edits.md', 'A\nB\nC\n')
      const document = await vscode.workspace.openTextDocument(uri)
      const kept = 'A kept local\nB\nC\n'
      const stale = 'A stale queued local\nB\nC\n'

      await openHumanMarkdown(uri, vscode.ViewColumn.One)
      await openHumanMarkdown(uri, vscode.ViewColumn.Beside)
      await waitForSessionCount(uri, 2)
      await clearWebviewMessages(uri, 0)
      await clearWebviewMessages(uri, 1)
      await holdNextWebviewEdit(uri)
      await sendWebviewMessage(
        uri,
        {
          type: 'edit',
          content: 'A in-flight local\nB\nC\n',
          revision: 1,
        },
        0,
      )
      await waitForProviderState(uri, (state) => state.heldWebviewEditStarted === true)
      await sendWebviewMessage(uri, { type: 'edit', content: stale, revision: 2 }, 0)
      await sendWebviewMessage(uri, { type: 'keep-mine', content: kept }, 0)

      await settle()
      assert.notEqual(document.getText(), kept)
      await releaseHeldWebviewEdit(uri)

      await waitForDocumentText(document, kept)
      await waitForWebviewMessage(
        uri,
        (message) => message.type === 'update' && message.content === kept,
        1,
      )
      await waitForProviderState(uri, (state) => {
        return state.webviewIsDirty === true && state.lastAppliedFromWebview === kept
      })
      assert.equal(document.isDirty, true)
      const peerMessages = await getWebviewMessages(uri, 1)
      assert.equal(
        peerMessages.some((message) => message.type === 'update' && message.content === stale),
        false,
      )
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
  {
    name: 'same file editor groups keep independent edit revision streams',
    run: async () => {
      const uri = await writeWorkspaceFile(
        'same-file-independent-webview-revisions.md',
        '# Shared Revisions\n\nOriginal content.\n',
      )
      const document = await vscode.workspace.openTextDocument(uri)
      const firstEdit = '# Shared Revisions\n\nFirst editor group edit.\n'
      const secondEdit = '# Shared Revisions\n\nFirst editor group second edit.\n'
      const peerEdit = '# Shared Revisions\n\nSecond editor group edit.\n'

      await openHumanMarkdown(uri, vscode.ViewColumn.One)
      await openHumanMarkdown(uri, vscode.ViewColumn.Beside)
      await waitForSessionCount(uri, 2)
      await clearWebviewMessages(uri, 0)
      await clearWebviewMessages(uri, 1)

      await sendWebviewMessage(uri, { type: 'edit', content: firstEdit, revision: 1 }, 0)
      await waitForDocumentText(document, firstEdit)
      await sendWebviewMessage(uri, { type: 'edit', content: secondEdit, revision: 2 }, 0)
      await waitForDocumentText(document, secondEdit)

      await sendWebviewMessage(uri, { type: 'edit', content: peerEdit, revision: 1 }, 1)

      await waitForDocumentText(document, peerEdit)
      await waitForWebviewMessage(
        uri,
        (message) => message.type === 'update' && message.content === peerEdit,
        0,
      )
    },
  },
  {
    name: 'two panels do not silently overwrite each other during save',
    run: async () => {
      const initial = '# Shared Save\n\nOriginal content.\n'
      const firstEdit = '# Shared Save\n\nEdited from the first editor group.\n'
      const uri = await writeWorkspaceFile('same-file-stale-peer-save.md', initial)
      const document = await vscode.workspace.openTextDocument(uri)

      await openHumanMarkdown(uri, vscode.ViewColumn.One)
      await openHumanMarkdown(uri, vscode.ViewColumn.Beside)
      await waitForSessionCount(uri, 2)
      await clearWebviewMessages(uri, 0)
      await clearWebviewMessages(uri, 1)

      await sendWebviewMessage(uri, { type: 'edit', content: firstEdit, revision: 1 }, 0)
      await waitForDocumentText(document, firstEdit)
      await waitForWebviewMessage(
        uri,
        (message) => message.type === 'update' && message.content === firstEdit,
        1,
      )
      await clearWebviewMessages(uri, 0)
      await clearWebviewMessages(uri, 1)

      await sendWebviewMessage(uri, { type: 'save', content: initial, requestId: 1 }, 1)

      await waitForWebviewMessage(
        uri,
        (message) => {
          return (
            message.type === 'save-failed' &&
            message.requestId === 1 &&
            message.reason === 'stale-content'
          )
        },
        1,
      )
      await settle()
      const firstPanelMessages = await getWebviewMessages(uri, 0)
      assert.equal(
        firstPanelMessages.some(
          (message) => message.type === 'save-failed' && message.requestId === 1,
        ),
        false,
      )
      assert.equal(document.getText(), firstEdit)
      assert.equal(new TextDecoder().decode(await vscode.workspace.fs.readFile(uri)), initial)

      await sendWebviewMessage(uri, { type: 'save', content: firstEdit, requestId: 1 }, 0)
      await waitForWebviewMessage(
        uri,
        (message) => message.type === 'save-success' && message.requestId === 1,
        0,
      )
      await settle()
      const secondPanelMessages = await getWebviewMessages(uri, 1)
      assert.equal(
        secondPanelMessages.some((message) => message.type === 'save-success'),
        false,
      )
      assert.equal(new TextDecoder().decode(await vscode.workspace.fs.readFile(uri)), firstEdit)
    },
  },
  {
    name: 'closing one panel does not break sync for the other',
    run: async () => {
      const uri = await writeWorkspaceFile(
        'same-file-close-one-panel.md',
        '# Close One Panel\n\nOriginal content.\n',
      )
      const document = await vscode.workspace.openTextDocument(uri)
      const edited = '# Close One Panel\n\nRemaining panel still edits.\n'

      await openHumanMarkdown(uri, vscode.ViewColumn.One)
      await openHumanMarkdown(uri, vscode.ViewColumn.Beside)
      await waitForSessionCount(uri, 2)
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor')
      await waitForSessionCount(uri, 1)
      await clearWebviewMessages(uri, 0)

      await vscode.commands.executeCommand('humanMarkdown.toggle')
      await vscode.commands.executeCommand('humanMarkdown.find')
      await waitForWebviewMessage(uri, (message) => message.type === 'toggle-mode', 0)
      await waitForWebviewMessage(uri, (message) => message.type === 'show-find', 0)
      await clearWebviewMessages(uri, 0)

      await sendWebviewMessage(uri, { type: 'edit', content: edited, revision: 1 }, 0)
      await waitForDocumentText(document, edited)
      await sendWebviewMessage(uri, { type: 'save', content: edited, requestId: 1301 }, 0)

      await waitForWebviewMessage(
        uri,
        (message) => message.type === 'save-success' && message.requestId === 1301,
        0,
      )
      assert.equal(new TextDecoder().decode(await vscode.workspace.fs.readFile(uri)), edited)
    },
  },
  {
    name: 'closing a stale saving panel does not notify the remaining panel',
    run: async () => {
      const initial = '# Closed Save\n\nOriginal content.\n'
      const firstEdit = '# Closed Save\n\nHeld edit from the first editor group.\n'
      const uri = await writeWorkspaceFile('same-file-close-stale-saving-panel.md', initial)
      const document = await vscode.workspace.openTextDocument(uri)

      await openHumanMarkdown(uri, vscode.ViewColumn.One)
      await openHumanMarkdown(uri, vscode.ViewColumn.Beside)
      await waitForSessionCount(uri, 2)
      await clearWebviewMessages(uri, 0)
      await clearWebviewMessages(uri, 1)
      await holdNextWebviewEdit(uri)
      await sendWebviewMessage(uri, { type: 'edit', content: firstEdit, revision: 1 }, 0)
      await waitForProviderState(uri, (state) => state.heldWebviewEditStarted === true)
      await sendWebviewMessage(uri, { type: 'save', content: initial, requestId: 1 }, 1)

      await vscode.commands.executeCommand('workbench.action.closeActiveEditor')
      await waitForSessionCount(uri, 1)
      await releaseHeldWebviewEdit(uri)

      await waitForDocumentText(document, firstEdit)
      await settle()
      const remainingPanelMessages = await getWebviewMessages(uri, 0)
      assert.equal(
        remainingPanelMessages.some(
          (message) => message.type === 'save-failed' && message.requestId === 1,
        ),
        false,
      )
      assert.equal(new TextDecoder().decode(await vscode.workspace.fs.readFile(uri)), initial)
    },
  },
  {
    name: 'active webview routing sends commands to the selected panel',
    run: async () => {
      const uri = await writeWorkspaceFile(
        'same-file-selected-panel-routing.md',
        '# Selected Panel\n\nCommands should follow focus.\n',
      )

      await openHumanMarkdown(uri, vscode.ViewColumn.One)
      await openHumanMarkdown(uri, vscode.ViewColumn.Beside)
      await waitForSessionCount(uri, 2)
      await vscode.commands.executeCommand('workbench.action.focusFirstEditorGroup')
      await waitForActiveTabGroup(vscode.ViewColumn.One)
      await clearWebviewMessages(uri, 0)
      await clearWebviewMessages(uri, 1)

      await vscode.commands.executeCommand('humanMarkdown.toggle')
      await vscode.commands.executeCommand('humanMarkdown.find')

      await waitForWebviewMessage(uri, (message) => message.type === 'toggle-mode', 0)
      await waitForWebviewMessage(uri, (message) => message.type === 'show-find', 0)
      await settle()
      const inactiveMessages = await getWebviewMessages(uri, 1)
      assert.equal(
        inactiveMessages.some(
          (message) => message.type === 'toggle-mode' || message.type === 'show-find',
        ),
        false,
      )
    },
  },
  {
    name: 'raw mode edit persists after toggling to rendered mode',
    run: async () => {
      const uri = await writeWorkspaceFile(
        'raw-mode-edit-toggle-rendered.md',
        '# Raw Mode\n\nOriginal content.\n',
      )
      const document = await vscode.workspace.openTextDocument(uri)
      const edited = '# Raw Mode\n\nEdited in raw mode.\n'

      await openHumanMarkdown(uri)
      await clearWebviewMessages(uri)
      await clearWebviewEvents(uri)

      await setRawContent(uri, edited)
      await waitForDocumentText(document, edited)
      await waitForWebviewState(uri, (event) => {
        return event.mode === 'raw' && event.content === edited
      })

      await vscode.commands.executeCommand('humanMarkdown.toggle')
      await reportWebviewState(uri)

      await waitForWebviewState(uri, (event) => {
        return event.mode === 'preview' && event.content === edited
      })
      assert.equal(document.getText(), edited)
      assert.equal(document.isDirty, true)
    },
  },
  {
    name: 'WYSIWYG edit persists after toggling to raw mode',
    run: async () => {
      const uri = await writeWorkspaceFile(
        'wysiwyg-edit-toggle-raw.md',
        '# WYSIWYG Mode\n\nOriginal content.\n',
      )
      const document = await vscode.workspace.openTextDocument(uri)

      await openHumanMarkdown(uri)
      await clearWebviewEvents(uri)
      await insertPreviewParagraph(uri, 'Edited in WYSIWYG mode.')
      await waitForDocumentTextContaining(document, 'Edited in WYSIWYG mode.')

      await vscode.commands.executeCommand('humanMarkdown.toggle')
      const state = await reportWebviewState(uri)

      assert.equal(state.mode, 'raw')
      assert.match(String(state.content), /Edited in WYSIWYG mode\./)
      assert.match(document.getText(), /Edited in WYSIWYG mode\./)
      assert.equal(document.isDirty, true)
    },
  },
  {
    name: 'untouched raw-to-rendered-to-raw round trip preserves bytes',
    run: async () => {
      const uri = await writeWorkspaceFile(
        'untouched-raw-rendered-raw.md',
        '# Raw Round Trip\n\nOriginal content.\n',
      )
      const document = await vscode.workspace.openTextDocument(uri)
      const raw = '# Raw Round Trip\n\nhttp://example.com/a*b\n\nsee https://example.com here\n'

      await openHumanMarkdown(uri)
      await clearWebviewEvents(uri)
      await setRawContent(uri, raw)
      await waitForDocumentText(document, raw)

      await vscode.commands.executeCommand('humanMarkdown.toggle')
      await reportWebviewState(uri)
      await vscode.commands.executeCommand('humanMarkdown.toggle')
      const state = await reportWebviewState(uri)

      assert.equal(state.mode, 'raw')
      assert.equal(state.content, raw)
      assert.equal(document.getText(), raw)
    },
  },
  {
    name: 'bare URLs preserve expected bytes when untouched',
    run: async () => {
      const initial = [
        '# Bare URLs',
        '',
        'https://example.com/a*b',
        '',
        'See http://example.com/one_two and https://example.com/~user?q=a*b.',
        '',
      ].join('\n')
      await assertUntouchedRoundTripPreservesBytes('untouched-bare-urls.md', initial)
    },
  },
  {
    name: 'tables do not drift when untouched',
    run: async () => {
      const initial = [
        '# Tables',
        '',
        '| Name | Age | City |',
        '| --- | --- | --- |',
        '| Alice | 30 | NYC |',
        '| Bob | 25 | LA |',
        '',
        '| Left | Center | Right |',
        '| :--- | :---: | ---: |',
        '| L1 | C1 | R1 |',
        '| L2 | C2 | R2 |',
        '',
      ].join('\n')
      await assertUntouchedRoundTripPreservesBytes('untouched-tables.md', initial)
    },
  },
  {
    name: 'lists preserve tight and loose behavior when untouched',
    run: async () => {
      const initial = [
        '# Lists',
        '',
        '- Tight item one',
        '- Tight item two',
        '  - Tight nested A',
        '  - Tight nested B',
        '- Tight item three',
        '',
        '1. Loose first',
        '',
        '2. Loose second',
        '',
        '   Continued paragraph in the loose second item.',
        '',
        '3. Loose third',
        '',
        '- [ ] Unchecked task',
        '- [x] Checked task',
        '',
      ].join('\n')
      await assertUntouchedRoundTripPreservesBytes('untouched-lists.md', initial)
    },
  },
  {
    name: 'frontmatter survives open toggle save when untouched',
    run: async () => {
      const initial = [
        '---',
        'title: Round Trip',
        'tags:',
        '  - editor',
        '  - integration',
        'published: false',
        '---',
        '',
        '# Frontmatter',
        '',
        'Body content stays below the metadata block.',
        '',
      ].join('\n')
      await assertUntouchedRoundTripPreservesBytes('untouched-frontmatter.md', initial)
    },
  },
  {
    name: 'code fences survive open toggle save when untouched',
    run: async () => {
      const initial = [
        '# Code Fences',
        '',
        'Inline `code` in a sentence.',
        '',
        '```javascript',
        'function hello() {',
        "  console.log('world')",
        '}',
        '```',
        '',
        '```',
        'Plain code block with no language.',
        '```',
        '',
      ].join('\n')
      await assertUntouchedRoundTripPreservesBytes('untouched-code-fences.md', initial)
    },
  },
  {
    name: 'GitHub alerts survive open toggle save when untouched',
    run: async () => {
      const initial = [
        '# GitHub Alerts',
        '',
        '> [!NOTE]',
        '> Useful context with `inline code`.',
        '',
        '> [!WARNING]',
        '> First warning paragraph.',
        '>',
        '> Second warning paragraph with **strong text**.',
        '',
      ].join('\n')
      await assertUntouchedRoundTripPreservesBytes('untouched-github-alerts.md', initial)
    },
  },
  {
    name: 'math blocks survive open toggle save when untouched',
    run: async () => {
      const initial = [
        '# Math',
        '',
        'Euler says $e^{i\\pi} + 1 = 0$ in prose.',
        '',
        '$$',
        'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
        '$$',
        '',
        'Inline math like $\\alpha + \\beta = \\gamma$ survives too.',
        '',
      ].join('\n')
      await assertUntouchedRoundTripPreservesBytes('untouched-math.md', initial)
    },
  },
  {
    name: 'undo/redo in WYSIWYG updates document',
    run: async () => {
      const initial = '# WYSIWYG Undo\n\nOriginal content.\n'
      const uri = await writeWorkspaceFile('wysiwyg-undo-redo.md', initial)
      const document = await vscode.workspace.openTextDocument(uri)

      await openHumanMarkdown(uri)
      await insertPreviewParagraph(uri, 'Undoable WYSIWYG paragraph.')
      const edited = document.getText()
      assert.match(edited, /Undoable WYSIWYG paragraph\./)

      await vscode.commands.executeCommand('humanMarkdown.undo')
      await waitForDocumentText(document, initial)

      await vscode.commands.executeCommand('humanMarkdown.redo')
      await waitForDocumentText(document, edited)
    },
  },
  {
    name: 'undo/redo in raw mode updates document',
    run: async () => {
      const initial = '# Raw Undo\n\nOriginal content.\n'
      const edited = '# Raw Undo\n\nEdited in raw mode.\n'
      const uri = await writeWorkspaceFile('raw-undo-redo.md', initial)
      const document = await vscode.workspace.openTextDocument(uri)

      await openHumanMarkdown(uri)
      await setRawContent(uri, edited)
      await waitForDocumentText(document, edited)

      await vscode.commands.executeCommand('humanMarkdown.undo')
      await waitForDocumentText(document, initial)

      await vscode.commands.executeCommand('humanMarkdown.redo')
      await waitForDocumentText(document, edited)
    },
  },
  {
    name: 'mode state restores after panel reload',
    run: async () => {
      const modeUri = await writeWorkspaceFile(
        'restore-mode-state.md',
        '# Restore Mode\n\nRaw mode.\n',
      )
      await openHumanMarkdown(modeUri)
      await clearWebviewMessages(modeUri)
      await sendWebviewMessage(modeUri, {
        type: 'save-state',
        state: { scrollTop: 0, mode: 'raw' },
      })
      await vscode.commands.executeCommand('workbench.action.closeAllEditors')
      await waitForSessionCount(modeUri, 0)

      await openHumanMarkdown(modeUri)
      const modeState = await reportWebviewState(modeUri)
      assert.equal(modeState.mode, 'raw')
    },
  },
  {
    name: 'scroll state restores after panel reload',
    run: async () => {
      const content = [
        '# Restore Scroll',
        '',
        ...Array.from({ length: 120 }, (_, index) => [
          `Paragraph ${index + 1}: keep me tall.`,
          '',
        ]).flat(),
        '',
      ].join('\n')
      const uri = await writeWorkspaceFile('restore-scroll-state.md', content)
      const restoredScrollTop = 480

      await openHumanMarkdown(uri)
      await clearWebviewMessages(uri)
      await sendWebviewMessage(uri, {
        type: 'save-state',
        state: { scrollTop: restoredScrollTop, mode: 'preview' },
      })
      await vscode.commands.executeCommand('workbench.action.closeAllEditors')
      await waitForSessionCount(uri, 0)

      await openHumanMarkdown(uri)
      const state = await waitForReportedWebviewState(uri, (event) => {
        return event.mode === 'preview' && event.scrollTop === restoredScrollTop
      })

      assert.equal(state.scrollTop, restoredScrollTop)
    },
  },
]

let nextRequestId = 1

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

async function postWebviewMessage(
  uri: vscode.Uri,
  message: unknown,
  sessionIndex?: number,
): Promise<void> {
  await vscode.commands.executeCommand(
    'humanMarkdown.test.postMessage',
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

async function getWebviewEvents(
  uri: vscode.Uri,
  sessionIndex?: number,
): Promise<Array<Record<string, unknown>>> {
  return await vscode.commands.executeCommand(
    'humanMarkdown.test.webviewEvents',
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

async function clearWebviewEvents(uri: vscode.Uri, sessionIndex?: number): Promise<void> {
  await vscode.commands.executeCommand(
    'humanMarkdown.test.clearWebviewEvents',
    uri.toString(),
    sessionIndex,
  )
}

async function setRawContent(uri: vscode.Uri, content: string, sessionIndex?: number) {
  const requestId = nextRequestId++
  await postWebviewMessage(uri, { type: 'test-set-raw-content', content, requestId }, sessionIndex)
  return await waitForWebviewState(
    uri,
    (event) => event.name === 'state' && event.requestId === requestId,
    sessionIndex,
  )
}

async function reportWebviewState(uri: vscode.Uri, sessionIndex?: number) {
  const requestId = nextRequestId++
  await postWebviewMessage(uri, { type: 'test-report-state', requestId }, sessionIndex)
  return await waitForWebviewState(
    uri,
    (event) => event.name === 'state' && event.requestId === requestId,
    sessionIndex,
  )
}

async function waitForMilkdownReady(uri: vscode.Uri, sessionIndex?: number) {
  return await waitForWebviewState(uri, (event) => event.name === 'milkdown-ready', sessionIndex)
}

async function waitForReportedWebviewState(
  uri: vscode.Uri,
  predicate: (event: Record<string, unknown>) => boolean,
  sessionIndex?: number,
): Promise<Record<string, unknown>> {
  const started = Date.now()
  let lastState: Record<string, unknown> | undefined
  while (Date.now() - started < 5000) {
    const state = await reportWebviewState(uri, sessionIndex)
    lastState = state
    if (predicate(state)) {
      return state
    }
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  assert.fail(
    `Expected matching reported webview state for ${uri.toString()}, last state: ${JSON.stringify(
      lastState,
    )}`,
  )
}

async function insertPreviewParagraph(uri: vscode.Uri, text: string, sessionIndex?: number) {
  const requestId = nextRequestId++
  await postWebviewMessage(
    uri,
    { type: 'test-insert-preview-paragraph', text, requestId },
    sessionIndex,
  )
  return await waitForWebviewState(
    uri,
    (event) => event.name === 'state' && event.requestId === requestId,
    sessionIndex,
  )
}

async function holdNextWebviewEdit(uri: vscode.Uri, sessionIndex?: number): Promise<void> {
  await vscode.commands.executeCommand(
    'humanMarkdown.test.holdNextWebviewEdit',
    uri.toString(),
    sessionIndex,
  )
}

async function releaseHeldWebviewEdit(uri: vscode.Uri, sessionIndex?: number): Promise<void> {
  await vscode.commands.executeCommand(
    'humanMarkdown.test.releaseHeldWebviewEdit',
    uri.toString(),
    sessionIndex,
  )
}

async function getSessionCount(uri: vscode.Uri): Promise<number> {
  return await vscode.commands.executeCommand('humanMarkdown.test.sessionCount', uri.toString())
}

async function assertCommandRoutesToActiveEditor(
  filename: string,
  command: string,
  expectedMessageType: string,
): Promise<void> {
  const uri = await writeWorkspaceFile(
    filename,
    '# Active Command\n\nRoute command messages to the active panel.\n',
  )

  await openHumanMarkdown(uri, vscode.ViewColumn.One)
  await openHumanMarkdown(uri, vscode.ViewColumn.Beside)
  await waitForSessionCount(uri, 2)
  await clearWebviewMessages(uri, 0)
  await clearWebviewMessages(uri, 1)

  await vscode.commands.executeCommand(command)

  await waitForWebviewMessage(uri, (message) => message.type === expectedMessageType, 1)
  await settle()
  const inactiveMessages = await getWebviewMessages(uri, 0)
  assert.equal(
    inactiveMessages.some((message) => message.type === expectedMessageType),
    false,
  )
}

async function assertUntouchedRoundTripPreservesBytes(
  filename: string,
  initial: string,
): Promise<void> {
  const uri = await writeWorkspaceFile(filename, initial)
  const document = await vscode.workspace.openTextDocument(uri)

  await openHumanMarkdown(uri)
  const previewState = await waitForMilkdownReady(uri)
  assert.equal(previewState.mode, 'preview')
  assert.equal(previewState.content, initial)

  await vscode.commands.executeCommand('humanMarkdown.toggle')
  const rawState = await reportWebviewState(uri)
  assert.equal(await document.save(), true)

  const disk = new TextDecoder().decode(await vscode.workspace.fs.readFile(uri))
  assert.equal(rawState.mode, 'raw')
  assert.equal(rawState.content, initial)
  assert.equal(document.getText(), initial)
  assert.equal(disk, initial)
  assert.equal(document.isDirty, false)
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

async function waitForWebviewState(
  uri: vscode.Uri,
  predicate: (event: Record<string, unknown>) => boolean,
  sessionIndex?: number,
): Promise<Record<string, unknown>> {
  let matched: Record<string, unknown> | undefined
  await waitFor(async () => {
    const events = await getWebviewEvents(uri, sessionIndex)
    matched = events.find(predicate)
    return matched !== undefined
  }, `Expected matching webview state for ${uri.toString()}`)
  assert.ok(matched)
  return matched
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

async function waitForActiveTabGroup(viewColumn: vscode.ViewColumn): Promise<void> {
  await waitFor(() => {
    return vscode.window.tabGroups.activeTabGroup.viewColumn === viewColumn
  }, `Expected active tab group to be ${viewColumn}`)
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

async function waitForDocumentTextContaining(
  document: vscode.TextDocument,
  expected: string,
): Promise<void> {
  await waitFor(
    () => document.getText().includes(expected),
    `Expected document text to contain ${JSON.stringify(expected)}, got ${JSON.stringify(document.getText())}`,
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
