import type MarkdownIt from 'markdown-it'
import type StateBlock from 'markdown-it/lib/rules_block/state_block.mjs'
import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs'

export function mathPlugin(md: MarkdownIt) {
  md.inline.ruler.after('escape', 'math_inline', mathInlineRule)
  md.block.ruler.before('fence', 'math_block', mathBlockRule, {
    alt: ['paragraph', 'reference', 'blockquote', 'list'],
  })

  md.renderer.rules.math_inline = (tokens, idx) => {
    return `<span class="math-inline">${escapeHtml(tokens[idx].content)}</span>`
  }

  md.renderer.rules.math_block = (tokens, idx) => {
    return `<div class="math-display">${escapeHtml(tokens[idx].content)}</div>\n`
  }
}

function mathInlineRule(state: StateInline, silent: boolean): boolean {
  if (state.src[state.pos] !== '$') return false
  if (state.src[state.pos + 1] === '$') return false

  const start = state.pos + 1
  let end = start

  while (end < state.posMax) {
    if (state.src[end] === '$' && state.src[end - 1] !== '\\') break
    end++
  }

  if (end >= state.posMax) return false
  if (end === start) return false

  if (!silent) {
    const token = state.push('math_inline', 'math', 0)
    token.content = state.src.slice(start, end)
    token.markup = '$'
  }

  state.pos = end + 1
  return true
}

function mathBlockRule(
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean,
): boolean {
  const startPos = state.bMarks[startLine] + state.tShift[startLine]
  const maxPos = state.eMarks[startLine]

  if (startPos + 2 > maxPos) return false
  if (state.src[startPos] !== '$' || state.src[startPos + 1] !== '$') return false

  if (silent) return true

  let nextLine = startLine + 1
  let found = false

  while (nextLine < endLine) {
    const lineStart = state.bMarks[nextLine] + state.tShift[nextLine]
    const lineMax = state.eMarks[nextLine]
    const line = state.src.slice(lineStart, lineMax).trim()

    if (line === '$$') {
      found = true
      break
    }
    nextLine++
  }

  if (!found) return false

  const contentStart = state.bMarks[startLine + 1]
  const contentEnd = state.eMarks[nextLine - 1]
  const content = state.src.slice(contentStart, contentEnd).trim()

  const token = state.push('math_block', 'math', 0)
  token.content = content
  token.markup = '$$'
  token.map = [startLine, nextLine + 1]

  state.line = nextLine + 1
  return true
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
