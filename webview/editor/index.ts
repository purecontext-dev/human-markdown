import {
  Editor,
  defaultValueCtx,
  remarkCtx,
  remarkStringifyOptionsCtx,
  rootCtx,
} from '@milkdown/core'
import { listener, listenerCtx } from '@milkdown/plugin-listener'
import { commonmark } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'
import { patchRemarkForTightLists } from '../shared/remark-tight-lists'

declare global {
  interface Window {
    __INITIAL_CONTENT__: string
  }
}

async function initEditor() {
  const root = document.getElementById('editor')
  if (!root) return

  const content = window.__INITIAL_CONTENT__ ?? '# Hello\n\nStart editing...'

  const editor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, content)
      ctx.set(remarkStringifyOptionsCtx, {
        bullet: '-',
        rule: '-',
      })
      ctx.get(listenerCtx).markdownUpdated((_ctx, markdown, _prev) => {
        console.log('[human-markdown] content updated, length:', markdown.length)
      })
    })
    .use(commonmark)
    .use(gfm)
    .use(listener)
    .create()

  editor.action((ctx) => {
    patchRemarkForTightLists(ctx.get(remarkCtx))
  })
}

initEditor()
