// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  Editor,
  defaultValueCtx,
  editorViewCtx,
  remarkCtx,
  remarkStringifyOptionsCtx,
  rootCtx,
  schemaCtx,
  serializerCtx,
} from '@milkdown/core'
import { replaceAll } from '@milkdown/kit/utils'
import { commonmark, linkSchema, remarkPreserveEmptyLinePlugin } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'
import { afterEach, describe, expect, it } from 'vitest'
import { patchRemarkForTightLists } from '../shared/remark-tight-lists'
import {
  githubAlertSchema,
  patchRemarkForGithubAlerts,
  remarkGithubAlertsPlugin,
} from './github-alert-plugin'
import { mathDisplaySchema, mathInlineSchema, remarkMathPlugin } from './math-plugin'
import {
  normalizeSerializedMarkdown,
  resolveWysiwygContent,
  serializeWysiwygDoc,
} from './resolve-content'

const fixturesDir = join(__dirname, '__fixtures__')

let cleanup: (() => Promise<void>) | null = null

afterEach(async () => {
  if (cleanup) {
    await cleanup()
    cleanup = null
  }
})

/**
 * Build an editor configured to match production (`index.ts`): same stringify
 * options and remark patches, so serialization drift is representative.
 */
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
    .use(remarkMathPlugin)
    .use(mathDisplaySchema)
    .use(mathInlineSchema)
    .use(remarkGithubAlertsPlugin)
    .use(githubAlertSchema)
    .create()

  // Match production (index.ts): drop the preserve-empty-line plugin so empty
  // paragraphs serialize as blank lines instead of `<br />`.
  await editor.remove(remarkPreserveEmptyLinePlugin)

  editor.action((ctx) => {
    const remark = ctx.get(remarkCtx)
    patchRemarkForTightLists(remark)
    patchRemarkForGithubAlerts(remark)
  })

  cleanup = async () => {
    await editor.destroy()
    root.remove()
  }
  return editor
}

function fixture(name: string): string {
  return readFileSync(join(fixturesDir, `${name}.md`), 'utf-8')
}

/**
 * Dispatch a real ProseMirror transaction so the live doc changes synchronously,
 * mirroring a user edit. The `markdownUpdated` listener that would refresh the
 * cached string is debounced, so at this point the cache is stale — exactly the
 * mid-debounce state when a user toggles to raw mode.
 */
function appendParagraph(editor: Editor, text: string): void {
  editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const { state } = view
    const paragraph = state.schema.nodes.paragraph.create(null, state.schema.text(text))
    const tr = state.tr.insert(state.doc.content.size, paragraph)
    view.dispatch(tr)
  })
}

