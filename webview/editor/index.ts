import { Transaction } from '@codemirror/state'
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
import { CmSearchBackend, createCodeMirrorEditor } from './codemirror-editor'
import { ConflictBar } from './conflict-bar'
import { DomSearchBackend, FindBar } from './find-bar'
import {
  frontmatterNodeSchema,
  frontmatterView,
  initFrontmatterState,
  remarkFrontmatterPlugin,
} from './frontmatter-plugin'
import {
  githubAlertSchema,
  githubAlertView,
  patchRemarkForGithubAlerts,
  remarkGithubAlertsPlugin,
} from './github-alert-plugin'
import { createImageView } from './image-view'
import { keyboardNavPlugin } from './keyboard-nav'
import { mathDisplaySchema, mathInlineSchema, remarkMathPlugin } from './math-plugin'
import { mathDisplayView, mathInlineView } from './math-view'
import { minimalChange } from './minimal-change'
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
  | { type: 'merge-update'; content: string }
  | { type: 'external-change' }
  | { type: 'restore-state'; state: WebviewState }
  | { type: 'theme'; tokens: ThemeTokens }
  | { type: 'toggle-mode' }
  | { type: 'set-mode'; mode: 'preview' | 'raw' }
  | { type: 'show-find' }
  | { type: 'image-uri-resolved'; src: string; webviewUri: string }
  | { type: 'save-success' }
  | { type: 'save-failed' }

const vscode = acquireVsCodeApi()

let milkdownEditor: Editor | null = null
let cmEditor: EditorView | null = null
let currentContent = ''
let suppressMilkdownUpdate = false
let suppressCmUpdate = false
let syncingContent = true
let currentMode: 'preview' | 'raw' = 'preview'
let webviewDirty = false
let pendingSaveContent: string | null = null

const previewContainer = document.getElementById('preview-container') as HTMLElement
const cmContainer = document.getElementById('codemirror-container') as HTMLElement
const previewBtn = document.querySelector<HTMLButtonElement>(
  '.mode-btn[data-mode="preview"]',
) as HTMLButtonElement
const rawBtn = document.querySelector<HTMLButtonElement>(
  '.mode-btn[data-mode="raw"]',
) as HTMLButtonElement

const domBackend = new DomSearchBackend(() => previewContainer)
const cmBackend = new CmSearchBackend(() => cmEditor)

const findBar = new FindBar(document.body, () => {
  return currentMode === 'preview' ? domBackend : cmBackend
})

function setDirty(dirty: boolean) {
  if (dirty === webviewDirty) return
  webviewDirty = dirty
  vscode.postMessage({ type: 'dirty-state', isDirty: dirty })
}

const conflictBar = new ConflictBar(
  document.body,
  () => {
    vscode.postMessage({ type: 'accept-external' })
  },
  () => {
    vscode.postMessage({ type: 'keep-mine', content: currentContent })
    setDirty(false)
  },
)

const pendingImageResolves = new Map<string, Array<(uri: string) => void>>()

