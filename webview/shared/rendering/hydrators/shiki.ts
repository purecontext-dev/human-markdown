import { type BundledLanguage, type Highlighter, createHighlighter } from 'shiki'

let highlighter: Highlighter | null = null

const SUPPORTED_LANGUAGES: BundledLanguage[] = [
  'javascript',
  'typescript',
  'json',
  'html',
  'css',
  'python',
  'bash',
  'markdown',
  'yaml',
  'sql',
  'rust',
  'go',
  'java',
  'c',
  'cpp',
]

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ['github-light', 'github-dark'],
      langs: SUPPORTED_LANGUAGES,
    })
  }
  return highlighter
}

export async function highlightCodeBlocks(container: HTMLElement): Promise<void> {
  const codeBlocks = container.querySelectorAll<HTMLElement>('pre > code[class*="language-"]')
  if (codeBlocks.length === 0) return

  const hl = await getHighlighter()

  for (const block of codeBlocks) {
    const langClass = Array.from(block.classList).find((c) => c.startsWith('language-'))
    if (!langClass) continue

    const lang = langClass.replace('language-', '') as BundledLanguage
    if (!SUPPORTED_LANGUAGES.includes(lang)) continue

    const code = block.textContent ?? ''
    const highlighted = hl.codeToHtml(code, {
      lang,
      theme: detectTheme(),
    })

    const pre = block.parentElement
    if (pre) {
      const wrapper = pre.parentElement
      if (wrapper) {
        const temp = document.createElement('div')
        temp.innerHTML = highlighted
        const newPre = temp.querySelector('pre')
        if (newPre) {
          pre.innerHTML = newPre.innerHTML
          pre.className = newPre.className
          pre.style.cssText = newPre.style.cssText
        }
      }
    }
  }
}

function detectTheme(): 'github-light' | 'github-dark' {
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--hm-color-bg')
  if (!bg) return 'github-light'
  const trimmed = bg.trim()
  if (trimmed.startsWith('#')) {
    const r = Number.parseInt(trimmed.slice(1, 3), 16) || 128
    return r < 128 ? 'github-dark' : 'github-light'
  }
  return 'github-light'
}
