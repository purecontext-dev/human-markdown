type RenderCallback = () => void
type DisposeCallback = () => void

interface ObservedEntry {
  render: RenderCallback
  dispose: DisposeCallback
  rendered: boolean
}

const entries = new Map<Element, ObservedEntry>()

const renderObserver = new IntersectionObserver(
  (intersections) => {
    for (const entry of intersections) {
      const tracked = entries.get(entry.target)
      if (!tracked) continue

      if (entry.isIntersecting && !tracked.rendered) {
        tracked.render()
        tracked.rendered = true
      }
    }
  },
  { rootMargin: '100% 0px' },
)

const disposeObserver = new IntersectionObserver(
  (intersections) => {
    for (const entry of intersections) {
      const tracked = entries.get(entry.target)
      if (!tracked) continue

      if (!entry.isIntersecting && tracked.rendered) {
        tracked.dispose()
        tracked.rendered = false
      }
    }
  },
  { rootMargin: '200% 0px' },
)

export function observeBlock(element: Element, render: RenderCallback, dispose: DisposeCallback) {
  entries.set(element, { render, dispose, rendered: false })
  renderObserver.observe(element)
  disposeObserver.observe(element)
}

export function unobserveBlock(element: Element) {
  renderObserver.unobserve(element)
  disposeObserver.unobserve(element)
  entries.delete(element)
}
