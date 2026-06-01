// @vitest-environment jsdom
import {
  Editor,
  defaultValueCtx,
  editorViewCtx,
  remarkStringifyOptionsCtx,
  rootCtx,
  serializerCtx,
} from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'
import { afterEach, describe, expect, it } from 'vitest'
import { bareUrlParsePlugin, bareUrlStringifyPlugin } from './bare-url-plugin'

let cleanup: (() => Promise<void>) | null = null
afterEach(async () => {
  if (cleanup) {
    await cleanup()
    cleanup = null
  }
})

async function load(markdown: string): Promise<Editor> {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const editor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, markdown)
      ctx.set(remarkStringifyOptionsCtx, { bullet: '-', rule: '-' })
    })
    .use(commonmark)
    .use(gfm)
    .use(bareUrlParsePlugin)
    .use(bareUrlStringifyPlugin)
    .create()
  cleanup = async () => {
    await editor.destroy()
    root.remove()
  }
  return editor
}

function serialize(editor: Editor): string {
  return editor.action((ctx) => ctx.get(serializerCtx)(ctx.get(editorViewCtx).state.doc))
}

function hasLinkMark(editor: Editor): boolean {
  return editor.action((ctx) => {
    let found = false
    ctx.get(editorViewCtx).state.doc.descendants((node) => {
      if (node.marks.some((m) => m.type.name === 'link')) found = true
      return true
    })
    return found
  })
}

describe('bare URL handling', () => {
  describe('bare URLs become plain text', () => {
    const bareCases: [string, string][] = [
      ['protocol URL alone', 'https://github.com/jeffreese\n'],
      ['protocol URL in a sentence', 'See https://github.com/jeffreese now\n'],
      ['www URL', 'visit www.example.com today\n'],
      ['email', 'mail me@example.com please\n'],
    ]
    for (const [name, md] of bareCases) {
      it(`${name}: not a link, serializes verbatim`, async () => {
        const editor = await load(md)
        expect(hasLinkMark(editor)).toBe(false)
        expect(serialize(editor)).toBe(md)
      })
    }
  })

  describe('explicit link syntax stays a link', () => {
    const linkCases: [string, string, string][] = [
      // name, input, expected serialization (may normalize, but stays a link)
      ['angle autolink', '<https://github.com/jeffreese>\n', '<https://github.com/jeffreese>\n'],
      ['angle email', '<me@example.com>\n', '<me@example.com>\n'],
      [
        'labeled link',
        '[my repo](https://github.com/jeffreese)\n',
        '[my repo](https://github.com/jeffreese)\n',
      ],
      // label == url is what a URL typed in rich text serializes to; it must
      // round-trip as a link, not get de-linked.
      ['label equals url', '[https://x.com](https://x.com)\n', '<https://x.com>\n'],
    ]
    for (const [name, md] of linkCases) {
      it(`${name}: stays a link`, async () => {
        const editor = await load(md)
        expect(hasLinkMark(editor)).toBe(true)
      })
    }
  })

  it('mixed line: de-links bare, keeps labeled and angle', async () => {
    const editor = await load('a https://x.com and [b](https://y.com) and <https://z.com>\n')
    const out = serialize(editor)
    expect(out).toContain('a https://x.com and') // bare -> plain text, no escape
    expect(out).toContain('[b](https://y.com)') // labeled kept
    expect(out).toContain('<https://z.com>') // angle kept
    expect(out).not.toContain('https\\://') // no colon escape drift
  })

  it('does not corrupt author escapes or break gfm features', async () => {
    const table = await load('| a | b |\n| --- | --- |\n| 1 | 2 |\n')
    expect(serialize(table)).toContain('| a | b |')

    const strike = await load('~~gone~~\n')
    expect(serialize(strike)).toBe('~~gone~~\n')

    const task = await load('- [ ] todo\n')
    expect(serialize(task)).toBe('- [ ] todo\n')

    // An author's intentional `\*` escape must survive (regression guard for the
    // global-unescape approach that corrupted these).
    const escaped = await load('a literal \\* asterisk\n')
    expect(serialize(escaped)).toContain('\\*')
  })

  it('round-trips a bare URL unchanged through two passes', async () => {
    const md = 'https://github.com/jeffreese\n'
    const first = serialize(await load(md))
    expect(first).toBe(md)
    const second = serialize(await load(first))
    expect(second).toBe(md)
  })
})
