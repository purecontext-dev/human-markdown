import {
  editorStateOptionsCtx,
  editorViewCtx,
  parserCtx,
  prosePluginsCtx,
  schemaCtx,
} from '@milkdown/core'
import type { Ctx } from '@milkdown/ctx'
import { $prose } from '@milkdown/kit/utils'
import { closeHistory, history, redo, undo } from '@milkdown/prose/history'
import { keymap } from '@milkdown/prose/keymap'
import { Slice } from '@milkdown/prose/model'
import { EditorState, Plugin, PluginKey } from '@milkdown/prose/state'

export const historyKeymap = $prose((_ctx: Ctx) => {
  return keymap({
    'Mod-z': undo,
    'Mod-y': redo,
    'Mod-Shift-z': redo,
  })
})

export const historyPlugin = $prose((_ctx: Ctx) => {
  return history({ newGroupDelay: 500 })
})

const cursorBreakKey = new PluginKey('history-cursor-break')

export const historyCursorBreak = $prose((_ctx: Ctx) => {
  let idleTimer: ReturnType<typeof setTimeout> | null = null
  let closeTimer: ReturnType<typeof setTimeout> | null = null

  const closeSoon = (view: { state: EditorState; dispatch: (tr: EditorState['tr']) => void }) => {
    if (closeTimer) clearTimeout(closeTimer)
    closeTimer = setTimeout(() => {
      view.dispatch(closeHistory(view.state.tr))
    }, 0)
  }

  return new Plugin({
    key: cursorBreakKey,
    view(editorView) {
      return {
        update(view, prevState) {
          if (!view.state.doc.eq(prevState.doc)) {
            if (idleTimer) clearTimeout(idleTimer)
            idleTimer = setTimeout(() => {
              editorView.dispatch(closeHistory(editorView.state.tr))
            }, 600)
          }
        },
        destroy() {
          if (idleTimer) clearTimeout(idleTimer)
          if (closeTimer) clearTimeout(closeTimer)
        },
      }
    },
    props: {
      handleDOMEvents: {
        mousedown(view) {
          view.dispatch(closeHistory(view.state.tr))
          return false
        },
      },
      handleKeyDown(view, event) {
        if ((event.key === 'Backspace' || event.key === 'Delete') && !view.state.selection.empty) {
          view.dispatch(closeHistory(view.state.tr))
          closeSoon(view)
          return false
        }
        if (
          event.key === 'ArrowUp' ||
          event.key === 'ArrowDown' ||
          event.key === 'ArrowLeft' ||
          event.key === 'ArrowRight' ||
          event.key === 'Home' ||
          event.key === 'End' ||
          event.key === 'PageUp' ||
          event.key === 'PageDown'
        ) {
          view.dispatch(closeHistory(view.state.tr))
        }
        return false
      },
    },
  })
})

export function replaceAllNoHistory(markdown: string) {
  return (ctx: Ctx) => {
    const view = ctx.get(editorViewCtx)
    const doc = ctx.get(parserCtx)(markdown)
    if (!doc) return
    const { state } = view
    let tr = state.tr.replace(0, state.doc.content.size, new Slice(doc.content, 0, 0))
    tr.setMeta('addToHistory', false)
    tr = closeHistory(tr)
    view.dispatch(tr)
  }
}

export function executeUndo(ctx: Ctx) {
  const view = ctx.get(editorViewCtx)
  return undo(view.state, view.dispatch)
}

export function executeRedo(ctx: Ctx) {
  const view = ctx.get(editorViewCtx)
  return redo(view.state, view.dispatch)
}

// Full-document reloads from raw mode or disk should start a fresh undo stack.
// Using addToHistory=false alone can leave old edit groups mapped through the
// replacement, so production reload paths use this state reset instead.
export function replaceAllFlush(markdown: string) {
  return (ctx: Ctx) => {
    const view = ctx.get(editorViewCtx)
    const doc = ctx.get(parserCtx)(markdown)
    if (!doc) return
    const schema = ctx.get(schemaCtx)
    const newOptions = ctx.get(editorStateOptionsCtx)({
      schema,
      doc,
      plugins: ctx.get(prosePluginsCtx),
    })
    view.updateState(EditorState.create(newOptions))
  }
}
