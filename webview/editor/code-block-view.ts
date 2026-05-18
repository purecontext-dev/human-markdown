import type { Ctx } from '@milkdown/ctx'
import { $view } from '@milkdown/kit/utils'
import { codeBlockSchema } from '@milkdown/preset-commonmark'
import type { Node as ProsemirrorNode } from '@milkdown/prose/model'
import type { EditorView } from '@milkdown/prose/view'
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
    container.innerHTML = svg
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

    const langLabel = document.createElement('span')
    langLabel.classList.add('code-lang')
    container.appendChild(langLabel)

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

    if (rendered && !isMermaid) {
      let mouseDownX = 0
      let mouseDownY = 0
      rendered.addEventListener('mousedown', (e) => {
        mouseDownX = e.clientX
        mouseDownY = e.clientY
      })
      rendered.addEventListener('click', (e) => {
        const dx = e.clientX - mouseDownX
        const dy = e.clientY - mouseDownY
        if (Math.sqrt(dx * dx + dy * dy) < 3) {
          container.classList.add('editing')
          code.focus()
        }
      })
    }

    container.addEventListener('focusin', () => {
      container.classList.add('editing')
    })

    container.addEventListener('focusout', (e) => {
      const related = (e as FocusEvent).relatedTarget as Node | null
      if (related && container.contains(related)) return
      container.classList.remove('editing')
      updateRendered()
    })

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
        if (!container.classList.contains('editing')) {
          updateRendered(updatedNode.textContent)
        }
        return true
      },
      ignoreMutation(mutation: { target: Node; type: string }) {
        if (rendered && (mutation.target === rendered || rendered.contains(mutation.target)))
          return true
        if (langLabel.contains(mutation.target)) return true
        return false
      },
      destroy() {
        window.removeEventListener('theme-changed', onThemeChanged)
        if (isMermaid) unobserveBlock(container)
      },
    }
  }
})
