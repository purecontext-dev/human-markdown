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
import { commonmark, remarkPreserveEmptyLinePlugin } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'
import { patchRemarkForTightLists } from '../shared/remark-tight-lists'
import type { ThemeTokens } from '../shared/theme/tokens'
import { applyTheme } from '../shared/theme/tokens'
import { bareUrlParsePlugin, bareUrlStringifyPlugin } from './bare-url-plugin'
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
import { linkInputRule } from './link-input-rule'
import { mathDisplaySchema, mathInlineSchema, remarkMathPlugin } from './math-plugin'
import { mathDisplayView, mathInlineView } from './math-view'
import { minimalChange } from './minimal-change'
import { nonInclusiveLinkSchema } from './non-inclusive-link'
import {
  normalizeSerializedMarkdown,
  resolveWysiwygContent,
  serializeWysiwygDoc,
} from './resolve-content'
import { SaveController } from './save-controller'
import type { SourceMap } from './source-splice'
import { buildSourceMap } from './source-splice'
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
  | { type: 'auto-save'; enabled: boolean }

const vscode = acquireVsCodeApi()

let milkdownEditor: Editor | null = null
let cmEditor: EditorView | null = null
let currentContent = ''
let suppressMilkdownUpdate = false
let suppressCmUpdate = false
let syncingContent = true
let currentMode: 'preview' | 'raw' = 'preview'
let webviewDirty = false
let initInProgress = false
let pendingContent: string | null = null
// Serialization of the doc as last loaded from disk. Lets the content resolver
// distinguish a genuine WYSIWYG edit (serialize live) from an unedited doc
// (return faithful disk bytes), avoiding round-trip drift. See resolve-content.ts.
let baselineSerialized: string | null = null
let sourceMap: SourceMap | null = null

const previewContainer = document.getElementById('preview-container') as HTMLElement
const cmContainer = document.getElementById('codemirror-container') as HTMLElement
const modeToggleBtn = document.getElementById('mode-toggle-btn') as HTMLButtonElement
const autosaveCheckbox = document.getElementById('autosave-checkbox') as HTMLInputElement

