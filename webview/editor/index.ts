import type { EditorView } from '@codemirror/view'
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
import { createCodeMirrorEditor } from './codemirror-editor'
import {
  frontmatterNodeSchema,
  frontmatterView,
  initFrontmatterState,
  remarkFrontmatterPlugin,
} from './frontmatter-plugin'
import { keyboardNavPlugin } from './keyboard-nav'
import { injectEditorStyles } from './styles'
import { taskListTogglePlugin } from './task-list-toggle'

interface VsCodeApi {
  postMessage(message: unknown): void
  getState(): WebviewState | undefined
  setState(state: WebviewState): void
}

interface WebviewState {
  scrollTop: number
  mode: 'preview' | 'raw'
  frontmatterCollapsed?: boolean
}

declare function acquireVsCodeApi(): VsCodeApi

type ExtensionMessage =
  | { type: 'update'; content: string }
  | { type: 'restore-state'; state: WebviewState }
  | { type: 'theme'; tokens: ThemeTokens }
  | { type: 'toggle-mode' }
  | { type: 'set-mode'; mode: 'preview' | 'raw' }

const vscode = acquireVsCodeApi()

let milkdownEditor: Editor | null = null
let cmEditor: EditorView | null = null
let currentContent = ''
let suppressMilkdownUpdate = false
let suppressCmUpdate = false
let syncingContent = true
let currentMode: 'preview' | 'raw' = 'preview'

const previewContainer = document.getElementById('preview-container') as HTMLElement
const cmContainer = document.getElementById('codemirror-container') as HTMLElement
const previewBtn = document.querySelector<HTMLButtonElement>(
  '.mode-btn[data-mode="preview"]',
) as HTMLButtonElement
const rawBtn = document.querySelector<HTMLButtonElement>(
  '.mode-btn[data-mode="raw"]',
) as HTMLButtonElement

injectEditorStyles()

const savedState = vscode.getState()
initFrontmatterState((isCollapsed) => {
  const state = vscode.getState() ?? { scrollTop: 0, mode: 'preview' as const }
  vscode.setState({ ...state, frontmatterCollapsed: isCollapsed })
}, savedState?.frontmatterCollapsed ?? false)

function setMode(mode: 'preview' | 'raw') {
  currentMode = mode

  if (mode === 'preview') {
    previewContainer.classList.remove('hidden')
    cmContainer.classList.remove('active')
    previewBtn.classList.add('active')
    rawBtn.classList.remove('active')

    if (milkdownEditor && cmEditor) {
      const cmContent = cmEditor.state.doc.toString()
      if (cmContent !== currentContent) {
        currentContent = cmContent
        suppressMilkdownUpdate = true
        try {
          milkdownEditor.action(replaceAll(cmContent))
        } catch {
          // ignore
        }
        suppressMilkdownUpdate = false
      }
    }
  } else {
    previewContainer.classList.add('hidden')
    cmContainer.classList.add('active')
    previewBtn.classList.remove('active')
    rawBtn.classList.add('active')

    if (!cmEditor) {
      cmEditor = createCodeMirrorEditor(cmContainer, currentContent, (content) => {
        if (suppressCmUpdate) return
        currentContent = content
        vscode.postMessage({ type: 'edit', content })
      })
    } else {
      const cmContent = cmEditor.state.doc.toString()
      if (cmContent !== currentContent) {
        suppressCmUpdate = true
        cmEditor.dispatch({
          changes: { from: 0, to: cmContent.length, insert: currentContent },
        })
        suppressCmUpdate = false
      }
      cmEditor.requestMeasure()
    }

    cmEditor.focus()
  }

  saveScrollState()
}

function toggleMode() {
  setMode(currentMode === 'preview' ? 'raw' : 'preview')
}

previewBtn.addEventListener('click', () => setMode('preview'))
rawBtn.addEventListener('click', () => setMode('raw'))

previewContainer.addEventListener(
  'mousedown',
  (e) => {
    if (!e.metaKey && !e.ctrlKey) return
    const anchor = (e.target as HTMLElement).closest('a')
    if (!anchor?.getAttribute('href')) return
    e.preventDefault()
    e.stopPropagation()
  },
  true,
)

