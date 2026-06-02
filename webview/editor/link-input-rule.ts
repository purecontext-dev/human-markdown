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
 * Unlike the stock `markRule`, this handler does NOT leave the cursor inside the
 * link. `markRule` replaces the match with just the linked URL, leaving no space
 * and the cursor stuck inside the link mark — which forces a second space press,
 * and on macOS the double-space triggers the system "period substitution",
 * corrupting the href. Instead we: mark only the URL, clear the stored link mark,
 * insert a normal U+0020 space *after* the URL (outside the link), and place the
 * cursor after that space. One space both links the URL and leaves the cursor in
 * normal text, ready to keep typing.
 *
 * Position contract (see the handler): the rule fires from `handleTextInput`
 * before the typed space lands in the document, so `start..end` is the URL alone
 * and the space must be inserted, not replaced.
 */
// The core URL shape: `http(s)://` followed by any run of non-space, non-angle
// characters. Shared as a string so both the space-triggered input rule (below)
// and the Enter handler (keyboard-nav.ts) detect URLs identically \u2014 one source
// of truth for what counts as a typed URL.
export const URL_PATTERN = 'https?://[^\\s<>]+'

// Built from a STRING with an explicit \u00A0 escape (not a literal regex):
// a literal non-breaking space in a regex is invisible in source and was
// silently lost during a file rewrite in development. The trailing class
// matches a regular space (U+0020) OR a non-breaking space (U+00A0).
export const URL_INPUT_RULE_REGEX = new RegExp(`(${URL_PATTERN})[ \\u00A0]$`)

export const linkInputRule = $inputRule((ctx) => {
  const linkType = linkSchema.type(ctx)
  return new InputRule(URL_INPUT_RULE_REGEX, (state, match, start, end) => {
    const url = match[1]
    // prosemirror-inputrules fires this from `handleTextInput` *before* the typed
    // space is committed to the document: the space exists only as the matched
    // string, not as a node. So `start..end` spans the URL alone (`end` is the
    // cursor, sitting at the end of the URL), and the trailing space is NOT in the
    // doc. We therefore INSERT a space rather than replace one. (The unit test
    // must build the same pre-space state, or it tests a fiction jsdom allows.)
    const tr = state.tr
    // Link only the URL.
    tr.addMark(start, end, linkType.create({ href: url }))
    // Clear the stored link mark first so the inserted space — and everything the
    // user types next — is plain text, not a continuation of the link.
    tr.removeStoredMark(linkType)
    // Insert a real space just after the URL, outside the link mark.
    tr.insert(end, state.schema.text(' '))
    // Place the cursor AFTER the inserted space (end + 1), so the link is closed
    // and the user keeps typing in normal text. Setting it to `end` would leave
    // the cursor at the link boundary (resolved as inside the mark) — the reported
    // "space didn't move the cursor out of the link" bug.
    tr.setSelection(TextSelection.create(tr.doc, end + 1))
    return tr
  })
})
