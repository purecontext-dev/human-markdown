const DANGEROUS_SVG_ELEMENTS = 'script,foreignObject,iframe,object,embed'

export function sanitizeSvg(svgString: string): string {
  const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml')
  if (doc.querySelector('parsererror')) {
    throw new Error(doc.querySelector('parsererror')?.textContent ?? 'SVG parse error')
  }
  for (const el of doc.querySelectorAll(DANGEROUS_SVG_ELEMENTS)) {
    el.remove()
  }
  for (const el of doc.querySelectorAll('*')) {
    for (const attr of [...el.attributes]) {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name)
      } else if (/^(xlink:)?href$/i.test(attr.name)) {
        if (!/^#/.test(attr.value.trim())) {
          el.removeAttribute(attr.name)
        }
      }
    }
  }
  return doc.documentElement.outerHTML
}
