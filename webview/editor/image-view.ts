import type { Ctx } from '@milkdown/ctx'
import { $view } from '@milkdown/kit/utils'
import { imageSchema } from '@milkdown/preset-commonmark'
import type { Node as ProsemirrorNode } from '@milkdown/prose/model'
import type { EditorView } from '@milkdown/prose/view'

export type ImageUriResolver = (src: string) => Promise<string>

const loadedCache = new Map<string, string>()

const ALLOWED_PROTOCOLS = /^(https?:|vscode-webview:|data:image\/)/i

function isLocalPath(src: string): boolean {
  return !/^[a-z][a-z0-9+.-]*:/i.test(src)
}

export function createImageView(resolve: ImageUriResolver) {
  return $view(imageSchema.node, (_ctx: Ctx) => {
    return (node: ProsemirrorNode, _view: EditorView, _getPos: () => number | undefined) => {
      const attrs = node.attrs as { src: string; alt: string; title: string }

      const container = document.createElement('span')
      container.classList.add('image-view')

      const img = document.createElement('img')
      img.alt = attrs.alt || ''
      if (attrs.title) img.title = attrs.title

      let generation = 0
      let currentSrc = ''

      function applySrc(src: string) {
        currentSrc = src
        generation++
        const myGen = generation

        if (!src) {
          img.removeAttribute('src')
          img.classList.add('image-broken')
          img.classList.remove('image-loading')
          return
        }

        if (!isLocalPath(src)) {
          if (ALLOWED_PROTOCOLS.test(src)) {
            img.src = src
            img.classList.remove('image-loading', 'image-broken')
          } else {
            img.removeAttribute('src')
            img.classList.add('image-broken')
            img.classList.remove('image-loading')
          }
          return
        }

        const cached = loadedCache.get(src)
        if (cached) {
          img.src = cached
          img.classList.remove('image-loading', 'image-broken')
          return
        }

        img.classList.add('image-loading')
        img.classList.remove('image-broken')
        resolve(src).then((uri) => {
          if (generation !== myGen) return
          img.src = uri
          img.classList.remove('image-loading')
        })
      }

      img.addEventListener('load', () => {
        if (currentSrc && isLocalPath(currentSrc)) {
          loadedCache.set(currentSrc, img.src)
        }
      })

      img.addEventListener('error', () => {
        loadedCache.delete(currentSrc)
        img.classList.add('image-broken')
        img.classList.remove('image-loading')
      })

      applySrc(attrs.src)
      container.appendChild(img)

      return {
        dom: container,
        update(updatedNode: ProsemirrorNode) {
          if (updatedNode.type.name !== 'image') return false
          const newAttrs = updatedNode.attrs as { src: string; alt: string; title: string }
          img.alt = newAttrs.alt || ''
          img.title = newAttrs.title || ''
          if (newAttrs.src !== currentSrc) {
            applySrc(newAttrs.src)
          }
          return true
        },
        destroy() {
          generation++
        },
      }
    }
  })
}

export { isLocalPath, loadedCache }
