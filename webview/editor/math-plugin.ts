import { $nodeSchema, $remark } from '@milkdown/kit/utils'
import remarkMath from 'remark-math'

export const remarkMathPlugin = $remark('math', () => remarkMath)

export const mathDisplaySchema = $nodeSchema('math_display', () => ({
  content: 'text*',
  group: 'block',
  marks: '',
  defining: true,
  code: true,
  attrs: {},
  parseDOM: [
    {
      tag: 'div.math-display-view',
      preserveWhitespace: 'full' as const,
      contentElement: 'code',
    },
  ],
  toDOM: () => ['div', { class: 'math-display-view' }, ['pre', ['code', 0]]] as const,
  parseMarkdown: {
    match: ({ type }: { type: string }) => type === 'math',
    runner: (state, node, type) => {
      const value = node.value as string
      state.openNode(type)
      if (value) state.addText(value)
      state.closeNode()
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'math_display',
    runner: (state, node) => {
      state.addNode('math', undefined, node.textContent || '')
    },
  },
}))

export const mathInlineSchema = $nodeSchema('math_inline', () => ({
  inline: true,
  group: 'inline',
  atom: true,
  marks: '',
  attrs: { value: { default: '' } },
  parseDOM: [{ tag: 'span.math-inline-view' }],
  toDOM: (node) => ['span', { class: 'math-inline-view' }, `$${node.attrs.value}$`],
  parseMarkdown: {
    match: ({ type }: { type: string }) => type === 'inlineMath',
    runner: (state, node, type) => {
      state.addNode(type, { value: node.value as string })
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'math_inline',
    runner: (state, node) => {
      state.addNode('inlineMath', undefined, node.attrs.value as string)
    },
  },
}))
