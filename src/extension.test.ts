import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

vi.mock('vscode', () => ({
  window: {
    tabGroups: { all: [] as unknown[] },
    showInformationMessage: vi.fn(),
  },
  commands: {
    executeCommand: vi.fn(),
  },
  TabInputText: class TabInputText {
    uri: unknown
    constructor(uri: unknown) {
      this.uri = uri
    }
  },
}))

import * as vscode from 'vscode'
import { offerReopenMarkdownFiles } from './extension'

function createMockContext(state: Record<string, unknown> = {}) {
  const store = new Map(Object.entries(state))
  return {
    globalState: {
      get: <T>(key: string) => store.get(key) as T | undefined,
      update: vi.fn((key: string, value: unknown) => {
        store.set(key, value)
        return Promise.resolve()
      }),
    },
    extension: { packageJSON: { version: '0.3.0' } },
  } as unknown as vscode.ExtensionContext
}

function setTabs(tabs: unknown[]) {
  ;(vscode.window as unknown as { tabGroups: { all: unknown[] } }).tabGroups.all = [{ tabs }]
}

describe('offerReopenMarkdownFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(vscode.window as unknown as { tabGroups: { all: unknown[] } }).tabGroups.all = []
  })

  it('skips when hasOfferedReopen is already set', () => {
    const ctx = createMockContext({ hasOfferedReopen: true })
    offerReopenMarkdownFiles(ctx)
    expect(ctx.globalState.update).not.toHaveBeenCalled()
    expect(vscode.window.showInformationMessage).not.toHaveBeenCalled()
  })

  it('skips for existing user upgrading (installedVersion already set)', () => {
    const ctx = createMockContext({ installedVersion: '0.2.0' })
    offerReopenMarkdownFiles(ctx)
    expect(ctx.globalState.update).toHaveBeenCalledWith('hasOfferedReopen', true)
    expect(ctx.globalState.update).toHaveBeenCalledWith('installedVersion', '0.3.0')
    expect(vscode.window.showInformationMessage).not.toHaveBeenCalled()
  })

  it('sets flag silently when no markdown tabs are open', () => {
    const ctx = createMockContext({})
    setTabs([])
    offerReopenMarkdownFiles(ctx)
    expect(ctx.globalState.update).toHaveBeenCalledWith('hasOfferedReopen', true)
    expect(vscode.window.showInformationMessage).not.toHaveBeenCalled()
  })

  it('shows notification when markdown tabs are open on fresh install', () => {
    const ctx = createMockContext({})
    const uri = { path: '/workspace/README.md' }
    setTabs([{ input: new vscode.TabInputText(uri as unknown as vscode.Uri) }])
    ;(vscode.window.showInformationMessage as Mock).mockResolvedValue('No')
    offerReopenMarkdownFiles(ctx)
    expect(ctx.globalState.update).toHaveBeenCalledWith('hasOfferedReopen', true)
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      'Human Markdown can render your open markdown files as rich WYSIWYG. Open them now?',
      'Yes',
      'No',
    )
  })

  it('reopens files when user clicks Yes', async () => {
    const ctx = createMockContext({})
    const uri = { path: '/workspace/notes.md' }
    setTabs([{ input: new vscode.TabInputText(uri as unknown as vscode.Uri) }])
    ;(vscode.window.showInformationMessage as Mock).mockResolvedValue('Yes')
    offerReopenMarkdownFiles(ctx)
    await vi.waitFor(() => {
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'vscode.openWith',
        uri,
        'humanMarkdown.preview',
      )
    })
  })
})
