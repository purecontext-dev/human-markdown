import { $prose } from '@milkdown/kit/utils'
import { Plugin } from '@milkdown/prose/state'

export const taskListTogglePlugin = $prose(() => {
  return new Plugin({
    props: {
      handleClick(view, _pos, event) {
        const target = event.target as HTMLElement
        const li = target.closest('li[data-item-type="task"]')
        if (!li) return false

        const rect = li.getBoundingClientRect()
        if (event.clientX > rect.left + 24) return false

        const pos = view.posAtDOM(li, 0)
        const resolved = view.state.doc.resolve(pos)
        const node = resolved.parent

        if (node.type.name !== 'list_item' || node.attrs.checked == null) return false

        const nodePos = resolved.before(resolved.depth)
        view.dispatch(
          view.state.tr.setNodeMarkup(nodePos, undefined, {
            ...node.attrs,
            checked: !node.attrs.checked,
          }),
        )

        return true
      },
    },
  })
})
