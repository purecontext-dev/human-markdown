import type { Ctx } from '@milkdown/ctx'
import { $prose } from '@milkdown/kit/utils'
import { linkSchema } from '@milkdown/preset-commonmark'
import { Plugin, PluginKey, Selection } from '@milkdown/prose/state'
import type { EditorView } from '@milkdown/prose/view'
import { URL_PATTERN } from './link-input-rule'

const keyboardNavKey = new PluginKey('keyboard-nav')

// A URL anchored to the END of a string — the space input rule links the URL the
// user just finished typing; Enter should do the same. Built from the shared
// URL_PATTERN so both triggers agree on what a URL is.
const URL_AT_LINE_END = new RegExp(`(${URL_PATTERN})$`)

export const keyboardNavPlugin = $prose((ctx: Ctx) => {
  return new Plugin({
    key: keyboardNavKey,
    props: {
      handleKeyDown(view: EditorView, event: KeyboardEvent) {
        if (event.key === 'Escape') {
          return handleEscape(view)
        }
        if (event.key === 'Tab') {
          const moved = event.shiftKey ? moveToPreviousBlock(view) : moveToNextBlock(view)
          if (moved) event.preventDefault()
          return moved
        }
        // Plain Enter (no modifiers) auto-links a URL the cursor sits at the end
        // of, mirroring the space-triggered input rule. We add the mark and
        // return false so ProseMirror's normal Enter still splits the block — the
        // newline is the separator, so (unlike the space rule) no space is added.
        if (
          event.key === 'Enter' &&
          !event.shiftKey &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey
        ) {
          linkUrlBeforeCursor(ctx, view)
          return false
        }
        return false
      },
    },
  })
})

/**
 * If the cursor sits at the end of a bare URL within the current textblock, wrap
 * that URL in a `link` mark. Mirrors the space-triggered input rule
 * (link-input-rule.ts) for the Enter case, which input rules cannot handle: a
 * newline trigger in an input rule swallows the block split. Dispatches the mark
 * but does not consume the Enter — the caller returns false so the split runs.
 *
 * No-op (and dispatches nothing) when the selection is not collapsed, the text
 * before the cursor does not end in a URL, or that URL already carries a link
 * mark (typed-then-edited URLs, or URLs from the source).
 */
function linkUrlBeforeCursor(ctx: Ctx, view: EditorView): void {
  const { state } = view
  const { empty, $from } = state.selection
  if (!empty) return

  // Text from the start of the current textblock up to the cursor. textBetween
  // with a block separator keeps offsets aligned to a single textblock; the
  // cursor is at $from.pos, and $from.start() is the block's content start.
  const blockStart = $from.start()
  const textBefore = state.doc.textBetween(blockStart, $from.pos, '\n', '\n')
  const match = URL_AT_LINE_END.exec(textBefore)
  if (!match) return

  const url = match[1]
  const urlStart = $from.pos - url.length
  const linkType = linkSchema.type(ctx)

  // Skip if the URL already carries a link mark (e.g. it was linked by the space
  // rule, edited, or loaded from source as an explicit link) — re-marking would
  // be redundant and could stack a stale href.
  if (state.doc.rangeHasMark(urlStart, $from.pos, linkType)) return

  view.dispatch(state.tr.addMark(urlStart, $from.pos, linkType.create({ href: url })))
}

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
