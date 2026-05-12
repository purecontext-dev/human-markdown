import type { BundledLanguage } from 'shiki'
import { createHighlighter } from 'shiki'

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

const ready = createHighlighter({
  themes: ['github-light', 'github-dark'],
  langs: SUPPORTED_LANGUAGES,
}).then((hl) => {
  ;(window as unknown as Record<string, unknown>).__shiki = hl
  window.dispatchEvent(new Event('shiki-ready'))
  return hl
})
;(window as unknown as Record<string, unknown>).__shikiReady = ready
