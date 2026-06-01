import { $inputRule } from '@milkdown/kit/utils'
import { linkSchema } from '@milkdown/preset-commonmark'
import { InputRule } from '@milkdown/prose/inputrules'
import { TextSelection } from '@milkdown/prose/state'

/**
 * Auto-link a URL typed in the WYSIWYG editor.
 *
 * Bare URLs from the markdown source are kept as plain text (see
 * bare-url-plugin.ts). But a URL *typed in rich text* is taken as intent to
 * create a link — rich text is a "compose links" surface. When the user types a
 * URL followed by a space, wrap it in a `link` mark whose `href` is the URL. On
 * serialization this becomes `[url](url)` / `<url>` (text === href), which
 * round-trips back as an explicit link (the bare-url revert leaves it alone).
 *
 * The trigger matches BOTH a regular space (U+0020) and a NON-BREAKING space
 * (U+00A0). When the space bar is pressed at the end of content in a
 * contenteditable, the browser inserts U+00A0, not a regular space, so a plain
 * ` $` trigger never fires in the real editor (only jsdom inserts U+0020 — which
 * is why unit tests passed while the live editor silently failed). It must NOT
 * use `\s` (which also matches `\n`): a newline trigger makes the rule fire on
 * Enter and swallow the line break instead of splitting the block.
 *
 * Unlike the stock `markRule`, this handler does NOT consume the trailing space.
 * `markRule` would replace the whole match (URL + space) with just the linked
 * URL, leaving no space and the cursor stuck inside the link mark — which forced
 * a second space press, and on macOS the double-space triggers the system
 * "period substitution", corrupting the href. Instead we: mark only the URL,
 * normalize the trailing space to a regular U+0020 *outside* the link, clear the
 * stored link mark, and place the cursor after the space. One space both links
 * the URL and leaves a normal space to keep typing in.
 */
// Built from a STRING with an explicit \u00A0 escape (not a literal regex):
// a literal non-breaking space in a regex is invisible in source and was
// silently lost during a file rewrite in development. The trailing class
// matches a regular space (U+0020) OR a non-breaking space (U+00A0).
// biome-ignore lint/complexity/useRegexLiterals: a literal would require an inline non-breaking space, which is invisible in source and gets lost on edits — the   escape must stay a string
export const URL_INPUT_RULE_REGEX = new RegExp('(https?://[^\\s<>]+)[ \\u00A0]$')

export const linkInputRule = $inputRule((ctx) => {
  const linkType = linkSchema.type(ctx)
  return new InputRule(URL_INPUT_RULE_REGEX, (state, match, start, end) => {
    const url = match[1]
    const urlEnd = start + url.length
    const tr = state.tr
    // Link only the URL.
    tr.addMark(start, urlEnd, linkType.create({ href: url }))
    // Replace the matched trailing char (space or nbsp) with a regular space
    // that is NOT inside the link. Both are one character, so `end` is stable.
    tr.replaceWith(urlEnd, end, state.schema.text(' '))
    // Don't carry the link mark into subsequent typing, and put the cursor after
    // the space (in `tr.doc`, the post-edit document).
    tr.removeStoredMark(linkType)
    tr.setSelection(TextSelection.create(tr.doc, end))
    return tr
  })
})
