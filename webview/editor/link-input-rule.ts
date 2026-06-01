import { $inputRule } from '@milkdown/kit/utils'
import { linkSchema } from '@milkdown/preset-commonmark'
import { markRule } from '@milkdown/prose'

/**
 * Auto-link a URL typed in the WYSIWYG editor.
 *
 * Bare URLs from the markdown source are kept as plain text (see
 * bare-url-plugin.ts). But a URL *typed in rich text* is taken as intent to
 * create a link — rich text is a "compose links" surface. When the user types a
 * URL followed by a space, wrap it in a `link` mark whose `href` is the URL. On
 * serialization this becomes `[url](url)` (text === href), which round-trips back
 * as an explicit link (its source starts with `[`, so the bare-url revert leaves
 * it alone).
 *
 * The trigger is a trailing space — but it must match BOTH a regular space
 * (U+0020) and a NON-BREAKING space (U+00A0). When the space bar is pressed at
 * the end of content in a contenteditable, the browser inserts U+00A0, not a
 * regular space. A plain ` $` trigger therefore never fires in the real editor
 * (it only matched U+0020 — which is what jsdom inserts, so unit tests passed
 * while the live editor silently failed). `[  ]` covers both.
 *
 * It must NOT use `\s` (which also matches `\n`): a newline trigger makes the
 * rule fire on Enter and swallow the line break instead of splitting the block.
 * With this space-only (incl. nbsp) trigger, Enter always does its normal job; a
 * URL at the end of a line stays plain text until a space is typed (or it
 * round-trips through markdown). `markRule` marks the last capture group (the
 * URL) and consumes the trailing space; `getAttr` sets the href from it.
 */
export const URL_INPUT_RULE_REGEX = /(https?:\/\/[^\s<>]+)[  ]$/

export const linkInputRule = $inputRule((ctx) =>
  markRule(URL_INPUT_RULE_REGEX, linkSchema.type(ctx), {
    getAttr: (match) => ({ href: match[1] }),
  }),
)