previewContainer.addEventListener(
  'click',
  (e) => {
    if (!e.metaKey && !e.ctrlKey) return
    const anchor = (e.target as HTMLElement).closest('a')
    const rawHref = anchor?.getAttribute('href')
    if (!rawHref) return
    e.preventDefault()
    e.stopPropagation()
    vscode.postMessage({ type: 'open-link', href: rawHref })
  },
  true,
)

async function initMilkdown(content: string) {
  const root = document.getElementById('editor')
  if (!root) return

  currentContent = content

  try {
    milkdownEditor = await Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root)
        ctx.set(defaultValueCtx, content)
        ctx.set(remarkStringifyOptionsCtx, {
          bullet: '-',
          rule: '-',
        })
        ctx.get(listenerCtx).markdownUpdated((_ctx, markdown, _prev) => {
          currentContent = markdown
          if (suppressMilkdownUpdate || syncingContent) return
          vscode.postMessage({ type: 'edit', content: markdown })
        })
      })
      .use(commonmark)
      .use(gfm)
      .use(remarkFrontmatterPlugin)
      .use(frontmatterNodeSchema)
      .use(frontmatterView)
      .use(listener)
      .use(codeBlockView)
      .use(keyboardNavPlugin)
      .use(taskListTogglePlugin)
      .create()

    milkdownEditor.action((ctx) => {
      patchRemarkForTightLists(ctx.get(remarkCtx))
    })
  } catch (err) {
    milkdownEditor = null
    renderFallback(root, content, err)
  }

  requestAnimationFrame(() => {
    syncingContent = false
  })
}

function updateContent(content: string) {
  if (content === currentContent) return
  currentContent = content

  if (milkdownEditor) {
    syncingContent = true
    suppressMilkdownUpdate = true
    try {
      milkdownEditor.action(replaceAll(content))
    } catch (err) {
      const root = document.getElementById('editor')
      if (root) renderFallback(root, content, err)
    }
    suppressMilkdownUpdate = false
    requestAnimationFrame(() => {
      syncingContent = false
    })
  }

  if (cmEditor && currentMode === 'raw') {
    const cmContent = cmEditor.state.doc.toString()
    if (cmContent !== content) {
      suppressCmUpdate = true
      cmEditor.dispatch({
        changes: { from: 0, to: cmContent.length, insert: content },
      })
      suppressCmUpdate = false
    }
  }
}

function renderFallback(root: HTMLElement, content: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err)
  root.innerHTML = ''

  const banner = document.createElement('div')
  banner.className = 'error-banner'
  banner.textContent = `Editor error: ${message}`
  root.appendChild(banner)

  const pre = document.createElement('pre')
  pre.className = 'fallback-raw'
  const code = document.createElement('code')
  code.textContent = content
  pre.appendChild(code)
  root.appendChild(pre)
}

let scrollTimer: ReturnType<typeof setTimeout> | null = null

function saveScrollState() {
  if (scrollTimer) clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => {
    const state: WebviewState = { scrollTop: document.documentElement.scrollTop, mode: currentMode }
    vscode.setState(state)
    vscode.postMessage({ type: 'save-state', state })
  }, 150)
}

window.addEventListener('message', (event) => {
  const msg: ExtensionMessage = event.data
  switch (msg.type) {
    case 'update':
      if (milkdownEditor) {
        updateContent(msg.content)
      } else {
        initMilkdown(msg.content)
      }
      break
    case 'restore-state':
      document.documentElement.scrollTop = msg.state.scrollTop
      if (msg.state.mode) {
        setMode(msg.state.mode)
      }
      break
    case 'theme':
      applyTheme(msg.tokens, document.documentElement)
      window.dispatchEvent(new Event('theme-changed'))
      break
    case 'toggle-mode':
      toggleMode()
      break
    case 'set-mode':
      setMode(msg.mode)
      break
  }
})

window.addEventListener('scroll', () => saveScrollState(), { passive: true })

vscode.postMessage({ type: 'ready' })