describe('resolveWysiwygContent', () => {
  it('returns the live doc, not a stale cached string, after an edit', async () => {
    const editor = await makeEditor('Original line\n')
    const baseline = serializeWysiwygDoc(editor)
    appendParagraph(editor, 'Edited in WYSIWYG')

    // The cache still holds the pre-edit content (debounced listener hasn't run).
    const staleCache = 'Original line\n'
    const resolved = resolveWysiwygContent(editor, staleCache, baseline)

    expect(resolved).not.toBe(staleCache)
    expect(resolved).toContain('Edited in WYSIWYG')
    expect(resolved).toContain('Original line')
  })

  it('reflects a checkbox-style node change made without a typing race', async () => {
    const editor = await makeEditor('- [ ] task one\n')
    const baseline = serializeWysiwygDoc(editor)
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      const { state } = view
      let listItemPos = -1
      state.doc.descendants((node, pos) => {
        if (node.type.name === 'list_item' && node.attrs.checked != null && listItemPos === -1) {
          listItemPos = pos
        }
        return true
      })
      expect(listItemPos).toBeGreaterThanOrEqual(0)
      const node = state.doc.nodeAt(listItemPos)
      if (!node) throw new Error('list item not found')
      const tr = state.tr.setNodeMarkup(listItemPos, undefined, { ...node.attrs, checked: true })
      view.dispatch(tr)
    })

    const resolved = resolveWysiwygContent(editor, '- [ ] task one\n', baseline)
    expect(resolved).toContain('[x]')
  })

  it('falls back to the cached content when there is no editor (mid-init)', () => {
    expect(resolveWysiwygContent(null, 'cached value\n', null)).toBe('cached value\n')
  })

  // Round-trip fidelity: an UNEDITED drift-prone doc must return the exact disk
  // bytes (the cache), never the re-serialized (normalized) form.
  describe('no drift on unedited documents', () => {
    for (const name of ['tables', 'gfm-features', 'basic-formatting', 'lists', 'mixed-content']) {
      it(`returns disk bytes verbatim for unedited ${name}`, async () => {
        const content = fixture(name)
        const editor = await makeEditor(content)
        const baseline = serializeWysiwygDoc(editor)
        // No edit. currentContent holds the exact disk bytes.
        const resolved = resolveWysiwygContent(editor, content, baseline)
        expect(resolved).toBe(content)
      })
    }
  })

  it('returns net-unchanged disk bytes after an edit is undone', async () => {
    const content = fixture('gfm-features')
    const editor = await makeEditor(content)
    const baseline = serializeWysiwygDoc(editor)

    // Edit then revert to the original doc (simulating type + undo).
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      const { state } = view
      const para = state.schema.nodes.paragraph.create(null, state.schema.text('scratch'))
      view.dispatch(state.tr.insert(state.doc.content.size, para))
    })
    editor.action(replaceAll(content, true))

    // Live serialization now equals the original baseline, so disk bytes (not the
    // re-serialized form) come back — compared against the baseline from load time.
    const resolved = resolveWysiwygContent(editor, content, baseline)
    expect(resolved).toBe(content)
  })

  it('re-anchors after an external update: unedited toggle returns the new bytes', async () => {
    const original = fixture('basic-formatting')
    const editor = await makeEditor(original)

    // Simulate the host pushing new disk bytes (external file change).
    const updated = fixture('gfm-features')
    editor.action(replaceAll(updated, true))
    const newBaseline = serializeWysiwygDoc(editor)

    // No WYSIWYG edit after the update. Must return the new disk bytes verbatim,
    // not a re-serialized (drifted) version of them.
    const resolved = resolveWysiwygContent(editor, updated, newBaseline)
    expect(resolved).toBe(updated)
  })

  // raw -> rich text -> raw must not normalize content the serializer would
  // escape (e.g. `http://` -> `http\://`) when the user never edited in rich
  // text. The fix re-anchors the baseline when content loads from raw, so an
  // untouched round-trip returns the faithful raw `currentContent`.
  it('preserves serializer-normalizable raw text across an untouched round-trip', async () => {
    const rawText = 'Visit http://example.com now\n'
    // Confirm the serializer would otherwise drift this (guards the test's premise).
    const editor = await makeEditor('placeholder\n')
    editor.action(replaceAll(rawText, true))
    const driftedBaseline = serializeWysiwygDoc(editor)
    expect(driftedBaseline).not.toBe(rawText)

    // Baseline re-anchored to the just-loaded raw content (as setMode now does).
    // currentContent holds the faithful raw text from CodeMirror.
    const resolved = resolveWysiwygContent(editor, rawText, driftedBaseline)
    expect(resolved).toBe(rawText)

    // Teeth: a STALE baseline (anything that differs from the live serialization)
    // makes the same call drift — exactly the bug the raw->preview re-anchor fixes.
    const staleBaseline = 'placeholder\n'
    expect(resolveWysiwygContent(editor, rawText, staleBaseline)).toBe(driftedBaseline)
  })
})

