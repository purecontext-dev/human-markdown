// @vitest-environment jsdom
import {
  defaultValueCtx,
  Editor,
  editorViewCtx,
  inputRulesCtx,
  remarkStringifyOptionsCtx,
  rootCtx,
  schemaCtx,
} from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'
import { EditorState, TextSelection } from '@milkdown/prose/state'
import { afterEach, describe, expect, it } from 'vitest'
import { bareUrlParsePlugin, bareUrlStringifyPlugin } from './bare-url-plugin'
import { keyboardNavPlugin } from './keyboard-nav'
import { linkInputRule, URL_INPUT_RULE_REGEX } from './link-input-rule'
import { nonInclusiveLinkSchema } from './non-inclusive-link'

const NBSP = String.fromCharCode(0xa0)

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
    .use(nonInclusiveLinkSchema)
    .use(bareUrlParsePlugin)
    .use(bareUrlStringifyPlugin)
    .use(linkInputRule)
    .use(keyboardNavPlugin)
    .create()
  cleanup = async () => {
    await editor.destroy()
    root.remove()
  }
  return editor
}

describe('URL_INPUT_RULE_REGEX', () => {
  it('matches a protocol URL followed by a regular space (U+0020)', () => {
    const m = 'https://github.com/jeffreese '.match(URL_INPUT_RULE_REGEX)
    expect(m?.[1]).toBe('https://github.com/jeffreese')
  })

  // The bug that shipped: a contenteditable inserts a NON-BREAKING space
  // (U+00A0) when the space bar is pressed at the end of content, so the rule
  // must match it too. jsdom inserts U+0020, which is why the old ` $` trigger
  // passed every test yet never fired in the real editor.
  it('matches a protocol URL followed by a non-breaking space (U+00A0)', () => {
    const m = `https://github.com/jeffreese${NBSP}`.match(URL_INPUT_RULE_REGEX)
    expect(m?.[1]).toBe('https://github.com/jeffreese')
  })

  it('does not match a URL without a trailing space (still typing)', () => {
    expect('https://github.com/jeffreese'.match(URL_INPUT_RULE_REGEX)).toBeNull()
  })

  // Critical: the trigger is a literal space, NOT \s. A newline trigger would
  // make the rule fire on Enter and swallow the line break (the reported bug).
  it('does NOT match a URL followed by a newline (Enter must split the line)', () => {
    expect('https://github.com/jeffreese\n'.match(URL_INPUT_RULE_REGEX)).toBeNull()
  })

  it('does NOT match a URL followed by a tab', () => {
    expect('https://github.com/jeffreese\t'.match(URL_INPUT_RULE_REGEX)).toBeNull()
  })

  it('does not match plain text', () => {
    expect('just some words '.match(URL_INPUT_RULE_REGEX)).toBeNull()
  })
})

