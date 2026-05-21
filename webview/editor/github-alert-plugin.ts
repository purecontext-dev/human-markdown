import { $nodeSchema, $remark, $view } from '@milkdown/kit/utils'
import type { Node as ProsemirrorNode } from '@milkdown/prose/model'
import type { EditorView } from '@milkdown/prose/view'

const alertRegex = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i

type AlertType = 'note' | 'tip' | 'important' | 'warning' | 'caution'

interface MdastNode {
  type: string
  value?: string
  alertType?: string
  children?: MdastNode[]
  position?: unknown
  spread?: boolean | string | null
}

function visitBlockquotes(
  node: MdastNode,
  handler: (bq: MdastNode, index: number, parent: MdastNode) => void,
): void {
  if (!node.children) return
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i]
    if (child.type === 'blockquote') {
      handler(child, i, node)
    }
    visitBlockquotes(child, handler)
  }
}

export function remarkGithubAlerts() {
  return (tree: MdastNode) => {
    visitBlockquotes(tree, (bq, index, parent) => {
      const firstChild = bq.children?.[0]
      if (firstChild?.type !== 'paragraph') return

      const firstText = firstChild.children?.[0]
      if (firstText?.type !== 'text' || !firstText.value) return

      const match = firstText.value.match(alertRegex)
      if (!match) return

      const alertType = match[1].toLowerCase() as AlertType
      const remaining = firstText.value.slice(match[0].length)

      if (remaining.startsWith('\n')) {
        firstText.value = remaining.slice(1)
      } else if (remaining === '') {
        const siblings = firstChild.children ?? []
        if (siblings.length > 1) {
          siblings.shift()
          if (siblings[0]?.type === 'break') {
            siblings.shift()
          }
        } else {
          bq.children?.shift()
        }
      } else {
        firstText.value = remaining
      }

      if (
        bq.children?.[0]?.type === 'paragraph' &&
        (!bq.children?.[0].children || bq.children?.[0].children.length === 0)
      ) {
        bq.children?.shift()
      }

      if (!parent.children) return
      const alertChildren = bq.children ?? []
      if (alertChildren.length === 0) {
        alertChildren.push({ type: 'paragraph', children: [{ type: 'text', value: '' }] })
      }
      parent.children[index] = {
        type: 'github_alert',
        alertType,
        children: alertChildren,
        position: bq.position,
      }
    })
  }
}

export function convertAlertsToBlockquotes(node: MdastNode): void {
  if (!node.children) return
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i]
    if (child.type === 'github_alert') {
      const alertType = (child.alertType as string).toUpperCase()
      const children = child.children ?? []

      if (children.length > 0 && children[0].type === 'paragraph') {
        const para = children[0]
        const firstText = para.children?.[0]
        if (firstText?.type === 'text') {
          firstText.value = `[!${alertType}]\n${firstText.value}`
        } else {
          para.children = [{ type: 'text', value: `[!${alertType}]\n` }, ...(para.children ?? [])]
        }
      } else {
        children.unshift({
          type: 'paragraph',
          children: [{ type: 'text', value: `[!${alertType}]` }],
        })
      }

      node.children[i] = {
        type: 'blockquote',
        children,
        position: child.position,
      }
    }
    convertAlertsToBlockquotes(child)
  }
}

const unescapeAlertRegex = /\\\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/gi

// biome-ignore lint/suspicious/noExplicitAny: patching unified processor internals
export function patchRemarkForGithubAlerts(remark: any): void {
  const origStringify = remark.stringify.bind(remark)
  remark.stringify = (tree: MdastNode, ...args: unknown[]) => {
    const result = origStringify(tree, ...args) as string
    return result.replace(unescapeAlertRegex, '[!$1]')
  }
}

export const remarkGithubAlertsPlugin = $remark('githubAlerts', () => remarkGithubAlerts)

