import { $nodeSchema, $remark, $view } from '@milkdown/kit/utils'
import type { Node as ProsemirrorNode } from '@milkdown/prose/model'
import type { EditorView } from '@milkdown/prose/view'
import remarkFrontmatter from 'remark-frontmatter'
import { detectTheme, getShikiHighlighter } from './code-block-view'

let collapsed = false
let syncState: ((collapsed: boolean) => void) | null = null

export function initFrontmatterState(sync: (collapsed: boolean) => void, initial: boolean) {
  syncState = sync
  collapsed = initial
}

export const remarkFrontmatterPlugin = $remark('frontmatter', () => remarkFrontmatter, ['yaml'])

export const frontmatterNodeSchema = $nodeSchema('frontmatter', () => ({
  content: 'text*',
  group: 'block',
  marks: '',
  defining: true,
  code: true,
  attrs: {},
  parseDOM: [
    {
      tag: 'div.frontmatter-block',
      preserveWhitespace: 'full' as const,
      contentElement: 'code',
    },
  ],
  toDOM: () => ['div', { class: 'frontmatter-block' }, ['pre', ['code', 0]]] as const,
  parseMarkdown: {
    match: ({ type }: { type: string }) => type === 'yaml',
    runner: (state, node, type) => {
      const value = node.value as string
      state.openNode(type)
      if (value) state.addText(value)
      state.closeNode()
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'frontmatter',
    runner: (state, node) => {
      state.addNode('yaml', undefined, node.textContent || '')
    },
  },
}))

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export const frontmatterView = $view(frontmatterNodeSchema.node, () => {
  return (node: ProsemirrorNode, _view: EditorView, _getPos: () => number | undefined) => {
    const container = document.createElement('div')
    container.classList.add('frontmatter-block')
    if (collapsed) container.classList.add('collapsed')

    const header = document.createElement('div')
    header.classList.add('frontmatter-header')

    const toggle = document.createElement('span')
    toggle.classList.add('frontmatter-toggle')
    toggle.textContent = collapsed ? '▶' : '▼'
    header.appendChild(toggle)

    const label = document.createElement('span')
    label.classList.add('frontmatter-label')
    label.textContent = 'Frontmatter'
    header.appendChild(label)

    container.appendChild(header)

    const body = document.createElement('div')
    body.classList.add('frontmatter-body')
    if (collapsed) body.style.display = 'none'

    const rendered = document.createElement('div')
    rendered.classList.add('frontmatter-rendered')
    body.appendChild(rendered)

    const pre = document.createElement('pre')
    const code = document.createElement('code')
    pre.appendChild(code)
    body.appendChild(pre)

    container.appendChild(body)

    let lastText = node.textContent

    function updateRendered(text?: string) {
      const content = text ?? code.textContent ?? lastText
      if (!content) {
        rendered.textContent = ''
        return
      }
      lastText = content
      rendered.innerHTML = `<pre><code>${escapeHtml(content)}</code></pre>`

      const ready = getShikiHighlighter()
      if (!ready) return
      ready.then((hl) => {
        if (container.classList.contains('editing')) return
        const highlighted = hl.codeToHtml(content, {
          lang: 'yaml',
          theme: detectTheme(),
        })
        const temp = document.createElement('div')
        temp.innerHTML = highlighted
        const newPre = temp.querySelector('pre')
        if (newPre) {
          rendered.innerHTML = ''
          rendered.appendChild(newPre)
        }
      })
    }

    updateRendered(node.textContent)

    toggle.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      collapsed = !collapsed
      container.classList.toggle('collapsed', collapsed)
      body.style.display = collapsed ? 'none' : ''
      toggle.textContent = collapsed ? '▶' : '▼'
      syncState?.(collapsed)
    })

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
        if (updatedNode.type.name !== 'frontmatter') return false
        lastText = updatedNode.textContent
        if (!container.classList.contains('editing')) {
          updateRendered(updatedNode.textContent)
        }
        return true
      },
      ignoreMutation(mutation: { target: Node; type: string }) {
        if (rendered.contains(mutation.target)) return true
        if (header.contains(mutation.target)) return true
        return false
      },
    }
  }
})
