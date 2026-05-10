import {
  Editor,
  defaultValueCtx,
  remarkCtx,
  remarkStringifyOptionsCtx,
  rootCtx,
} from '@milkdown/core'
import { replaceAll } from '@milkdown/kit/utils'
import { listener, listenerCtx } from '@milkdown/plugin-listener'
import { commonmark } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'
import { patchRemarkForTightLists } from '../shared/remark-tight-lists'
import type { ThemeTokens } from '../shared/theme/tokens'
import { applyTheme } from '../shared/theme/tokens'
import { codeBlockView } from './code-block-view'
import { keyboardNavPlugin } from './keyboard-nav'
import { injectEditorStyles } from './styles'

interface VsCodeApi {
  postMessage(message: unknown): void
  getState(): WebviewState | undefined
  setState(state: WebviewState): void
}

interface WebviewState {
  scrollTop: number
}

declare function acquireVsCodeApi(): VsCodeApi

type ExtensionMessage =
  | { type: 'update'; content: string }
  | { type: 'restore-state'; state: WebviewState }
  | { type: 'theme'; tokens: ThemeTokens }

const vscode = acquireVsCodeApi()

let editor: Editor | null = null
let currentContent = ''
let suppressUpdate = false

injectEditorStyles()

async function initEditor(content: string) {
  const root = document.getElementById('editor')
  if (!root) return

  currentContent = content

  editor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, content)
      ctx.set(remarkStringifyOptionsCtx, {
        bullet: '-',
        rule: '-',
      })
      ctx.get(listenerCtx).markdownUpdated((_ctx, markdown, _prev) => {
        if (suppressUpdate) return
        currentContent = markdown
        vscode.postMessage({ type: 'edit', content: markdown })
      })
    })
    .use(commonmark)
    .use(gfm)
    .use(listener)
    .use(codeBlockView)
    .use(keyboardNavPlugin)
    .create()

  editor.action((ctx) => {
    patchRemarkForTightLists(ctx.get(remarkCtx))
  })
}

function updateContent(content: string) {
  if (!editor || content === currentContent) return

  currentContent = content
  suppressUpdate = true
  editor.action(replaceAll(content))
  suppressUpdate = false
}

let scrollTimer: ReturnType<typeof setTimeout> | null = null

function saveScrollState() {
  if (scrollTimer) clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => {
    const state: WebviewState = { scrollTop: document.documentElement.scrollTop }
    vscode.setState(state)
    vscode.postMessage({ type: 'save-state', state })
  }, 150)
}

window.addEventListener('message', (event) => {
  const msg: ExtensionMessage = event.data
  switch (msg.type) {
    case 'update':
      if (editor) {
        updateContent(msg.content)
      } else {
        initEditor(msg.content)
      }
      break
    case 'restore-state':
      document.documentElement.scrollTop = msg.state.scrollTop
      break
    case 'theme':
      applyTheme(msg.tokens, document.documentElement)
      break
  }
})

window.addEventListener('scroll', () => saveScrollState(), { passive: true })

vscode.postMessage({ type: 'ready' })
