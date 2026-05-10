import MarkdownIt from 'markdown-it'
import markdownItAnchor from 'markdown-it-anchor'
import markdownItContainer from 'markdown-it-container'
import markdownItFootnote from 'markdown-it-footnote'
import markdownItTaskLists from 'markdown-it-task-lists'
import { frontmatterPlugin } from './frontmatter'
import { mathPlugin } from './plugins/math'
import { mermaidFencePlugin } from './plugins/mermaid-fence'

export function createPipeline(): MarkdownIt {
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: false,
  })

  md.use(markdownItTaskLists, { enabled: true, label: true })
  md.use(markdownItFootnote)
  md.use(markdownItAnchor, { permalink: false })
  md.use(markdownItContainer, 'warning')
  md.use(markdownItContainer, 'info')
  md.use(markdownItContainer, 'tip')
  md.use(mathPlugin)
  md.use(mermaidFencePlugin)
  md.use(frontmatterPlugin)
  md.use(copyButtonPlugin)

  return md
}

function copyButtonPlugin(md: MarkdownIt) {
  const defaultFence = md.renderer.rules.fence?.bind(md.renderer.rules)
  if (!defaultFence) return

  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const rendered = defaultFence(tokens, idx, options, env, self)
    return `<div class="code-block-wrapper">${rendered}<button class="copy-button" aria-label="Copy code">Copy</button></div>`
  }
}
