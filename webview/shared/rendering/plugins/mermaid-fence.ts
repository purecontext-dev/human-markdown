import type MarkdownIt from 'markdown-it'

export function mermaidFencePlugin(md: MarkdownIt) {
  const defaultFence = md.renderer.rules.fence?.bind(md.renderer.rules)
  if (!defaultFence) return

  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    const info = token.info.trim().toLowerCase()

    if (info === 'mermaid') {
      const escaped = escapeHtml(token.content)
      return `<div class="mermaid" data-mermaid>${escaped}</div>\n`
    }

    return defaultFence(tokens, idx, options, env, self)
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