autosaveCheckbox.addEventListener('change', () => {
  saveController.setAutoSave(autosaveCheckbox.checked)
  vscode.postMessage({ type: 'auto-save-changed', enabled: autosaveCheckbox.checked })
})

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
    modeToggleBtn.textContent = 'View Source'
    modeToggleBtn.dataset.mode = 'preview'

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
      syncingContent = false
      // Re-anchor the drift baseline to the content just loaded from raw. Without
      // this, raw text that the serializer would normalize (e.g. `http://` ->
      // `http\://`) is seen as an edit on the next toggle and drifts, even though
      // the user never edited in rich text. With it, an untouched round-trip
      // (raw -> rich text -> raw) returns the faithful raw `currentContent`.
      baselineSerialized = serializeWysiwygDoc(milkdownEditor)
      sourceMap = baselineSerialized ? buildSourceMap(cmContent, baselineSerialized) : null
    }
  } else {
    previewContainer.classList.add('hidden')
    cmContainer.classList.add('active')
    modeToggleBtn.textContent = 'View Rendered'
    modeToggleBtn.dataset.mode = 'raw'

    // Leaving WYSIWYG: the live Milkdown doc is authoritative. Read it directly
    // rather than trusting the debounced `currentContent` cache, which lags after
    // a recent edit and would otherwise show stale source in raw mode.
    currentContent = resolveWysiwygContent(
      milkdownEditor,
      currentContent,
      baselineSerialized,
      sourceMap,
    )

    if (!cmEditor) {
      cmEditor = createCodeMirrorEditor(cmContainer, currentContent, (content) => {
        if (suppressCmUpdate) return
        currentContent = content
        setDirty(true)
        vscode.postMessage({ type: 'edit', content })
        saveController.scheduleAutoSave()
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

modeToggleBtn.addEventListener('click', toggleMode)

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

  if (initInProgress) {
    pendingContent = content
    return
  }
  initInProgress = true
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
        ctx.get(listenerCtx).markdownUpdated((_ctx, rawMarkdown, _prev) => {
          if (suppressMilkdownUpdate || syncingContent) return
          // Normalize so the saved bytes match the toggle/save serialization and
          // the dirty-detection baseline (all go through normalizeSerializedMarkdown).
          const markdown = normalizeSerializedMarkdown(rawMarkdown)
          // The markdownUpdated listener is debounced (200ms in plugin-listener),
          // so it outlives the synchronous suppress flags and fires for the echo
          // of a programmatic load (replaceAll at raw->preview or external update).
          // That echo is the *serialized* form, which can differ from the faithful
          // raw bytes (e.g. `http://` -> `http\://`). If the update equals the load
          // baseline, it is that echo, not a user edit — ignore it so currentContent
          // keeps the faithful raw text and the doc is not falsely marked dirty.
          if (markdown === baselineSerialized) return
          currentContent = markdown
          setDirty(true)
          vscode.postMessage({ type: 'edit', content: markdown })
          saveController.scheduleAutoSave()
        })
      })
      .use(commonmark)
      .use(gfm)
      // Override the link mark to be non-inclusive (after commonmark registers it)
      // so the cursor at a link's end is outside it and a typed space is plain text.
      .use(nonInclusiveLinkSchema)
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
      .use(bareUrlParsePlugin)
      .use(bareUrlStringifyPlugin)
      .use(linkInputRule)
      .create()

    // Remove Milkdown's "preserve empty line" plugin (bundled in `commonmark`).
    // Its paragraph serializer encodes every empty paragraph as a literal
    // `<br />` so deliberate blank lines survive markdown's blank-line collapsing.
    // In this markdown-first editor that is wrong: pressing Enter to make a blank
    // line creates a clean empty paragraph (verified in the live doc) which then
    // serialized to `<br />` on disk — the reported "Enter inserts a hardbreak"
    // bug. With the plugin gone, an empty paragraph serializes as a real blank
    // line (standard markdown: a run of consecutive blanks collapses to one on
    // round-trip). Removed after create (status is Created, so no "removing
    // during creation" warning); this tears down the plugin's ctx slice, which
    // is exactly what the paragraph serializer checks before emitting `<br />`.
    await milkdownEditor.remove(remarkPreserveEmptyLinePlugin)

    milkdownEditor.action((ctx) => {
      const remark = ctx.get(remarkCtx)
      patchRemarkForTightLists(remark)
      patchRemarkForGithubAlerts(remark)
    })
    baselineSerialized = serializeWysiwygDoc(milkdownEditor)
    sourceMap = baselineSerialized ? buildSourceMap(content, baselineSerialized) : null
  } catch (err) {
    milkdownEditor = null
    renderFallback(root, content, err)
  }

  requestAnimationFrame(() => {
    syncingContent = false
  })

  initInProgress = false
  if (pendingContent !== null) {
    const deferred = pendingContent
    pendingContent = null
    updateContent(deferred)
  }
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
    syncingContent = false
    // New authoritative load: re-anchor the drift baseline to the freshly
    // loaded doc so an unedited toggle/save after an external change returns the
    // new disk bytes verbatim rather than a re-serialized (drifted) version.
    baselineSerialized = serializeWysiwygDoc(milkdownEditor)
    sourceMap = baselineSerialized ? buildSourceMap(content, baselineSerialized) : null
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

// In preview mode the live Milkdown doc is authoritative; resolve it directly so
// a save fired within the listener's debounce window persists the latest edit
// rather than the stale cache. In raw mode CodeMirror keeps `currentContent` live.
function getAuthoritativeContent(): string {
  if (currentMode === 'preview') {
    currentContent = resolveWysiwygContent(
      milkdownEditor,
      currentContent,
      baselineSerialized,
      sourceMap,
    )
  }
  return currentContent
}

const saveController = new SaveController({
  getCurrentContent: getAuthoritativeContent,
  setDirty,
  postMessage: (msg) => vscode.postMessage(msg),
  hideConflict: () => conflictBar.hide(),
  showError: showSaveError,
})

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
    case 'save-success':
      saveController.handleSuccess()
      break
    case 'save-failed':
      saveController.handleFailure()
      break
    case 'auto-save':
      autosaveCheckbox.checked = msg.enabled
      saveController.setAutoSave(msg.enabled)
      break
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
      saveController.initiateSave()
    }
  },
  true,
)

vscode.postMessage({ type: 'ready' })
