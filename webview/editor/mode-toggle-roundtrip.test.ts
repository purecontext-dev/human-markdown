// @vitest-environment jsdom
import {
  defaultValueCtx,
  Editor,
  editorViewCtx,
  remarkCtx,
  remarkStringifyOptionsCtx,
  rootCtx,
} from '@milkdown/core'
import { listener, listenerCtx } from '@milkdown/plugin-listener'
import { commonmark } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { patchRemarkForTightLists } from '../shared/remark-tight-lists'
import {
  githubAlertSchema,
  patchRemarkForGithubAlerts,
  remarkGithubAlertsPlugin,
} from './github-alert-plugin'
import { replaceAllFlush } from './history-plugin'
import { mathDisplaySchema, mathInlineSchema, remarkMathPlugin } from './math-plugin'
import {
  normalizeSerializedMarkdown,
  resolveWysiwygContent,
  serializeWysiwygDoc,
} from './resolve-content'

/**
 * Faithfully models the mode-toggle content flow from index.ts, including the
 * *debounced* `markdownUpdated` listener that writes `currentContent`. The
 * earlier unit tests called the resolver directly and so missed the bug where
 * the debounced listener echo (firing ~200ms after a programmatic load, past
 * the synchronous suppress flags) overwrote `currentContent` with the serialized
 * form — drifting `http://` to `http\://` on a raw -> rich text -> raw round-trip.
 *
 * This harness reproduces that timing with fake timers and asserts the fix: the
 * listener ignores an update equal to the load baseline (the echo), so faithful
 * raw text survives, while genuine rich-text edits are still recorded.
 */
class Harness {
  currentContent: string
  baselineSerialized: string | null = null
  dirty = false
  private suppressMilkdownUpdate = false
  private syncingContent = true
  private editor!: Editor
  private root: HTMLElement

  private constructor(initial: string) {
    this.currentContent = initial
    this.root = document.createElement('div')
    document.body.appendChild(this.root)
  }

  static async create(initial: string): Promise<Harness> {
    const h = new Harness(initial)
    h.editor = await Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, h.root)
        ctx.set(defaultValueCtx, initial)
        ctx.set(remarkStringifyOptionsCtx, { bullet: '-', rule: '-' })
        // Mirrors index.ts markdownUpdated listener, including the stale snapshot
        // and programmatic-load echo guards.
        ctx.get(listenerCtx).markdownUpdated((_ctx, rawMarkdown) => {
          if (h.suppressMilkdownUpdate || h.syncingContent) return
          const markdown = normalizeSerializedMarkdown(rawMarkdown)
          if (markdown !== serializeWysiwygDoc(h.editor)) return
          if (markdown === h.baselineSerialized) return
          h.currentContent = markdown
          h.dirty = true
        })
      })
      .use(commonmark)
      .use(gfm)
      .use(remarkMathPlugin)
      .use(mathDisplaySchema)
      .use(mathInlineSchema)
      .use(remarkGithubAlertsPlugin)
      .use(githubAlertSchema)
      .use(listener)
      .create()
    h.editor.action((ctx) => {
      const remark = ctx.get(remarkCtx)
      patchRemarkForTightLists(remark)
      patchRemarkForGithubAlerts(remark)
    })
    h.syncingContent = false
    h.baselineSerialized = serializeWysiwygDoc(h.editor)
    return h
  }

  /** Mirrors setMode's raw -> preview branch (index.ts:151-169). */
  enterPreviewFromRaw(rawText: string): void {
    this.currentContent = rawText
    this.syncingContent = true
    this.suppressMilkdownUpdate = true
    this.editor.action(replaceAllFlush(rawText))
    this.suppressMilkdownUpdate = false
    this.syncingContent = false
    this.baselineSerialized = serializeWysiwygDoc(this.editor)
  }

  /** Mirrors setMode's preview -> raw branch (index.ts:179). */
  enterRawFromPreview(): void {
    this.currentContent = resolveWysiwygContent(
      this.editor,
      this.currentContent,
      this.baselineSerialized,
    )
  }

  editInRichText(text: string): void {
    this.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      const { state } = view
      const para = state.schema.nodes.paragraph.create(null, state.schema.text(text))
      view.dispatch(state.tr.insert(state.doc.content.size, para))
    })
  }

  async dispose(): Promise<void> {
    await this.editor.destroy()
    this.root.remove()
  }
}

let harness: Harness | null = null
afterEach(async () => {
  if (harness) {
    await harness.dispose()
    harness = null
  }
  vi.useRealTimers()
})

describe('mode-toggle round-trip', () => {
  // Each case: type the raw text, toggle to rich text, let the debounce fire,
  // toggle back. The raw text must survive verbatim and the doc stay clean.
  for (const raw of ['http://\n', 'a * b\n', 'see https://example.com here\n']) {
    it(`preserves ${JSON.stringify(raw)} across raw -> rich text -> raw`, async () => {
      vi.useFakeTimers()
      harness = await Harness.create('start\n')

      harness.enterPreviewFromRaw(raw)
      await vi.advanceTimersByTimeAsync(300) // debounced echo fires here
      harness.enterRawFromPreview()

      expect(harness.currentContent).toBe(raw)
      expect(harness.dirty).toBe(false)
    })
  }

  it('still records a genuine rich-text edit after the round-trip', async () => {
    vi.useFakeTimers()
    harness = await Harness.create('hello\n')

    harness.enterPreviewFromRaw('hello\n')
    harness.editInRichText('world')
    await vi.advanceTimersByTimeAsync(300)
    harness.enterRawFromPreview()

    expect(harness.dirty).toBe(true)
    expect(harness.currentContent).toContain('world')
    expect(harness.currentContent).toContain('hello')
  })
})
