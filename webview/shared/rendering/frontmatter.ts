import matter from 'gray-matter'
import type MarkdownIt from 'markdown-it'

export interface FrontmatterResult {
  content: string
  data: Record<string, unknown>
}

export function parseFrontmatter(markdown: string): FrontmatterResult {
  const { content, data } = matter(markdown)
  return { content, data }
}

export function renderFrontmatterCard(data: Record<string, unknown>): string {
  const entries = Object.entries(data)
  if (entries.length === 0) return ''

  const rows = entries
    .map(([key, value]) => {
      const escaped = escapeHtml(String(value))
      return `<tr><td class="fm-key">${escapeHtml(key)}</td><td class="fm-value">${escaped}</td></tr>`
    })
    .join('')

  return `<div class="frontmatter-card"><table>${rows}</table></div>`
}

export function frontmatterPlugin(md: MarkdownIt) {
  const originalRender = md.render.bind(md)

  md.render = (src: string, env?: Record<string, unknown>) => {
    const { content, data } = parseFrontmatter(src)
    const card = renderFrontmatterCard(data)
    const rendered = originalRender(content, env)
    return card + rendered
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
