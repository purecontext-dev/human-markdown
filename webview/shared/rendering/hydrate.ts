export async function hydrate(container: HTMLElement): Promise<void> {
  const tasks: Promise<void>[] = []

  if (container.querySelector('pre > code[class*="language-"]')) {
    tasks.push(
      import('./hydrators/shiki').then(({ highlightCodeBlocks }) => highlightCodeBlocks(container)),
    )
  }

  if (container.querySelector('.math-inline, .math-display')) {
    tasks.push(
      import('./hydrators/katex').then(({ renderMathBlocks }) => renderMathBlocks(container)),
    )
  }

  if (container.querySelector('.mermaid[data-mermaid]')) {
    tasks.push(
      import('./hydrators/mermaid').then(({ renderMermaidBlocks }) =>
        renderMermaidBlocks(container),
      ),
    )
  }

  await Promise.allSettled(tasks)
}