describe('normalizeSerializedMarkdown', () => {
  it('strips a trailing `&#x20;` entity at end of line', () => {
    expect(normalizeSerializedMarkdown('<http://test.com>&#x20;\n')).toBe('<http://test.com>\n')
  })

  it('strips literal trailing spaces and tabs', () => {
    expect(normalizeSerializedMarkdown('some text   \n')).toBe('some text\n')
    expect(normalizeSerializedMarkdown('tabbed\t\n')).toBe('tabbed\n')
  })

  it('trims every line, not just the last', () => {
    expect(normalizeSerializedMarkdown('a&#x20;\nb   \nc\n')).toBe('a\nb\nc\n')
  })

  it('leaves a space that is followed by content untouched', () => {
    expect(normalizeSerializedMarkdown('<http://test.com> for details\n')).toBe(
      '<http://test.com> for details\n',
    )
  })

  // Regression: a hard break in this pipeline serializes as a trailing backslash
  // (`line\`), NOT two trailing spaces, so trimming trailing whitespace must not
  // touch it. If the serializer ever emitted space-style hard breaks this would
  // catch the regression.
  it('does not corrupt a backslash hard break', () => {
    expect(normalizeSerializedMarkdown('line one\\\nline two\n')).toBe('line one\\\nline two\n')
  })
})

describe('empty paragraph serialization (no <br />)', () => {
  // The reported "Enter inserts a hardbreak/<br />" bug. Pressing Enter creates a
  // clean empty paragraph node (verified in the live editor); the `<br />` came
  // from Milkdown's preserve-empty-line plugin serializing empty paragraphs to a
  // literal `<br />`. Production removes that plugin (see index.ts), which
  // makeEditor mirrors, so an empty paragraph must serialize as a blank line.
  function insertEmptyParagraphAfterFirst(editor: Editor): void {
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      const { state } = view
      // Position just after the first block's closing boundary.
      const firstBlockEnd = state.doc.child(0).nodeSize
      const empty = state.schema.nodes.paragraph.create()
      view.dispatch(state.tr.insert(firstBlockEnd, empty))
    })
  }

  it('serializes an empty paragraph as a blank line, not <br />', async () => {
    const editor = await makeEditor('First paragraph\n')
    insertEmptyParagraphAfterFirst(editor)

    const out = serializeWysiwygDoc(editor)
    expect(out).not.toContain('<br />')
    expect(out).toContain('First paragraph')
  })

  it('does not emit <br /> when serializing a freshly split paragraph', async () => {
    // Two paragraphs with an empty one between them (the Enter-at-block-end shape).
    const editor = await makeEditor('Above\n\nBelow\n')
    insertEmptyParagraphAfterFirst(editor)

    const out = serializeWysiwygDoc(editor)
    expect(out).not.toContain('<br />')
  })
})

describe('serializeWysiwygDoc: &#x20; corruption (the reported bug)', () => {
  // A URL typed in rich text is auto-linked with a real trailing space for
  // natural cursor flow (link-input-rule.ts). When the URL is alone on a line,
  // that space lands at block-end and the serializer escapes it to `&#x20;`.
  // serializeWysiwygDoc must return clean markdown via normalizeSerializedMarkdown.
  it('a link followed by a block-end space does not serialize to &#x20;', async () => {
    const editor = await makeEditor('')
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      const schema = ctx.get(schemaCtx)
      const linkType = linkSchema.type(ctx)
      const url = 'http://test.com'
      const linked = schema.text(url, [linkType.create({ href: url })])
      const space = schema.text(' ')
      const para = schema.node('paragraph', null, [linked, space])
      const tr = view.state.tr.replaceWith(0, view.state.doc.content.size, para)
      view.dispatch(tr)
    })

    // Proof the raw serializer produces the corruption this guard removes.
    const raw = editor.action((ctx) => ctx.get(serializerCtx)(ctx.get(editorViewCtx).state.doc))
    expect(raw).toContain('&#x20;')

    // serializeWysiwygDoc must hand back clean bytes.
    expect(serializeWysiwygDoc(editor)).toBe('<http://test.com>\n')
  })
})
