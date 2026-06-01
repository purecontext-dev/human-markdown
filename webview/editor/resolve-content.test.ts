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
import { replaceAll } from '@milkdown/kit/utils'
import { commonmark } from '@milkdown/preset-commonmark'
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
})
