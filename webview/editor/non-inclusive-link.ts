import { linkSchema } from '@milkdown/preset-commonmark'

/**
 * Make the `link` mark non-inclusive.
 *
 * ProseMirror treats a mark as **inclusive** unless its spec sets
 * `inclusive: false` (prosemirror-model reads `spec.inclusive === false` when
 * deciding which marks survive at a position boundary). Milkdown's stock link
 * mark leaves `inclusive` unset, so it defaults to inclusive: the cursor at the
 * *end* of a link is considered inside it, and anything typed there — including a
 * space — continues the link. In a contenteditable that swallows a trailing
 * space at the link boundary, producing the reported bug: type a URL (or click
 * back to the end of an existing link) and a space never appears.
 *
 * Setting `inclusive: false` puts the boundary *outside* the mark, so:
 * - typing at the end of a link is plain text (the space appears, unlinked),
 * - this holds for the click-back-and-type case too (no input rule involved),
 * - the auto-link input rule's inserted trailing space lands outside the link.
 *
 * `extendSchema` returns a new `$markSchema` with the same id (`'link'`); used
 * AFTER `commonmark`, it overwrites the link mark in `marksCtx` (which de-dupes
 * by id), so the whole editor gets the non-inclusive variant.
 */
export const nonInclusiveLinkSchema = linkSchema.extendSchema((prev) => (ctx) => ({
  ...prev(ctx),
  inclusive: false,
}))
