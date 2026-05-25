# Learned Regressions — human-markdown

Bug classes this project has hit before. Crucible appends entries here when a pattern recurs across 2+ PRs.

When a pattern hits 3+ recurrences, Crucible proposes a rule update in `rule-update-proposals.md`.

## Format

```
## <pattern name>
- **First seen:** PR #<N>
- **Recurrence:** PR #<N>
- **Pattern:** <one paragraph — what to watch for>
- **Status:** active / superseded by rule <name>
```

---

<!-- Entries appended below this line -->

## lazy-loader-missing-ready-event
- **First seen:** PR #26 — `katex-loader.ts:1-2` / `math-view.ts:15-16` (round 1)
- **Recurrences:** (none yet)
- **Count:** 1
- **Pattern:** When adding a new lazy-loaded IIFE bundle (the shiki/mermaid/katex pattern), the loader must dispatch a ready event and/or expose a Promise so consumers can defer rendering until the library is available. Without this, async script execution order creates a race where the node view constructs before the library loads, rendering nothing with no recovery path. The shiki-loader pattern (event + promise) is the reference implementation; new loaders that omit it silently break on cold load.
- **Status:** active

## codemirror-viewport-dom-walk
- **First seen:** PR #34 — `find-bar.ts:105` (round 1)
- **Recurrences:** (none yet)
- **Count:** 1
- **Pattern:** CodeMirror 6 only renders text nodes for the visible viewport plus a small margin. Any feature that walks CodeMirror's DOM via TreeWalker or querySelectorAll to find text content will silently miss everything outside the rendered region. For search, decoration, or analysis features in raw mode, use CodeMirror's document model (`editor.state.doc`) instead of DOM traversal.
- **Status:** active

## stale-dom-ranges-after-content-update
- **First seen:** PR #34 — `index.ts:220` / `find-bar.ts:117-120` (round 1)
- **Recurrences:** (none yet)
- **Count:** 1
- **Pattern:** When a feature stores DOM Range objects (for highlights, annotations, or navigation), those ranges reference live DOM nodes. If the editor re-renders (Milkdown replaceAll, CodeMirror dispatch, or any DOM mutation), the ranges become stale — pointing to detached nodes or wrong offsets. Any feature that caches Range objects must invalidate and rebuild them when the underlying DOM changes. Watch for missing refresh/invalidation calls in content-update paths.
- **Status:** active

## premature-flag-clear-before-async
- **First seen:** PR #37 — `editor-provider.ts:139` (round 1)
- **Recurrences:**
  - PR #37 — `editor-provider.ts:104` (round 2) — `baseContent = diskContent` in `tryMergeExternal` before `applyEdit` confirms
  - PR #46 — `index.ts:421` / `editor-provider.ts:253` (round 1) — webview `setDirty(false)` before save round-trip confirms; host save error handler proceeds to `doSave()` with stale content
  - PR #49 — `extension.ts:44` (round 1) — `hasOfferedReopen` flag set inside `.then()` callback of `showInformationMessage` instead of before the async boundary; re-activation before user responds shows duplicate notification
- **Count:** 4
- **Pattern:** When a handler sets a boolean flag (like `webviewIsDirty`) or updates shared state (like `baseContent`) that guards other event paths, clearing/updating before async work (readFile, applyEdit) completes opens a window where concurrent events take the wrong branch or use wrong state. The mutation should happen in the success callback of the async operation, not at the handler entry. Watch for `state = newValue` followed by `.then()` or `await` — the state changes before the work finishes.
- **Status:** superseded-by behavior-async-state-mutations.md

## missing-error-recovery-in-async-resolution
- **First seen:** PR #37 — `editor-provider.ts:140` (round 1)
- **Recurrences:**
  - PR #46 — `editor-provider.ts:253` (round 1) — save error handler calls `doSave()` on `applyEdit` failure, saving stale content with no user feedback
  - PR #50 — `code-block-view.ts:96` (round 1) — clipboard writeText rejection handler is `() => {}`, no user feedback when copy fails
