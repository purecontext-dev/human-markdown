import { $prose } from '@milkdown/kit/utils'
import { Plugin, type PluginView } from '@milkdown/prose/state'
import type { EditorView } from '@milkdown/prose/view'

class TaskListToggleView implements PluginView {
  private handler: (event: MouseEvent) => void

  constructor(private view: EditorView) {
    this.handler = this.handleClick.bind(this)
    this.view.dom.addEventListener('mousedown', this.handler, true)
  }

  private handleClick(event: MouseEvent) {
    const target = event.target as HTMLElement
    const li = target.closest('li[data-item-type="task"]')
    if (!li) return

    const firstChild = li.firstElementChild
    if (!firstChild) return
    const liRect = li.getBoundingClientRect()
    const textLeft = firstChild.getBoundingClientRect().left
    const checkboxZone = textLeft - liRect.left
    if (event.clientX > liRect.left + checkboxZone * 1.5) return

    event.preventDefault()
    event.stopPropagation()

    const pos = this.view.posAtDOM(li, 0)
    const resolved = this.view.state.doc.resolve(pos)

    for (let d = resolved.depth; d > 0; d--) {
      const node = resolved.node(d)
      if (node.type.name === 'list_item' && node.attrs.checked != null) {
        const nodePos = resolved.before(d)
        this.view.dispatch(
          this.view.state.tr.setNodeMarkup(nodePos, undefined, {
            ...node.attrs,
            checked: !node.attrs.checked,
          }),
        )
        return
      }
    }
  }

  update() {}

  destroy() {
    this.view.dom.removeEventListener('mousedown', this.handler, true)
  }
}

export const taskListTogglePlugin = $prose(() => {
  return new Plugin({
    view(editorView) {
      return new TaskListToggleView(editorView)
    },
  })
})