describe('linkInputRule (the real installed rule)', () => {
  // Run the ACTUAL InputRule the plugin installs (pulled from inputRulesCtx),
  // against a doc whose text is "<url><space>". This exercises the real handler
  // — including the space-preserving / cursor-placement logic — not a separately
  // reconstructed markRule.
  interface RuleResult {
    text: string
    href: string | null
    cursorInLink: boolean
    /** Resolved cursor position in the post-edit doc. */
    cursorPos: number
    /** Character immediately before the cursor (what the user just "passed"). */
    charBeforeCursor: string
  }

  // Faithfully reproduce the prosemirror-inputrules `handleTextInput` contract:
  // the rule fires BEFORE the typed terminator (space/nbsp) is committed, so the
  // document contains ONLY the URL, and the handler is called with
  // `start` = URL start, `end` = cursor at the END of the URL (no space in doc).
  // An earlier version of this test put the space in the doc and pointed `end`
  // past it — a fiction jsdom tolerated but the real editor never produces, which
  // is why the cursor/space behavior passed here yet failed live.
  function runRule(editor: Editor, urlPlusTerminator: string): RuleResult {
    return editor.action((ctx) => {
      const schema = ctx.get(schemaCtx)
      const linkType = schema.marks.link
      const rules = ctx.get(inputRulesCtx)
      const rule = rules.find(
        (r) => (r as { match?: RegExp }).match?.source === URL_INPUT_RULE_REGEX.source,
      )
      if (!rule) throw new Error('URL input rule not registered')

      const match = urlPlusTerminator.match(URL_INPUT_RULE_REGEX)
      if (!match) throw new Error('terminator did not match the rule regex')
      const url = match[1]

      // Doc holds the URL only — the terminator is the not-yet-committed char.
      const doc = schema.node('doc', null, [schema.node('paragraph', null, [schema.text(url)])])
      let state = EditorState.create({ doc })
      const start = 1
      const end = start + url.length // cursor at end of URL
      state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, end)))

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
      const tr = handler(state, match, start, end)
      if (!tr) throw new Error('rule handler returned null')
      const next = state.apply(tr)

      let href: string | null = null
      next.doc.descendants((node) => {
        const lm = node.marks.find((m) => m.type === linkType)
        if (lm) href = lm.attrs.href as string
        return true
      })
      const cursorPos = next.selection.from
      const cursorInLink = next.doc
        .resolve(cursorPos)
        .marks()
        .some((m) => m.type === linkType)
      // The character directly before the cursor (textContent is 0-indexed;
      // doc positions are 1-indexed at the paragraph start, so pos-2 maps to it).
      const charBeforeCursor = next.doc.textContent.charAt(cursorPos - 2)
      return { text: next.doc.textContent, href, cursorInLink, cursorPos, charBeforeCursor }
    })
  }

  it('links the URL with href = url (regular space terminator)', async () => {
    const editor = await makeEditor('')
    const r = runRule(editor, 'https://github.com/jeffreese ')
    expect(r.href).toBe('https://github.com/jeffreese')
  })

  it('links the URL when the terminator is a non-breaking space (real editor case)', async () => {
    const editor = await makeEditor('')
    const r = runRule(editor, `https://github.com/jeffreese${NBSP}`)
    expect(r.href).toBe('https://github.com/jeffreese')
  })

  it('inserts a regular space after the link and moves the cursor PAST it', async () => {
    const editor = await makeEditor('')
    const r = runRule(editor, `http://test.com${NBSP}`)
    // A real U+0020 space is inserted after the URL (the live editor's nbsp is
    // not carried into the doc; the rule adds a normal space).
    expect(r.text).toBe('http://test.com ')
    expect(r.text.charCodeAt(r.text.length - 1)).toBe(0x20)
    // The reported bug: the cursor stayed in the link and no space appeared.
    // Cursor must be OUTSIDE the link and positioned AFTER the inserted space,
    // so the next keystroke is plain text following a real space.
    expect(r.cursorInLink).toBe(false)
    expect(r.charBeforeCursor).toBe(' ')
    expect(r.cursorPos).toBe(r.text.length + 1) // 1-indexed end of paragraph
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

// Regression: the rule must not interfere with pressing Enter at the end of a
// URL. With a `\s` trigger the rule fired on the newline and swallowed the line
// break; with a space trigger Enter always splits the block.
describe('Enter at the end of a URL splits the line', () => {
  function typeViaInputHandler(editor: Editor, text: string): void {
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      for (const ch of text) {
        const { from, to } = view.state.selection
        // biome-ignore lint/suspicious/noExplicitAny: someProp handler signature
        const handled = view.someProp('handleTextInput', (f: any) => f(view, from, to, ch))
        if (!handled) view.dispatch(view.state.tr.insertText(ch, from, to))
      }
    })
  }

  function pressEnter(editor: Editor): void {
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      // biome-ignore lint/suspicious/noExplicitAny: someProp handler signature
      view.someProp('handleKeyDown', (f: any) =>
        f(view, new KeyboardEvent('keydown', { key: 'Enter' })),
      )
    })
  }

  function paragraphCount(editor: Editor): number {
    return editor.action((ctx) => ctx.get(editorViewCtx).state.doc.childCount)
  }

  it('Enter directly after a URL (no trailing space) splits into a new paragraph', async () => {
    const editor = await makeEditor('')
    typeViaInputHandler(editor, 'https://github.com/jeffreese')
    expect(paragraphCount(editor)).toBe(1)
    pressEnter(editor)
    expect(paragraphCount(editor)).toBe(2)
  })

  it('Enter after a URL that was auto-linked (URL + space) still splits', async () => {
    const editor = await makeEditor('')
    typeViaInputHandler(editor, 'https://github.com/jeffreese ')
    expect(paragraphCount(editor)).toBe(1)
    pressEnter(editor)
    expect(paragraphCount(editor)).toBe(2)
  })
})

