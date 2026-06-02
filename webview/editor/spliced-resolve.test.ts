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
} from '@milkdown/core'
import { commonmark, remarkPreserveEmptyLinePlugin } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'
import { afterEach, describe, expect, it } from 'vitest'
import { patchRemarkForTightLists } from '../shared/remark-tight-lists'
import {
  githubAlertSchema,
  patchRemarkForGithubAlerts,
  remarkGithubAlertsPlugin,
} from './github-alert-plugin'
import { mathDisplaySchema, mathInlineSchema, remarkMathPlugin } from './math-plugin'
import { resolveWysiwygContent, serializeWysiwygDoc } from './resolve-content'
import { buildSourceMap } from './source-splice'

const fixturesDir = join(__dirname, '__fixtures__')

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
    .use(remarkMathPlugin)
    .use(mathDisplaySchema)
    .use(mathInlineSchema)
    .use(remarkGithubAlertsPlugin)
    .use(githubAlertSchema)
    .create()

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

function captureBaseline(editor: Editor): string {
  const s = serializeWysiwygDoc(editor)
  if (s === null) throw new Error('editor not initialized')
  return s
}

function appendParagraph(editor: Editor, text: string): void {
  editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const { state } = view
    const paragraph = state.schema.nodes.paragraph.create(null, state.schema.text(text))
    const tr = state.tr.insert(state.doc.content.size, paragraph)
    view.dispatch(tr)
  })
}

describe('spliced resolve: edit one block, preserve others', () => {
  it('preserves untouched blocks byte-identical after editing a single block', async () => {
    const content = fixture('basic-formatting')
    const editor = await makeEditor(content)
    const baseline = captureBaseline(editor)
    const map = buildSourceMap(content, baseline)

    appendParagraph(editor, 'Brand new paragraph added by user')

    const resolved = resolveWysiwygContent(editor, content, baseline, map)

    // The appended paragraph appears
    expect(resolved).toContain('Brand new paragraph added by user')

    // All original blocks from the fixture should be preserved as disk bytes.
    // Split on blank lines and check each block appears verbatim.
    const originalBlocks = content.replace(/\n+$/, '').split(/\n\n+/)
    for (const block of originalBlocks) {
      expect(resolved).toContain(block)
    }
  })

  it('preserves GFM autolink formatting on untouched blocks', async () => {
    const content = fixture('gfm-features')
    const editor = await makeEditor(content)
    const baseline = captureBaseline(editor)
    const map = buildSourceMap(content, baseline)

    appendParagraph(editor, 'User edit here')
    const resolved = resolveWysiwygContent(editor, content, baseline, map)

    // The serializer would normally wrap bare URLs in angle brackets.
    // Splicing should preserve the original bare URL.
    expect(resolved).toContain('Visit https://example.com for details.')
    expect(resolved).not.toMatch(/Visit <https:\/\/example\.com>/)
  })

  it('preserves list markers on untouched list blocks', async () => {
    const content = '# Doc\n\n* Item one\n* Item two\n\nSome paragraph.\n'
    const editor = await makeEditor(content)
    const baseline = captureBaseline(editor)
    const map = buildSourceMap(content, baseline)

    // Edit the trailing paragraph, leaving the list untouched
    appendParagraph(editor, 'New paragraph at end')
    const resolved = resolveWysiwygContent(editor, content, baseline, map)

    // Milkdown normalizes * to - (our stringify option). But the list block
    // is untouched so splicing should preserve the original *.
    expect(resolved).toContain('* Item one')
    expect(resolved).toContain('* Item two')
  })

  it('falls back gracefully to full serialization when structure changes', async () => {
    const content = fixture('basic-formatting')
    const editor = await makeEditor(content)
    const baseline = captureBaseline(editor)
    const map = buildSourceMap(content, baseline)

    // Make a big structural change (delete blocks by replacing all)
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      const { state } = view
      const paragraph = state.schema.nodes.paragraph.create(
        null,
        state.schema.text('Completely new'),
      )
      const tr = state.tr.replaceWith(0, state.doc.content.size, paragraph)
      view.dispatch(tr)
    })

    const resolved = resolveWysiwygContent(editor, content, baseline, map)

    // Should still produce valid content (fallback to live serialization)
    expect(resolved).toContain('Completely new')
  })

  for (const name of ['basic-formatting', 'lists', 'mixed-content', 'code-blocks']) {
    it(`returns exact disk bytes for unedited ${name} (splice path does not regress)`, async () => {
      const content = fixture(name)
      const editor = await makeEditor(content)
      const baseline = captureBaseline(editor)
      const map = buildSourceMap(content, baseline)

      // No edit. The unedited fast path should still return disk bytes.
      const resolved = resolveWysiwygContent(editor, content, baseline, map)
      expect(resolved).toBe(content)
    })
  }

  it('setext headings: block counts match but heading blocks are treated as edited', async () => {
    const content = fixture('setext-headings')
    const editor = await makeEditor(content)
    const baseline = captureBaseline(editor)
    const map = buildSourceMap(content, baseline)

    // Setext headings ("Title\n===") stay within one blank-line-separated block,
    // so block counts match. But the disk block content differs from the baseline
    // block content ("# Title"), so LCS won't match them — they get reserialized.
    // Paragraph blocks are unchanged and get disk bytes.
    expect(map.diskBlocks.length).toBe(map.baselineBlocks.length)

    appendParagraph(editor, 'New content')
    const resolved = resolveWysiwygContent(editor, content, baseline, map)

    expect(resolved).toContain('New content')
    // Paragraph blocks preserved from disk
    expect(resolved).toContain('Some body text here.')
    expect(resolved).toContain('Another paragraph below.')
  })
})
