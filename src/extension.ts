import * as vscode from 'vscode'
import { MarkdownEditorProvider } from './editor-provider'

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(MarkdownEditorProvider.register(context))
  offerReopenMarkdownFiles(context)
  offerCursorEditorAssociation(context)
}

export function deactivate() {}

export function offerCursorEditorAssociation(context: vscode.ExtensionContext) {
  if (vscode.env.appName !== 'Cursor') return

  const key = 'hasOfferedCursorFix'
  if (context.globalState.get<boolean>(key)) return
  context.globalState.update(key, true)

  const config = vscode.workspace.getConfiguration('workbench')
  const associations = config.get<Record<string, string>>('editorAssociations') ?? {}
  if (associations['*.md'] === MarkdownEditorProvider.viewType) return

  vscode.window
    .showInformationMessage(
      "Cursor's built-in markdown preview can conflict with Human Markdown. Set Human Markdown as the default editor for .md files?",
      'Yes',
      'No',
    )
    .then((choice) => {
      if (choice !== 'Yes') return
      const updated = { ...associations, '*.md': MarkdownEditorProvider.viewType }
      config.update('editorAssociations', updated, vscode.ConfigurationTarget.Global).then(
        () =>
          vscode.window.showInformationMessage(
            'Done — .md files will now open in Human Markdown by default.',
          ),
        (err) => vscode.window.showErrorMessage(`Failed to update editor association: ${err}`),
      )
    })
}

export function offerReopenMarkdownFiles(context: vscode.ExtensionContext) {
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

  const markdownTabs = vscode.window.tabGroups.all
    .flatMap((group) => group.tabs)
    .filter(
      (tab): tab is vscode.Tab & { input: vscode.TabInputText } =>
        tab.input instanceof vscode.TabInputText && tab.input.uri.path.endsWith('.md'),
    )

  if (markdownTabs.length === 0) {
    context.globalState.update(key, true)
    return
  }

  const uris = markdownTabs.map((tab) => tab.input.uri)

  context.globalState.update(key, true)

  vscode.window
    .showInformationMessage(
      'Human Markdown can render your open markdown files as rich WYSIWYG. Open them now?',
      'Yes',
      'No',
    )
    .then((choice) => {
      if (choice !== 'Yes') return
      for (const uri of uris) {
        vscode.commands.executeCommand('vscode.openWith', uri, MarkdownEditorProvider.viewType)
      }
    })
}