// Enter at the end of a typed URL auto-links it, mirroring the space input rule.
// The handler lives in keyboard-nav.ts (handleKeyDown) — input rules cannot do
// this, since a newline trigger there swallows the block split.
describe('Enter auto-links the URL at the end of the line', () => {
  function typeViaInputHandler(editor: Editor, text: string): void {
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      for (const ch of text) {
        const { from, to } = view.state.selection
        // biome-ignore lint/suspicious/noExplicitAny: someProp handler signature
        const handled = view.someProp('handleTextInput', (f: any) => f(view, from, to, ch))
        if (!handled) view.dispatch(view.state.tr.insertText(ch, from, to))
      }
    })
  }

  function pressEnter(editor: Editor): void {
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      // biome-ignore lint/suspicious/noExplicitAny: someProp handler signature
      view.someProp('handleKeyDown', (f: any) =>
        f(view, new KeyboardEvent('keydown', { key: 'Enter' })),
      )
    })
  }

  /** All link hrefs present anywhere in the doc, in document order. */
  function linkHrefs(editor: Editor): string[] {
    return editor.action((ctx) => {
      const hrefs: string[] = []
      ctx.get(editorViewCtx).state.doc.descendants((node) => {
        const lm = node.marks.find((m) => m.type.name === 'link')
        if (lm) hrefs.push(lm.attrs.href as string)
        return true
      })
      return hrefs
    })
  }

  it('links a URL the cursor sits at the end of when Enter is pressed', async () => {
    const editor = await makeEditor('')
    // No trailing space: the input rule did NOT fire, so the URL is plain text.
    typeViaInputHandler(editor, 'https://github.com/jeffreese')
    expect(linkHrefs(editor)).toEqual([])
    pressEnter(editor)
    expect(linkHrefs(editor)).toEqual(['https://github.com/jeffreese'])
  })

  it('links only the trailing URL, leaving preceding text alone', async () => {
    const editor = await makeEditor('')
    typeViaInputHandler(editor, 'see https://github.com/jeffreese')
    pressEnter(editor)
    expect(linkHrefs(editor)).toEqual(['https://github.com/jeffreese'])
  })

  it('does nothing when the line does not end in a URL', async () => {
    const editor = await makeEditor('')
    // Plain text with no URL — nothing for either rule to link.
    typeViaInputHandler(editor, 'just some words')
    pressEnter(editor)
    expect(linkHrefs(editor)).toEqual([])
  })

  it('does not link a URL when the cursor is not at its end', async () => {
    const editor = await makeEditor('')
    // Plain-text URL (no trailing space, so the space rule never fired).
    typeViaInputHandler(editor, 'https://github.com/jeffreese')
    expect(linkHrefs(editor)).toEqual([])
    // Move the cursor to the very start of the line, then press Enter there.
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      const start = TextSelection.create(view.state.doc, 1)
      view.dispatch(view.state.tr.setSelection(start))
    })
    pressEnter(editor)
    // The handler keys off the cursor position, not just the line's contents, so
    // a URL the cursor is NOT at the end of stays plain text.
    expect(linkHrefs(editor)).toEqual([])
  })

  it('does not re-link a URL that is already a link (no duplicate/stale mark)', async () => {
    const editor = await makeEditor('')
    // URL + space auto-links via the input rule; cursor lands after the space.
    typeViaInputHandler(editor, 'https://github.com/jeffreese ')
    expect(linkHrefs(editor)).toEqual(['https://github.com/jeffreese'])
    pressEnter(editor)
    // Still exactly one link, unchanged.
    expect(linkHrefs(editor)).toEqual(['https://github.com/jeffreese'])
  })
})

// The reported regression that the input rule could NOT fix: clicking back to
// the end of an EXISTING link and pressing space. No input rule fires here — it
// is a plain space keystroke at the link's right boundary. With an inclusive
// link mark (ProseMirror's default) the space is absorbed into the link and the
// contenteditable swallows it; the non-inclusive override (non-inclusive-link.ts)
// puts the boundary outside the mark so the space is plain text and appears.
describe('typing a space at the end of an existing link (non-inclusive mark)', () => {
  function placeCursorAtEndOfLink(editor: Editor): void {
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      let linkEnd = -1
      view.state.doc.descendants((node, pos) => {
        if (node.isText && node.marks.some((m) => m.type.name === 'link')) {
          linkEnd = pos + node.nodeSize
        }
        return true
      })
      if (linkEnd < 0) throw new Error('no link node found')
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, linkEnd)))
    })
  }

  function typeSpace(editor: Editor): void {
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      const { from, to } = view.state.selection
      // biome-ignore lint/suspicious/noExplicitAny: someProp handler signature
      const handled = view.someProp('handleTextInput', (f: any) => f(view, from, to, ' '))
      if (!handled) view.dispatch(view.state.tr.insertText(' ', from, to))
    })
  }

  function charAtCursorIsLinked(editor: Editor): { linked: boolean; text: string } {
    return editor.action((ctx) => {
      const { state } = ctx.get(editorViewCtx)
      const pos = state.selection.from
      const before = state.doc.resolve(pos)
      const linked = before.marks().some((m) => m.type.name === 'link')
      return { linked, text: state.doc.textContent }
    })
  }

  it('the typed space is inserted and is NOT part of the link', async () => {
    // Explicit `<...>` autolink stays a link on load (bare-url revert leaves it).
    const editor = await makeEditor('<http://test.com>\n')
    placeCursorAtEndOfLink(editor)
    typeSpace(editor)
    const { linked, text } = charAtCursorIsLinked(editor)
    expect(text).toBe('http://test.com ') // the space appears
    expect(linked).toBe(false) // and it is not inside the link
  })
})
