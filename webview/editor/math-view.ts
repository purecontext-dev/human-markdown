import { $view } from '@milkdown/kit/utils'
import type { Node as ProsemirrorNode } from '@milkdown/prose/model'
import type { EditorView } from '@milkdown/prose/view'
import { mathDisplaySchema, mathInlineSchema } from './math-plugin'

interface KatexApi {
  renderToString(expression: string, options?: Record<string, unknown>): string
}

function getKatex(): KatexApi | null {
  return (window as unknown as Record<string, unknown>).__katex as KatexApi | null
}

function renderMathToHtml(expression: string, displayMode: boolean): string {
  const katex = getKatex()
  if (!katex || !expression) return ''
  try {
    return katex.renderToString(expression, {
      displayMode,
      throwOnError: false,
      strict: true,
      output: 'mathml' as const,
    })
  } catch {
    return ''
  }
}

export const mathDisplayView = $view(mathDisplaySchema.node, () => {
  return (node: ProsemirrorNode, _view: EditorView, _getPos: () => number | undefined) => {
    const container = document.createElement('div')
    container.classList.add('math-display-view')

    const rendered = document.createElement('div')
    rendered.classList.add('math-rendered')
    container.appendChild(rendered)

    const pre = document.createElement('pre')
    const code = document.createElement('code')
    pre.appendChild(code)
    container.appendChild(pre)

    let lastText = node.textContent

    function updateRendered(text?: string) {
      const content = text ?? code.textContent ?? lastText
      if (!content) {
        rendered.textContent = ''
        return
      }
      lastText = content
      const html = renderMathToHtml(content, true)
      if (html) {
        rendered.innerHTML = html
      } else {
        rendered.textContent = content
      }
    }

    updateRendered(node.textContent)

    function onKatexReady() {
      if (!container.classList.contains('editing')) {
        updateRendered()
      }
    }
    if (!getKatex()) {
      window.addEventListener('katex-ready', onKatexReady, { once: true })
    }

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

    container.addEventListener('focusin', (e) => {
      container.classList.add('editing')
      if (e.target !== code && !code.contains(e.target as Node)) {
        code.focus()
      }
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
        if (updatedNode.type.name !== 'math_display') return false
        lastText = updatedNode.textContent
        if (!container.classList.contains('editing')) {
          updateRendered(updatedNode.textContent)
        }
        return true
      },
      ignoreMutation(mutation: { target: Node; type: string }) {
        if (rendered.contains(mutation.target)) return true
        return false
      },
      destroy() {
        window.removeEventListener('katex-ready', onKatexReady)
      },
    }
  }
})

export const mathInlineView = $view(mathInlineSchema.node, () => {
  return (node: ProsemirrorNode) => {
    const span = document.createElement('span')
    span.classList.add('math-inline-view')

    const value = node.attrs.value as string
    const html = renderMathToHtml(value, false)
    if (html) {
      span.innerHTML = html
    } else {
      span.textContent = `$${value}$`
    }

    function onKatexReady() {
      const v = node.attrs.value as string
      const h = renderMathToHtml(v, false)
      if (h) span.innerHTML = h
    }
    if (!getKatex()) {
      window.addEventListener('katex-ready', onKatexReady, { once: true })
    }

    return {
      dom: span,
      update(updatedNode: ProsemirrorNode) {
        if (updatedNode.type.name !== 'math_inline') return false
        const newValue = updatedNode.attrs.value as string
        const newHtml = renderMathToHtml(newValue, false)
        if (newHtml) {
          span.innerHTML = newHtml
        } else {
          span.textContent = `$${newValue}$`
        }
        return true
      },
      destroy() {
        window.removeEventListener('katex-ready', onKatexReady)
      },
    }
  }
})
