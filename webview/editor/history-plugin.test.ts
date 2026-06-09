// @vitest-environment jsdom
import { defaultValueCtx, Editor, editorViewCtx, rootCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { TextSelection } from '@milkdown/prose/state'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { executeUndo, historyCursorBreak, historyPlugin, replaceAllFlush } from './history-plugin'
import { serializeWysiwygDoc } from './resolve-content'

let cleanup: (() => Promise<void>) | null = null

afterEach(async () => {
  if (cleanup) {
    await cleanup()
    cleanup = null
  }
  vi.useRealTimers()
})

async function makeEditor(markdown: string): Promise<Editor> {
  const root = document.createElement('div')
  document.body.appendChild(root)

  const editor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, markdown)
    })
    .use(commonmark)
    .use(historyPlugin)
    .use(historyCursorBreak)
    .create()

  cleanup = async () => {
    await editor.destroy()
    root.remove()
  }

  return editor
}

function selectAndDeleteText(editor: Editor, text: string): void {
  editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    let from = -1

    view.state.doc.descendants((node, pos) => {
      if (!node.isText || typeof node.text !== 'string' || from !== -1) return true
      const offset = node.text.indexOf(text)
      if (offset === -1) return true
      from = pos + offset
      return false
    })

    if (from === -1) throw new Error(`Could not find text: ${text}`)

    const to = from + text.length
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, from, to)))
    view.someProp('handleKeyDown', (handler) => {
      handler(view, new KeyboardEvent('keydown', { key: 'Backspace' }))
    })
    view.dispatch(view.state.tr.deleteSelection())
  })
}

function appendParagraph(editor: Editor, text: string): void {
  editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const { state } = view
    const paragraph = state.schema.nodes.paragraph.create(null, state.schema.text(text))
    view.dispatch(state.tr.insert(state.doc.content.size, paragraph))
  })
}

describe('history replacement helpers', () => {
  it('flushes stale undo entries when loading a new authoritative document', async () => {
    const editor = await makeEditor('Original\n')
    appendParagraph(editor, 'old WYSIWYG edit')

    editor.action(replaceAllFlush('New raw baseline\n'))
    editor.action(executeUndo)

    expect(serializeWysiwygDoc(editor)).toBe('New raw baseline\n')
  })

  it('keeps undo working for edits made after a full document reload', async () => {
    const editor = await makeEditor('Original\n')
    appendParagraph(editor, 'old WYSIWYG edit')

    editor.action(replaceAllFlush('New raw baseline\n'))
    appendParagraph(editor, 'new WYSIWYG edit')
    editor.action(executeUndo)

    expect(serializeWysiwygDoc(editor)).toBe('New raw baseline\n')
  })

  it('undoes selected-text deletions one deletion at a time', async () => {
    vi.useFakeTimers()
    const editor = await makeEditor('First alpha.\n\nSecond beta.\n')

    selectAndDeleteText(editor, 'alpha')
    await vi.runOnlyPendingTimersAsync()
    selectAndDeleteText(editor, 'beta')
    await vi.runOnlyPendingTimersAsync()

    editor.action(executeUndo)
    expect(serializeWysiwygDoc(editor)).toBe('First .\n\nSecond beta.\n')

    editor.action(executeUndo)
    expect(serializeWysiwygDoc(editor)).toBe('First alpha.\n\nSecond beta.\n')
  })
})
