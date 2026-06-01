import { $remark } from '@milkdown/kit/utils'

/**
 * Bare URLs as plain text (not auto-links).
 *
 * GFM's autolink-literal feature turns bare URLs (`https://x`, `www.x`,
 * `me@x.com`) into link nodes on load. In a WYSIWYG editor that is harmful: the
 * link's visible text and its `href` are independent, so editing the text leaves
 * a stale href and the URL serializes as `[editedText](originalUrl)` — silent
 * corruption. The product decision (see PR discussion) is that bare URLs are
 * plain text in rich text; only *explicit* link syntax (`<url>` autolinks and
 * `[label](url)` links) stays clickable. Typing a URL in rich text creates a
 * link via a separate input rule (see link-input-rule.ts).
 *
 * autolink-literal has two coupled halves, so we disable both:
 *
 * 1. **Parse side** ({@link remarkRevertAutolinkLiterals}): revert link nodes
 *    that came from autolink-literal back to text. They are indistinguishable
 *    from explicit links as *mdast nodes* (both are `link` nodes), but the
 *    original source slice at `node.position` is decisive: an explicit link's
 *    source starts with `<` or `[`; an autolink-literal's does not.
 *
 * 2. **Stringify side** ({@link remarkStripAutolinkLiteralEscape}): autolink-
 *    literal's `toMarkdown` extension adds `unsafe` rules that escape `:`/`@`/`.`
 *    in URL-ish text (so a plain-text URL would not be re-linkified). With the
 *    parse side reverting bare URLs anyway, that escape only produces drift
 *    (`https://x` -> `https\://x`). We remove just that one extension, leaving
 *    every other escape (and table/strikethrough/task-list serialization) intact.
 *
 * Upgrade note: both halves reach into remark-gfm internals that have no public
 * toggle (confirmed: remark-gfm options expose no autolink switch). The parse
 * side depends only on stable mdast shape (`link` node + `position`). The
 * stringify side identifies the extension by its `unsafe` signature rather than
 * by import identity, so it degrades safely (removes nothing) if that shape
 * changes on a major upgrade — covered by tests that would catch a regression.
 */

interface MdastNode {
  type: string
  url?: string
  value?: string
  children?: MdastNode[]
  position?: { start: { offset: number }; end: { offset: number } }
}

/** A link is explicit (keep it) when its source begins with `<` or `[`. */
function isExplicitLinkSource(slice: string): boolean {
  return slice.startsWith('<') || slice.startsWith('[')
}

function revertAutolinkLiterals(tree: MdastNode, source: string): void {
  if (!tree.children) return
  for (let i = 0; i < tree.children.length; i++) {
    const child = tree.children[i]
    const single = child.children?.length === 1 ? child.children[0] : undefined
    if (child.type === 'link' && child.position && single?.type === 'text') {
      const slice = source.slice(child.position.start.offset, child.position.end.offset)
      if (!isExplicitLinkSource(slice)) {
        tree.children[i] = { type: 'text', value: single.value }
        continue
      }
    }
    revertAutolinkLiterals(child, source)
  }
}

/**
 * Remark transform: revert autolink-literal link nodes to plain text. The
 * unified transformer receives the VFile as its second argument; `String(file)`
 * is the original markdown source, used to read each link's source slice.
 *
 * Typed loosely (the tree is treated as our structural `MdastNode`) to match the
 * project's existing remark-patch style; unified's strict `Root` type is narrowed
 * internally rather than threaded through.
 */
export function remarkRevertAutolinkLiterals() {
  // biome-ignore lint/suspicious/noExplicitAny: unified Root vs. our structural MdastNode
  return (tree: any, file: unknown): void => {
    revertAutolinkLiterals(tree as MdastNode, String(file))
  }
}

/**
 * The `:` escape rule autolink-literal's toMarkdown extension registers
 * (escape a colon after `p`/`s`, before `/` — i.e. in `http:`/`https:`). Used to
 * fingerprint that extension among the gfm toMarkdown extensions.
 */
function isAutolinkLiteralToMarkdown(sub: unknown): boolean {
  if (!sub || typeof sub !== 'object') return false
  const ext = sub as { unsafe?: unknown; handlers?: unknown }
  return (
    Array.isArray(ext.unsafe) &&
    !ext.handlers &&
    ext.unsafe.some(
      (u): u is { character: string; after: string } =>
        !!u &&
        typeof u === 'object' &&
        (u as { character?: unknown }).character === ':' &&
        (u as { after?: unknown }).after === '\\/',
    )
  )
}

/**
 * Remark attacher: remove autolink-literal's toMarkdown extension so plain-text
 * URLs serialize verbatim instead of with escaped `:`/`@`/`.`. Must be a plain
 * `function` (not an arrow) so unified binds the processor as `this`, giving
 * access to `this.data().toMarkdownExtensions`.
 */
// biome-ignore lint/suspicious/noExplicitAny: reaching into the unified processor's data()
export function remarkStripAutolinkLiteralEscape(this: any) {
  const data = this.data()
  const extensions: Array<{ extensions?: unknown[] }> = data.toMarkdownExtensions ?? []
  for (const ext of extensions) {
    if (ext && Array.isArray(ext.extensions)) {
      ext.extensions = ext.extensions.filter((sub) => !isAutolinkLiteralToMarkdown(sub))
    }
  }
}

export const bareUrlParsePlugin = $remark('bareUrlRevert', () => remarkRevertAutolinkLiterals)

export const bareUrlStringifyPlugin = $remark(
  'bareUrlStripEscape',
  () => remarkStripAutolinkLiteralEscape,
)
