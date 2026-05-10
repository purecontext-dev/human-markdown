import type { Ctx } from '@milkdown/ctx'
import { $prose } from '@milkdown/kit/utils'
import { Plugin, PluginKey, Selection } from '@milkdown/prose/state'
import type { EditorView } from '@milkdown/prose/view'

const keyboardNavKey = new PluginKey('keyboard-nav')

export const keyboardNavPlugin = $prose((_ctx: Ctx) => {
  return new Plugin({
    key: keyboardNavKey,
    props: {
      handleKeyDown(view: EditorView, event: KeyboardEvent) {
        if (event.key === 'Escape') {
          return handleEscape(view)
        }
        if (event.key === 'Tab') {
          event.preventDefault()
          if (event.shiftKey) {
            return moveToPreviousBlock(view)
          }
          return moveToNextBlock(view)
        }
        return false
      },
    },
  })
})

function handleEscape(view: EditorView): boolean {
  const { state } = view
  const { $from } = state.selection

  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth)
    if (node.type.name === 'code_block') {
      const after = $from.after(depth)
      if (after <= state.doc.content.size) {
        view.dispatch(state.tr.setSelection(Selection.near(state.doc.resolve(after))))
        view.focus()
        return true
      }
    }
  }

  view.dom.blur()
  return true
}

function moveToNextBlock(view: EditorView): boolean {
  const { state } = view
  const { $from } = state.selection

  const parentDepth = Math.max(1, $from.depth > 1 ? 1 : $from.depth)
  const after = $from.after(parentDepth)

  if (after < state.doc.content.size) {
    const $pos = state.doc.resolve(after)
    view.dispatch(state.tr.setSelection(Selection.near($pos)))
    view.focus()
    return true
  }

  return false
}

function moveToPreviousBlock(view: EditorView): boolean {
  const { state } = view
  const { $from } = state.selection

  const parentDepth = Math.max(1, $from.depth > 1 ? 1 : $from.depth)
  const before = $from.before(parentDepth)

  if (before > 0) {
    const $pos = state.doc.resolve(before)
    view.dispatch(state.tr.setSelection(Selection.near($pos, -1)))
    view.focus()
    return true
  }

  return false
}