export const githubAlertSchema = $nodeSchema('github_alert', () => ({
  content: 'block+',
  group: 'block',
  defining: true,
  attrs: {
    alertType: { default: 'note' },
  },
  parseDOM: [
    {
      tag: 'div.github-alert',
      getAttrs: (dom: HTMLElement) => ({
        alertType: dom.dataset.alertType ?? 'note',
      }),
    },
  ],
  toDOM: (node: ProsemirrorNode) =>
    ['div', { class: 'github-alert', 'data-alert-type': node.attrs.alertType }, 0] as const,
  parseMarkdown: {
    match: ({ type }: { type: string }) => type === 'github_alert',
    runner: (state, node, type) => {
      state.openNode(type, { alertType: node.alertType as string })
      // biome-ignore lint/suspicious/noExplicitAny: Milkdown MDAST children type mismatch
      state.next(node.children as any[])
      state.closeNode()
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'github_alert',
    runner: (state, node) => {
      const alertType = (node.attrs.alertType as string).toUpperCase()
      state.openNode('blockquote')
      state.openNode('paragraph')
      state.addNode('text', undefined, `[!${alertType}]`)
      state.closeNode()
      state.next(node.content)
      state.closeNode()
    },
  },
}))

const alertIcons: Record<string, string> = {
  note: 'M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z',
  tip: 'M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.211c-.04-.282-.163-.547-.37-.847a8.456 8.456 0 0 0-.542-.68c-.084-.1-.173-.205-.268-.32C3.201 7.75 2.5 6.766 2.5 5.25 2.5 2.31 4.863 0 8 0s5.5 2.31 5.5 5.25c0 1.516-.701 2.5-1.328 3.259-.095.115-.184.22-.268.319-.207.245-.383.453-.541.681-.208.3-.33.565-.37.847a.751.751 0 0 1-1.485-.212c.084-.593.337-1.078.621-1.489.203-.292.45-.584.673-.848.075-.088.147-.173.213-.253.561-.679.985-1.32.985-2.304 0-2.06-1.637-3.75-4-3.75ZM5.75 12h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5ZM6 15.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z',
  important:
    'M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0 1 14.25 13H8.06l-2.573 2.573A1.458 1.458 0 0 1 3 14.543V13H1.75A1.75 1.75 0 0 1 0 11.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h6.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25Zm7 2.25v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z',
  warning:
    'M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z',
  caution:
    'M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .389.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.389.22-.53Zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5ZM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z',
}

const alertLabels: Record<string, string> = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
}

function createAlertIcon(type: string): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 16 16')
  svg.setAttribute('width', '16')
  svg.setAttribute('height', '16')
  svg.setAttribute('aria-hidden', 'true')
  svg.classList.add('github-alert-icon')

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', alertIcons[type] ?? alertIcons.note)
  path.setAttribute('fill', 'currentColor')
  svg.appendChild(path)
  return svg
}

export const githubAlertView = $view(githubAlertSchema.node, () => {
  return (node: ProsemirrorNode, _view: EditorView, _getPos: () => number | undefined) => {
    const alertType = (node.attrs.alertType as string) || 'note'

    const container = document.createElement('div')
    container.classList.add('github-alert')
    container.dataset.alertType = alertType

    const header = document.createElement('div')
    header.classList.add('github-alert-header')
    header.appendChild(createAlertIcon(alertType))

    const label = document.createElement('span')
    label.classList.add('github-alert-label')
    label.textContent = alertLabels[alertType] ?? 'Note'
    header.appendChild(label)

    container.appendChild(header)

    const body = document.createElement('div')
    body.classList.add('github-alert-body')
    container.appendChild(body)

    return {
      dom: container,
      contentDOM: body,
      update(updatedNode: ProsemirrorNode) {
        if (updatedNode.type.name !== 'github_alert') return false
        const newType = (updatedNode.attrs.alertType as string) || 'note'
        if (newType !== container.dataset.alertType) {
          container.dataset.alertType = newType
          header.innerHTML = ''
          header.appendChild(createAlertIcon(newType))
          const newLabel = document.createElement('span')
          newLabel.classList.add('github-alert-label')
          newLabel.textContent = alertLabels[newType] ?? 'Note'
          header.appendChild(newLabel)
        }
        return true
      },
      ignoreMutation(mutation: { target: Node; type: string }) {
        return header.contains(mutation.target)
      },
    }
  }
})