function resolveImageUri(src: string): Promise<string> {
  return new Promise((resolve) => {
    const pending = pendingImageResolves.get(src)
    if (pending) {
      pending.push(resolve)
      return
    }
    pendingImageResolves.set(src, [resolve])
    vscode.postMessage({ type: 'resolve-image-uri', src })
  })
}

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
      currentContent = cmContent
      syncingContent = true
      suppressMilkdownUpdate = true
      try {
        milkdownEditor.action(replaceAll(cmContent))
      } catch {
        // ignore
      }
      suppressMilkdownUpdate = false
      requestAnimationFrame(() => {
        syncingContent = false
      })
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
        setDirty(true)
        vscode.postMessage({ type: 'edit', content })
      })
    } else {
      const cmContent = cmEditor.state.doc.toString()
      const change = minimalChange(cmContent, currentContent)
      if (change) {
        suppressCmUpdate = true
        cmEditor.dispatch({
          changes: change,
          annotations: Transaction.addToHistory.of(false),
        })
        suppressCmUpdate = false
      }
      cmEditor.requestMeasure()
    }

    cmEditor.focus()
  }

  saveScrollState()
  findBar.refresh()
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
          if (suppressMilkdownUpdate || syncingContent) return
          currentContent = markdown
          setDirty(true)
          vscode.postMessage({ type: 'edit', content: markdown })
        })
      })
      .use(commonmark)
      .use(gfm)
      .use(remarkFrontmatterPlugin)
      .use(frontmatterNodeSchema)
      .use(frontmatterView)
      .use(remarkGithubAlertsPlugin)
      .use(githubAlertSchema)
      .use(githubAlertView)
      .use(remarkMathPlugin)
      .use(mathDisplaySchema)
      .use(mathInlineSchema)
      .use(mathDisplayView)
      .use(mathInlineView)
      .use(listener)
      .use(codeBlockView)
      .use(createImageView(resolveImageUri))
      .use(keyboardNavPlugin)
      .use(taskListTogglePlugin)
      .create()

    milkdownEditor.action((ctx) => {
      const remark = ctx.get(remarkCtx)
      patchRemarkForTightLists(remark)
      patchRemarkForGithubAlerts(remark)
    })
  } catch (err) {
    milkdownEditor = null
    renderFallback(root, content, err)
  }

  requestAnimationFrame(() => {
    syncingContent = false
  })
}

function updateContent(content: string, opts?: { keepDirty?: boolean }) {
  if (content === currentContent) return
  currentContent = content

  if (milkdownEditor) {
    syncingContent = true
    suppressMilkdownUpdate = true
    try {
      milkdownEditor.action(replaceAll(content, true))
    } catch (err) {
      const root = document.getElementById('editor')
      if (root) renderFallback(root, content, err)
    }
    suppressMilkdownUpdate = false
    requestAnimationFrame(() => {
      syncingContent = false
    })
  }

  if (cmEditor) {
    const cmContent = cmEditor.state.doc.toString()
    const change = minimalChange(cmContent, content)
    if (change) {
      suppressCmUpdate = true
      cmEditor.dispatch({
        changes: change,
        annotations: Transaction.addToHistory.of(false),
      })
      suppressCmUpdate = false
    }
  }

  if (!opts?.keepDirty) {
    setDirty(false)
    conflictBar.hide()
  }
  findBar.refresh()
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

function showSaveError() {
  const existing = document.querySelector('.save-error')
  if (existing) existing.remove()

  const el = document.createElement('div')
  el.className = 'save-error'
  el.textContent = 'Save failed'
  document.getElementById('toolbar')?.appendChild(el)

  setTimeout(() => el.remove(), 3000)
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
    case 'merge-update':
      updateContent(msg.content, { keepDirty: true })
      break
    case 'external-change':
      conflictBar.show()
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
    case 'show-find':
      findBar.show()
      break
    case 'image-uri-resolved': {
      const callbacks = pendingImageResolves.get(msg.src)
      if (callbacks) {
        for (const cb of callbacks) cb(msg.webviewUri)
        pendingImageResolves.delete(msg.src)
      }
      break
    }
    case 'save-success': {
      if (pendingSaveContent !== null && currentContent === pendingSaveContent) {
        setDirty(false)
        conflictBar.hide()
      }
      pendingSaveContent = null
      break
    }
    case 'save-failed': {
      pendingSaveContent = null
      showSaveError()
      break
    }
  }
})

window.addEventListener('scroll', () => saveScrollState(), { passive: true })

document.addEventListener(
  'keydown',
  (e) => {
    if (!(e.metaKey || e.ctrlKey)) return
    if (e.key === 'f') {
      e.preventDefault()
      findBar.show()
    } else if (e.key === 'g' && findBar.isVisible) {
      e.preventDefault()
      if (e.shiftKey) findBar.prev()
      else findBar.next()
    } else if (e.key === 's') {
      e.preventDefault()
      pendingSaveContent = currentContent
      vscode.postMessage({ type: 'save', content: currentContent })
    }
  },
  true,
)

vscode.postMessage({ type: 'ready' })
