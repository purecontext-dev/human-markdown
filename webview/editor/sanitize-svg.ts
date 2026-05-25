const DANGEROUS_ELEMENTS = 'script,iframe,object,embed'
const FOREIGN_OBJECT_ALLOWED_TAGS = new Set([
  'div',
  'span',
  'p',
  'br',
  'b',
  'i',
  'em',
  'strong',
  'body',
])

export function sanitizeSvg(svgString: string): string {
  const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml')
  if (doc.querySelector('parsererror')) {
    throw new Error(doc.querySelector('parsererror')?.textContent ?? 'SVG parse error')
  }
  for (const el of doc.querySelectorAll(DANGEROUS_ELEMENTS)) {
    el.remove()
  }
  for (const fo of doc.querySelectorAll('foreignObject')) {
    for (const child of fo.querySelectorAll('*')) {
      if (!FOREIGN_OBJECT_ALLOWED_TAGS.has(child.localName)) {
        child.remove()
      }
    }
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
