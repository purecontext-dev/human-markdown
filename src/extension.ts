import * as vscode from 'vscode'
import { MarkdownEditorProvider } from './editor-provider'

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(MarkdownEditorProvider.register(context))
  offerReopenMarkdownFiles(context)
}

export function deactivate() {}

function offerReopenMarkdownFiles(context: vscode.ExtensionContext) {
  const key = 'hasOfferedReopen'
  const versionKey = 'installedVersion'
  const currentVersion = context.extension.packageJSON.version

  if (context.globalState.get<boolean>(key)) return

  // Existing user upgrading — they already know the extension, skip the prompt
  if (context.globalState.get<string>(versionKey) !== undefined) {
    context.globalState.update(key, true)
    context.globalState.update(versionKey, currentVersion)
    return
  }

  context.globalState.update(versionKey, currentVersion)

  const markdownEditors = vscode.window.tabGroups.all
    .flatMap((group) => group.tabs)
    .filter((tab) => tab.input instanceof vscode.TabInputText && tab.input.uri.path.endsWith('.md'))

  if (markdownEditors.length === 0) {
    context.globalState.update(key, true)
    return
  }

  const uris = markdownEditors.map((tab) => (tab.input as vscode.TabInputText).uri)

  vscode.window
    .showInformationMessage(
      'Human Markdown can render your open markdown files as rich WYSIWYG. Open them now?',
      'Yes',
      'No',
    )
    .then((choice) => {
      context.globalState.update(key, true)
      if (choice !== 'Yes') return
      for (const uri of uris) {
        vscode.commands.executeCommand('vscode.openWith', uri, MarkdownEditorProvider.viewType)
      }
    })
}
