---
title: "GitHub Alerts"
project: "human-markdown"
date: 2026-05-21
---

# GitHub Alerts (Callouts)

Render GitHub-style alerts — `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]` — as styled blocks with icons and colored borders instead of plain blockquotes.

## Why

This is the #1 unimplemented feature request across Markdown Preview Enhanced (9.3M installs), spanning 10+ open issues over years. Shipping it gives Human Markdown an immediate competitive wedge. The syntax is also supported by GitHub.com, so users already expect it.

## Scope

### Phase 1: GitHub Alert Types (this plan)

The five standard GitHub alert types rendered as styled blocks in WYSIWYG mode. Full round-trip fidelity: load → edit → serialize preserves the `> [!TYPE]` syntax exactly.

### Phase 2: Obsidian Callouts (future)

Obsidian's superset: foldable callouts (`-`/`+` suffix), custom titles after the type, additional types (ABSTRACT, INFO, SUCCESS, QUESTION, FAILURE, DANGER, BUG, EXAMPLE, QUOTE). Separate plan — the collapsible state adds editor interaction complexity.

## Approach

### Remark Plugin

Use `remark-github-blockquote-alert` (2.1.0, MIT, 39KB unpacked, single dep on `unist-util-visit`). It transforms blockquotes containing `[!TYPE]` into distinct MDAST nodes that we can map to ProseMirror nodes.

**Risk:** The plugin may transform the AST in a way that doesn't serialize back cleanly. If round-trip tests fail, we write a minimal custom remark plugin (~50 lines) that only annotates blockquote nodes with an `alertType` attribute without changing the node type. This preserves the existing blockquote serialization path.

**Decision needed before implementation:** Verify that `remark-github-blockquote-alert` works with Milkdown's remark pipeline. If the plugin emits custom MDAST node types (likely `alert`), we need to handle them in `parseMarkdown`/`toMarkdown`. If it only adds `data` attributes to existing blockquote nodes, the approach is simpler. A 30-minute spike answers this.

### Milkdown Plugin

Follow the established pattern from `frontmatter-plugin.ts`:

1. **`$remark('githubAlert', ...)`** — Wire the remark plugin into Milkdown's pipeline
2. **`$nodeSchema('github_alert', ...)`** — ProseMirror node schema with `alertType` attribute (`note | tip | important | warning | caution`), `content: 'block+'` to hold the alert body
3. **`$view(githubAlertSchema.node, ...)`** — Custom node view rendering the styled container

Files:
- `webview/editor/github-alert-plugin.ts` — remark plugin, node schema, node view
- `webview/editor/github-alert-plugin.test.ts` — round-trip and rendering tests

Wired into `initMilkdown()` in `webview/editor/index.ts` via `.use()` chain, same as frontmatter/math.

### Theme Tokens

New CSS custom properties in `webview/shared/theme/tokens.ts`:

```
--hm-color-alert-note-border
--hm-color-alert-note-bg
--hm-color-alert-note-icon
--hm-color-alert-tip-border
--hm-color-alert-tip-bg
--hm-color-alert-tip-icon
--hm-color-alert-important-border
--hm-color-alert-important-bg
--hm-color-alert-important-icon
--hm-color-alert-warning-border
--hm-color-alert-warning-bg
--hm-color-alert-warning-icon
--hm-color-alert-caution-border
--hm-color-alert-caution-bg
--hm-color-alert-caution-icon
```

Values per theme matching GitHub.com's alert colors (blue/note, green/tip, purple/important, yellow/warning, red/caution). All three built-in themes (light, dark, github) get values.

### Node View Rendering

Each alert renders as:

```
┌─────────────────────────────────┐
│ 🛈  Note                        │  ← icon + type label, colored
│                                 │
│ Alert body content here.        │  ← editable content (contentDOM)
│ Supports **rich** markdown.     │
└─────────────────────────────────┘
```

- Left border bar (4px, colored by type) — mirrors blockquote visual language
- Light background tint
- SVG icon + title row (non-editable, handled via `ignoreMutation`)
- Body is a `contentDOM` div so ProseMirror manages editing
- Icons: inline SVGs matching GitHub's Octicons (informational-circle, lightbulb, report, alert, stop)

### Styles

CSS in `webview/editor/styles.ts` alongside existing blockquote styles. All colors via theme tokens — no hardcoded values.

## Tasks

1. **Spike: remark plugin compatibility** — Install `remark-github-blockquote-alert`, write a minimal test to verify MDAST output and round-trip behavior with Milkdown's remark instance. 30 min timebox. If it fails, pivot to custom remark plugin.

2. **Add theme tokens** — Add the 15 alert color tokens to `tokens.ts` with values for all three themes. Update `ThemeTokens` type.

3. **Implement plugin** — `$remark()` + `$nodeSchema()` + `$view()` in `github-alert-plugin.ts`. Wire into `initMilkdown()`.

4. **Add styles** — Alert container CSS in `styles.ts`. SVG icons for the 5 types.

5. **Round-trip tests** — Test each alert type: markdown → ProseMirror → markdown. Verify the `> [!TYPE]` prefix and body content survive intact. Test nested content (lists, code, links inside alerts). Test adjacent alerts. Test alert followed by regular blockquote.

6. **Visual testing** — F5 launch, verify all 5 types render correctly in light/dark/github themes. Test editing content inside an alert. Test creating a new alert by typing the syntax.

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| remark plugin emits nodes Milkdown can't map | Blocks feature | Spike validates; fallback is custom 50-line plugin |
| Alert body editing feels janky | UX regression | `contentDOM` pattern proven in frontmatter view |
| Round-trip adds/removes whitespace | Violates core principle | Dedicated test fixtures; same approach as tight-list fix |
| Bundle size increase | Exceeds 500KB budget | Plugin is tiny (~39KB source, tree-shakes well); no IIFE needed |

## Non-Goals

- Obsidian callout syntax (Phase 2)
- Custom alert types beyond the GitHub 5
- Alert creation UI (toolbar button, slash command) — users type the syntax
- Raw mode rendering of alerts (CodeMirror shows raw markdown as-is)
