export async function renderMathBlocks(container: HTMLElement): Promise<void> {
  const inlineBlocks = container.querySelectorAll<HTMLElement>('.math-inline')
  const displayBlocks = container.querySelectorAll<HTMLElement>('.math-display')
  if (inlineBlocks.length === 0 && displayBlocks.length === 0) return

  const katex = await import('katex')

  for (const el of inlineBlocks) {
    const latex = el.textContent ?? ''
    try {
      el.innerHTML = katex.default.renderToString(latex, {
        throwOnError: false,
        strict: true,
        displayMode: false,
      })
    } catch {
      el.classList.add('math-error')
    }
  }

  for (const el of displayBlocks) {
    const latex = el.textContent ?? ''
    try {
      el.innerHTML = katex.default.renderToString(latex, {
        throwOnError: false,
        strict: true,
        displayMode: true,
      })
    } catch {
      el.classList.add('math-error')
    }
  }
}
