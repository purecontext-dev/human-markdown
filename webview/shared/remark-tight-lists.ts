interface MdastNode {
  type: string
  children?: MdastNode[]
  spread?: boolean | string | null
}

function visitLists(node: MdastNode, fn: (list: MdastNode) => void): void {
  if (node.type === 'list') fn(node)
  if (node.children) {
    for (const child of node.children) visitLists(child, fn)
  }
}

function isSimpleItem(item: MdastNode): boolean {
  if (!item.children) return true
  const paragraphs = item.children.filter((c) => c.type === 'paragraph')
  return paragraphs.length <= 1
}

function fixTightLists(tree: MdastNode): void {
  visitLists(tree, (list) => {
    if (!list.children) return
    const allSimple = list.children.every(isSimpleItem)
    if (allSimple) {
      list.spread = false
      for (const item of list.children) {
        item.spread = false
      }
    } else {
      list.spread = true
      for (const item of list.children) {
        item.spread = !isSimpleItem(item)
      }
    }
  })
}

// biome-ignore lint/suspicious/noExplicitAny: patching unified processor internals
function patchRemarkForTightLists(remark: any): void {
  const origStringify = remark.stringify.bind(remark)
  remark.stringify = (tree: MdastNode, ...args: unknown[]) => {
    fixTightLists(tree)
    return origStringify(tree, ...args)
  }
}

export { fixTightLists, patchRemarkForTightLists }
