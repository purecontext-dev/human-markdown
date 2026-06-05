import type { Editor } from '@milkdown/core'
import { commandsCtx, editorViewCtx } from '@milkdown/core'
import {
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  toggleStrongCommand,
  wrapInBlockquoteCommand,
  wrapInBulletListCommand,
  wrapInHeadingCommand,
  wrapInOrderedListCommand,
} from '@milkdown/preset-commonmark'
import { toggleStrikethroughCommand } from '@milkdown/preset-gfm'

interface ToolbarButton {
  label: string
  title: string
  className?: string
  action: (editor: Editor) => void
}

const headingButtons: ToolbarButton[] = [1, 2, 3].map((level) => ({
  label: `H${level}`,
  title: `Heading ${level} (Cmd+Alt+${level})`,
  className: 'fmt-heading',
  action: (editor) => {
    editor.action((ctx) => {
      ctx.get(commandsCtx).call(wrapInHeadingCommand.key, level)
    })
  },
}))

const inlineButtons: ToolbarButton[] = [
  {
    label: 'B',
    title: 'Bold (Cmd+B)',
    className: 'fmt-bold',
    action: (editor) => {
      editor.action((ctx) => ctx.get(commandsCtx).call(toggleStrongCommand.key))
    },
  },
  {
    label: 'I',
    title: 'Italic (Cmd+I)',
    className: 'fmt-italic',
    action: (editor) => {
      editor.action((ctx) => ctx.get(commandsCtx).call(toggleEmphasisCommand.key))
    },
  },
  {
    label: 'S',
    title: 'Strikethrough (Cmd+Alt+X)',
    className: 'fmt-strike',
    action: (editor) => {
      editor.action((ctx) => ctx.get(commandsCtx).call(toggleStrikethroughCommand.key))
    },
  },
  {
    label: '</>',
    title: 'Inline code (Cmd+E)',
    className: 'fmt-code',
    action: (editor) => {
      editor.action((ctx) => ctx.get(commandsCtx).call(toggleInlineCodeCommand.key))
    },
  },
]

const blockButtons: ToolbarButton[] = [
  {
    label: '•',
    title: 'Bullet list (Cmd+Alt+8)',
    action: (editor) => {
      editor.action((ctx) => ctx.get(commandsCtx).call(wrapInBulletListCommand.key))
    },
  },
  {
    label: '1.',
    title: 'Ordered list (Cmd+Alt+7)',
    action: (editor) => {
      editor.action((ctx) => ctx.get(commandsCtx).call(wrapInOrderedListCommand.key))
    },
  },
  {
    label: '“',
    title: 'Blockquote (Cmd+Shift+B)',
    action: (editor) => {
      editor.action((ctx) => ctx.get(commandsCtx).call(wrapInBlockquoteCommand.key))
    },
  },
]

function createButton(def: ToolbarButton, getEditor: () => Editor | null): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.className = `fmt-btn${def.className ? ` ${def.className}` : ''}`
  btn.textContent = def.label
  btn.title = def.title
  btn.addEventListener('click', (e) => {
    e.preventDefault()
    const editor = getEditor()
    if (!editor) return
    def.action(editor)
    editor.action((ctx) => ctx.get(editorViewCtx).focus())
  })
  return btn
}

function createSeparator(): HTMLSpanElement {
  const sep = document.createElement('span')
  sep.className = 'fmt-sep'
  return sep
}

export class FormattingToolbar {
  readonly element: HTMLDivElement

  constructor(private readonly getEditor: () => Editor | null) {
    this.element = document.createElement('div')
    this.element.id = 'formatting-toolbar'

    for (const def of headingButtons) {
      this.element.appendChild(createButton(def, this.getEditor))
    }
    this.element.appendChild(createSeparator())
    for (const def of inlineButtons) {
      this.element.appendChild(createButton(def, this.getEditor))
    }
    this.element.appendChild(createSeparator())
    for (const def of blockButtons) {
      this.element.appendChild(createButton(def, this.getEditor))
    }
  }

  show() {
    this.element.classList.remove('hidden')
  }

  hide() {
    this.element.classList.add('hidden')
  }
}