- **Count:** 3
- **Pattern:** When a user-facing resolution flow (accept/reject/dismiss) hides its UI before sending an async message to the host, and the host's async work (readFile, applyEdit) has no error handling, the UI is gone but the operation failed. The user is stranded with no feedback and no way to retry. Resolution flows that hide UI eagerly must either defer hiding until confirmation, or re-surface the UI on failure.
- **Status:** superseded-by behavior-async-error-feedback.md

## mdast-property-lost-through-prosemirror
- **First seen:** PR #41 — `github-alert-plugin.ts:141-170` (round 1)
- **Recurrences:**
  - PR #43 — `github-alert-plugin.ts:159-167` (round 1) — inline vs. blank-line alert format distinction lost through ProseMirror; `toMarkdown.runner` always emits blank-line format because format info isn't in attrs
- **Count:** 2
- **Pattern:** When a custom remark plugin stores metadata on MDAST nodes (beyond what's mapped to ProseMirror attrs in the `$nodeSchema`), that metadata is lost during the ProseMirror round-trip. The `parseMarkdown` runner only passes declared attrs to `openNode`, and `toMarkdown` only reads from `node.attrs`. Any MDAST property not mirrored in the schema attrs silently disappears after content passes through the editor, causing format-altering round-trips. Watch for custom MDAST properties that influence serialization but aren't in the ProseMirror attrs declaration.
- **Status:** active

## stale-async-callback-no-cancellation
- **First seen:** PR #44 — `image-view.ts:67-70` (round 1)
- **Recurrences:** (none yet)
- **Count:** 1
- **Pattern:** When a component registers a callback for async resolution (postMessage round-trip, fetch, timer) and the component's state changes before the response arrives (src attribute changes, node destroyed, mode toggled), the stale callback fires against outdated context — writing to the wrong element, showing the wrong data, or leaking detached DOM references. Any callback-based async pattern needs either a generation counter (callback no-ops if generation has advanced) or explicit cancellation (destroy/update removes the callback from the pending set). Watch for closures that capture mutable references and fire unconditionally on resolution.
- **Status:** active

## empty-children-violates-content-constraint
- **First seen:** PR #41 — `github-alert-plugin.ts:59-80` (round 1)
- **Recurrences:** (none yet)
- **Count:** 1
- **Pattern:** When a remark transform removes content from a blockquote (or other container) to extract metadata (like a type marker), the remaining children array can end up empty. If the ProseMirror schema declares `content: 'block+'` (one or more), the empty-children node violates the constraint, causing a crash or silent discard. Any transform that strips content from containers must ensure at least one child remains, inserting a minimal placeholder paragraph if needed.
- **Status:** active

## denylist-gap-in-sanitizer
- **First seen:** PR #54 — `code-block-view.ts:29-33` (round 1)
- **Recurrences:** (none yet)
- **Count:** 1
- **Pattern:** When a sanitization function uses a deny-list pattern (match dangerous names, then conditionally remove), a two-level conditional can create gaps where the outer pattern matches but the inner condition doesn't fire for all dangerous values. In this case, `href`/`xlink:href` matched the regex but only `javascript:` values were stripped — `data:text/html` URIs survived. Deny-list sanitizers should either strip matched attributes unconditionally or use an explicit allowlist for safe values, never a nested deny-within-deny structure.
- **Status:** active

## domparser-parseerror-passthrough
- **First seen:** PR #54 — `code-block-view.ts:22-37` (round 1)
- **Recurrences:** (none yet)
- **Count:** 1
- **Pattern:** `DOMParser.parseFromString` with XML MIME types (`image/svg+xml`, `application/xml`) does not throw on malformed input — it returns a document containing a `<parsererror>` element. Code that serializes `doc.documentElement.outerHTML` without checking for parseerror passes the error markup through to innerHTML or other sinks. Always check for `doc.querySelector('parsererror')` after XML DOMParser calls.
- **Status:** active
