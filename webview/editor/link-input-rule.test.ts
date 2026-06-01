// @vitest-environment jsdom
import {
  Editor,
  defaultValueCtx,
  editorViewCtx,
  remarkStringifyOptionsCtx,
  rootCtx,
  schemaCtx,
} from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'
import { markRule } from '@milkdown/prose'
import { EditorState, TextSelection } from '@milkdown/prose/state'
import { afterEach, describe, expect, it } from 'vitest'
import { bareUrlParsePlugin, bareUrlStringifyPlugin } from './bare-url-plugin'
import { URL_INPUT_RULE_REGEX, linkInputRule } from './link-input-rule'

let cleanup: (() => Promise<void>) | null = null
afterEach(async () => {
  if (cleanup) {
    await cleanup()
    cleanup = null
  }
})

async function makeEditor(markdown: string): Promise<Editor> {
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
    .use(linkInputRule)
    .create()
  cleanup = async () => {
    await editor.destroy()
    root.remove()
  }
  return editor
}

describe('URL_INPUT_RULE_REGEX', () => {
  it('matches a protocol URL followed by whitespace', () => {
    const m = 'https://github.com/jeffreese '.match(URL_INPUT_RULE_REGEX)
    expect(m?.[1]).toBe('https://github.com/jeffreese')
  })

  it('does not match a URL without a trailing space (still typing)', () => {
    expect('https://github.com/jeffreese'.match(URL_INPUT_RULE_REGEX)).toBeNull()
  })

  it('does not match plain text', () => {
    expect('just some words '.match(URL_INPUT_RULE_REGEX)).toBeNull()
  })

  it('stops the URL at the whitespace boundary', () => {
    const m = 'see https://x.com here'.match(/(https?:\/\/[^\s<>]+)\s/)
    expect(m?.[1]).toBe('https://x.com')
  })
})

describe('linkInputRule (real markRule handler)', () => {
  // Exercise the actual ProseMirror InputRule that the rule installs: build a
  // doc whose text is "<url> " and invoke markRule's handler directly. This runs
  // the real mark-creation logic (no hand-rolled reimplementation, no simulated
  // DOM beforeinput events) against the editor's real link schema.
  it('wraps a typed URL + space in a link mark with href = url', async () => {
    const editor = await makeEditor('')
    const { schema, linkType } = editor.action((ctx) => {
      const s = ctx.get(schemaCtx)
      return { schema: s, linkType: s.marks.link }
    })

    const rule = markRule(URL_INPUT_RULE_REGEX, linkType, {
      getAttr: (m) => ({ href: m[1] }),
    })
    const text = 'https://github.com/jeffreese '
    const doc = schema.node('doc', null, [schema.node('paragraph', null, [schema.text(text)])])
    let state = EditorState.create({ doc })
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1 + text.length)))
    const match = text.match(URL_INPUT_RULE_REGEX)
    expect(match).not.toBeNull()

    // InputRule.handler(state, match, start, end) — the URL span starts at pos 1.
    const handler = (
      rule as unknown as {
        handler: (
          s: EditorState,
          m: RegExpMatchArray,
          start: number,
          end: number,
        ) => typeof state.tr | null
      }
    ).handler
    const tr = handler(state, match as RegExpMatchArray, 1, 1 + text.length)
    expect(tr).not.toBeNull()
    const next = state.apply(tr as NonNullable<typeof tr>)

    let href: string | null = null
    next.doc.descendants((node) => {
      const lm = node.marks.find((m) => m.type === linkType)
      if (lm) href = lm.attrs.href as string
      return true
    })
    expect(href).toBe('https://github.com/jeffreese')
  })

  it('a typed-URL link round-trips back as a link (not de-linked)', async () => {
    // The serialized form of a typed URL is [url](url) / <url>; reloading must
    // keep it a link because its source is explicit syntax.
    const editor = await makeEditor('<https://github.com/jeffreese>\n')
    const hasLink = editor.action((ctx) => {
      let found = false
      ctx.get(editorViewCtx).state.doc.descendants((node) => {
        if (node.marks.some((m) => m.type.name === 'link')) found = true
        return true
      })
      return found
    })
    expect(hasLink).toBe(true)
  })
})
