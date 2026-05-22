import type { Ctx } from '@milkdown/ctx'
import { $view } from '@milkdown/kit/utils'
import { imageSchema } from '@milkdown/preset-commonmark'
import type { Node as ProsemirrorNode } from '@milkdown/prose/model'
import type { EditorView } from '@milkdown/prose/view'

const uriCache = new Map<string, string>()
const pendingCallbacks = new Map<string, Set<(uri: string) => void>>()

function isLocalPath(src: string): boolean {
  if (/^[a-z][a-z0-9+.-]*:/i.test(src)) return false
  if (src.startsWith('data:')) return false
  return true
}

function requestResolve(src: string, callback: (uri: string) => void) {
  const cached = uriCache.get(src)
  if (cached) {
    callback(cached)
    return
  }

  let callbacks = pendingCallbacks.get(src)
  if (!callbacks) {
    callbacks = new Set()
    pendingCallbacks.set(src, callbacks)
    const vscode = (window as unknown as { __vscodeApi: { postMessage(msg: unknown): void } })
      .__vscodeApi
    vscode.postMessage({ type: 'resolve-image-uri', src })
  }
  callbacks.add(callback)
}

window.addEventListener('message', (event) => {
  const msg = event.data
  if (msg?.type !== 'image-uri-resolved') return

  const { src, webviewUri } = msg as { src: string; webviewUri: string }
  uriCache.set(src, webviewUri)

  const callbacks = pendingCallbacks.get(src)
  if (callbacks) {
    for (const cb of callbacks) cb(webviewUri)
    pendingCallbacks.delete(src)
  }
})

export const imageView = $view(imageSchema.node, (_ctx: Ctx) => {
  return (node: ProsemirrorNode, _view: EditorView, _getPos: () => number | undefined) => {
    const attrs = node.attrs as { src: string; alt: string; title: string }

    const container = document.createElement('span')
    container.classList.add('image-view')

    const img = document.createElement('img')
    img.alt = attrs.alt || ''
    if (attrs.title) img.title = attrs.title

    if (!attrs.src) {
      img.classList.add('image-broken')
    } else if (isLocalPath(attrs.src)) {
      const cached = uriCache.get(attrs.src)
      if (cached) {
        img.src = cached
      } else {
        img.classList.add('image-loading')
        requestResolve(attrs.src, (uri) => {
          img.src = uri
          img.classList.remove('image-loading')
        })
      }
    } else {
      img.src = attrs.src
    }

    container.appendChild(img)

    return {
      dom: container,
      update(updatedNode: ProsemirrorNode) {
        if (updatedNode.type.name !== 'image') return false
        const newAttrs = updatedNode.attrs as { src: string; alt: string; title: string }
        img.alt = newAttrs.alt || ''
        img.title = newAttrs.title || ''

        if (!newAttrs.src) {
          img.removeAttribute('src')
          img.classList.add('image-broken')
          img.classList.remove('image-loading')
        } else if (isLocalPath(newAttrs.src)) {
          const cached = uriCache.get(newAttrs.src)
          if (cached) {
            img.src = cached
            img.classList.remove('image-loading', 'image-broken')
          } else {
            img.classList.add('image-loading')
            img.classList.remove('image-broken')
            requestResolve(newAttrs.src, (uri) => {
              img.src = uri
              img.classList.remove('image-loading')
            })
          }
        } else {
          img.src = newAttrs.src
          img.classList.remove('image-loading', 'image-broken')
        }
        return true
      },
    }
  }
})
