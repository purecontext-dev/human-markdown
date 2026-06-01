import { $inputRule } from '@milkdown/kit/utils'
import { linkSchema } from '@milkdown/preset-commonmark'
import { markRule } from '@milkdown/prose'

/**
 * Auto-link a URL typed in the WYSIWYG editor.
 *
 * Bare URLs from the markdown source are kept as plain text (see
 * bare-url-plugin.ts). But a URL *typed in rich text* is taken as intent to
 * create a link — rich text is a "compose links" surface. When the user types a
 * URL followed by whitespace, wrap it in a `link` mark whose `href` is the URL.
 * On serialization this becomes `[url](url)` (text === href), which round-trips
 * back as an explicit link (its source starts with `[`, so the bare-url revert
 * leaves it alone).
 *
 * The regex requires a trailing literal SPACE — not `\s` — so the rule fires
 * when the URL is "finished" mid-line, but never on Enter. `\s` would match the
 * `\n`-equivalent that Enter routes through input handling, causing the rule to
 * consume the keystroke and swallow the newline instead of splitting the block.
 * With a space-only trigger, Enter always does its normal job; a URL at the end
 * of a line just stays plain text until a space is typed (or it round-trips
 * through markdown). `markRule` marks the last capture group (the URL) and
 * consumes the trailing space; `getAttr` sets the href from the same group.
 */
export const URL_INPUT_RULE_REGEX = /(https?:\/\/[^\s<>]+) $/

export const linkInputRule = $inputRule((ctx) =>
  markRule(URL_INPUT_RULE_REGEX, linkSchema.type(ctx), {
    getAttr: (match) => ({ href: match[1] }),
  }),
)
