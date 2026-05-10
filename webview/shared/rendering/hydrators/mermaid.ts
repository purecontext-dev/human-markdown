export async function renderMermaidBlocks(container: HTMLElement): Promise<void> {
  const blocks = container.querySelectorAll<HTMLElement>('.mermaid[data-mermaid]')
  if (blocks.length === 0) return

  const mermaid = await import('mermaid')

  mermaid.default.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: detectMermaidTheme(),
  })

  for (const el of blocks) {
    const source = el.textContent ?? ''
    const id = `mermaid-${crypto.randomUUID()}`
    try {
      const { svg } = await mermaid.default.render(id, source)
      el.innerHTML = svg
      el.removeAttribute('data-mermaid')
    } catch {
      el.classList.add('mermaid-error')
    }
  }
}

function detectMermaidTheme(): 'default' | 'dark' {
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--hm-color-bg')
  if (!bg) return 'default'
  const trimmed = bg.trim()
  if (trimmed.startsWith('#')) {
    const r = Number.parseInt(trimmed.slice(1, 3), 16) || 128
    return r < 128 ? 'dark' : 'default'
  }
  return 'default'
}
