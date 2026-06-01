import { editorViewCtx, serializerCtx } from '@milkdown/core'
import type { Editor } from '@milkdown/core'

/**
 * Strip trailing whitespace (literal spaces and the `&#x20;` numeric character
 * reference) from the end of every line of serialized markdown.
 *
 * mdast-util-to-markdown escapes a space to `&#x20;` when it is the last thing
 * in a block (significant-whitespace protection: a bare trailing space would be
 * stripped on re-parse, so it encodes it to survive the round-trip). Our URL
 * auto-link rule (link-input-rule.ts) leaves a real space after a freshly linked
 * URL for natural cursor flow; when that URL is alone on a line, the trailing
 * space lands at block-end and serializes to the corrupt-looking `<url>&#x20;`.
 *
 * Trimming is round-trip-faithful here: this pipeline already drops a parsed
 * trailing space (`http://x \n` -> `http://x\n`) and emits hard breaks as a
 * backslash (`line\`), never as trailing spaces — so no significant whitespace
 * is encoded as a line-end space to begin with. This makes the typed-link path
 * match the parsed path instead of introducing new behavior.
 *
 * Applied at every seam where serialized markdown leaves the editor (the
 * `markdownUpdated` listener, mode toggle, and save) so the saved bytes, the
 * dirty-detection baseline, and the toggled raw view all agree.
 */
export function normalizeSerializedMarkdown(markdown: string): string {
  return markdown.replace(/(?:&#x20;|[ \t])+$/gm, '')
}

function serialize(editor: Editor): string {
  return editor.action((ctx) => {
    const serializer = ctx.get(serializerCtx)
    const view = ctx.get(editorViewCtx)
    return normalizeSerializedMarkdown(serializer(view.state.doc))
  })
}

/**
 * Resolve the authoritative markdown for the WYSIWYG editor at a read point
 * (mode toggle, save).
 *
 * Two competing requirements:
 *
 * 1. **No lost edits.** The cached `currentContent` string is updated by
 *    Milkdown's `markdownUpdated` listener, which is debounced (200ms). Reading
 *    the cache at a toggle/save within that window showed/saved stale, pre-edit
 *    content — the data-loss bug this guards.
 *
 * 2. **No round-trip drift.** When the document is *unedited*, `currentContent`
 *    holds the exact disk bytes. Serializing the live Milkdown doc instead can
 *    normalize formatting (e.g. `https://x` -> `<https://x>`, table padding),
 *    violating round-trip fidelity on a file the user never edited.
 *
 * Reconciled by comparing the live serialization against the serialization of
 * the last authoritative load (`baselineSerialized`, captured whenever the doc
 * is (re)loaded from disk). If they match, nothing serialization-relevant
 * changed, so we return the faithful cached disk bytes. If they differ, the user
 * edited, so we return the live serialization. This also handles edit-then-undo
 * (net-unchanged -> treated as unedited) and external file updates (a new
 * baseline is captured at the load point, so the fresh disk bytes are faithful).
 */
export function resolveWysiwygContent(
  editor: Editor | null,
  cachedContent: string,
  baselineSerialized: string | null,
): string {
  if (!editor) return cachedContent
  const live = serialize(editor)
  if (baselineSerialized !== null && live === baselineSerialized) {
    return cachedContent
  }
  return live
}

/**
 * Serialize the editor's current document to markdown. Called at authoritative
 * load points to capture the clean baseline that {@link resolveWysiwygContent}
 * compares against. Returns null if there is no editor yet.
 */
export function serializeWysiwygDoc(editor: Editor | null): string | null {
  if (!editor) return null
  return serialize(editor)
}
