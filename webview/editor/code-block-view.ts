import type { Ctx } from '@milkdown/ctx'
import { $view } from '@milkdown/kit/utils'
import { codeBlockSchema } from '@milkdown/preset-commonmark'
import type { Node as ProsemirrorNode } from '@milkdown/prose/model'
import type { EditorView } from '@milkdown/prose/view'
import { sanitizeSvg } from './sanitize-svg'
import { observeBlock, unobserveBlock } from './viewport-observer'

interface ShikiHighlighter {
  codeToHtml(code: string, options: { lang: string; theme: string }): string
}

interface MermaidApi {
  initialize(config: Record<string, unknown>): void
  render(id: string, source: string): Promise<{ svg: string }>
}

let mermaidInitialized = false

export function getShikiHighlighter(): Promise<ShikiHighlighter> | null {
  const ready = (window as unknown as Record<string, unknown>).__shikiReady
  return ready as Promise<ShikiHighlighter> | null
}

function getMermaid(): MermaidApi | null {
  return (window as unknown as Record<string, unknown>).__mermaid as MermaidApi | null
}

async function renderMermaid(source: string, container: HTMLElement): Promise<void> {
  try {
    const mermaid = getMermaid()
    if (!mermaid) {
      container.textContent = 'Mermaid not available'
      container.classList.add('mermaid-error')
      return
    }

    if (!mermaidInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: detectTheme() === 'github-dark' ? 'dark' : 'default',
      })
      mermaidInitialized = true
    }

    const id = `mermaid-${crypto.randomUUID()}`
    const { svg } = await mermaid.render(id, source)
    container.innerHTML = sanitizeSvg(svg)
  } catch (err) {
    container.textContent = `Diagram error: ${err instanceof Error ? err.message : String(err)}`
    container.classList.add('mermaid-error')
  }
}

export function detectTheme(): 'github-light' | 'github-dark' {
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--hm-color-bg')
  if (!bg) return 'github-light'
  const trimmed = bg.trim()
  if (trimmed.startsWith('#')) {
    const r = Number.parseInt(trimmed.slice(1, 3), 16)
    return Number.isNaN(r) || r < 128 ? 'github-dark' : 'github-light'
  }
  return 'github-light'
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export const codeBlockView = $view(codeBlockSchema.node, (_ctx: Ctx) => {
  return (node: ProsemirrorNode, _view: EditorView, _getPos: () => number | undefined) => {
    const container = document.createElement('div')
    container.classList.add('code-block-view')

    const header = document.createElement('div')
    header.classList.add('code-header')
    container.appendChild(header)

    let resetTimer: ReturnType<typeof setTimeout> | null = null

    const copyBtn = document.createElement('button')
    copyBtn.classList.add('code-copy')
    copyBtn.title = 'Copy code'
    copyBtn.textContent = '⎘'
    copyBtn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const text = code.textContent ?? ''
      if (resetTimer) clearTimeout(resetTimer)
      navigator.clipboard.writeText(text).then(
        () => {
          copyBtn.textContent = '✓'
          copyBtn.classList.add('copied')
          copyBtn.classList.remove('copy-failed')
          resetTimer = setTimeout(() => {
            copyBtn.textContent = '⎘'
            copyBtn.classList.remove('copied')
            resetTimer = null
          }, 1500)
        },
        () => {
          copyBtn.textContent = '✗'
          copyBtn.classList.add('copy-failed')
          copyBtn.classList.remove('copied')
          resetTimer = setTimeout(() => {
            copyBtn.textContent = '⎘'
            copyBtn.classList.remove('copy-failed')
            resetTimer = null
          }, 1500)
        },
      )
    })
    header.appendChild(copyBtn)

    const langLabel = document.createElement('span')
    langLabel.classList.add('code-lang')
    header.appendChild(langLabel)

    const wrapBtn = document.createElement('button')
    wrapBtn.classList.add('code-wrap-toggle')
    wrapBtn.title = 'Toggle word wrap'
    wrapBtn.textContent = '↩'
    wrapBtn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      container.classList.toggle('word-wrap')
    })
    container.appendChild(wrapBtn)

    const pre = document.createElement('pre')
    const code = document.createElement('code')
    pre.appendChild(code)
    container.appendChild(pre)

    let currentLang = (node.attrs as Record<string, string>).language || ''
    langLabel.textContent = currentLang
    const isMermaid = currentLang === 'mermaid'
    if (isMermaid) container.classList.add('is-mermaid')

    let rendered: HTMLDivElement | null = null

    if (isMermaid) {
      rendered = document.createElement('div')
      rendered.classList.add('mermaid-rendered')
      container.insertBefore(rendered, pre)
    } else {
      rendered = document.createElement('div')
      rendered.classList.add('code-rendered')
      container.insertBefore(rendered, pre)
    }

    let lastText = node.textContent

    function updateRendered(text?: string) {
      const content = text ?? code.textContent ?? lastText
      if (!rendered) return
      if (!content) {
        rendered.textContent = '[empty content]'
        return
      }
      lastText = content

      if (isMermaid) {
        renderMermaid(content, rendered)
      } else {
        rendered.innerHTML = `<pre><code>${escapeHtml(content)}</code></pre>`
        applyShikiHighlighting(content, currentLang, rendered)
      }
    }

    function applyShikiHighlighting(content: string, lang: string, target: HTMLElement) {
      if (!lang) return
      const ready = getShikiHighlighter()
      if (!ready) return
      ready.then((hl) => {
        if (target.closest('.editing')) return
        const highlighted = hl.codeToHtml(content, {
          lang,
          theme: detectTheme(),
        })
        const temp = document.createElement('div')
        temp.innerHTML = highlighted
        const newPre = temp.querySelector('pre')
        if (newPre) {
          newPre.style.background = 'none'
          newPre.removeAttribute('tabindex')
          target.innerHTML = ''
          target.appendChild(newPre)
        }
      })
    }

    if (isMermaid) {
      observeBlock(
        container,
        () => updateRendered(node.textContent),
        () => {
          if (rendered) rendered.innerHTML = ''
        },
      )
    } else {
      updateRendered(node.textContent)
    }

    function onThemeChanged() {
      if (!container.classList.contains('editing')) {
        updateRendered()
      }
    }
    window.addEventListener('theme-changed', onThemeChanged)

    return {
      dom: container,
      contentDOM: code,
      update(updatedNode: ProsemirrorNode) {
        if (updatedNode.type.name !== 'code_block') return false
        const newLang = (updatedNode.attrs as Record<string, string>).language || ''
        if (newLang !== currentLang) {
          currentLang = newLang
          langLabel.textContent = currentLang
        }
        lastText = updatedNode.textContent
        updateRendered(updatedNode.textContent)
        return true
      },
      ignoreMutation(mutation: { target: Node; type: string }) {
        if (mutation.target === container && mutation.type === 'attributes') return true
        if (rendered && (mutation.target === rendered || rendered.contains(mutation.target)))
          return true
        if (header.contains(mutation.target)) return true
        if (wrapBtn.contains(mutation.target)) return true
        return false
      },
      destroy() {
        if (resetTimer) clearTimeout(resetTimer)
        window.removeEventListener('theme-changed', onThemeChanged)
        if (isMermaid) unobserveBlock(container)
      },
    }
  }
})
