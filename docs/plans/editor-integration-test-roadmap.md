# Editor Integration Test Roadmap

Human Markdown's riskiest behavior lives between three editor states:

- VS Code `TextDocument`
- Milkdown/ProseMirror WYSIWYG state
- CodeMirror raw-mode state

This roadmap grows the real VS Code Extension Host test suite in batches. Keep
each batch small enough to review and release independently.

## Release Advice

- Prefer small PRs: one test batch or one behavior fix per PR.
- Keep `main` green. If a test documents a known bug before the fix is ready,
  mark it clearly as skipped or expected-failing and link it to the checklist.
- Separate harness work from behavior changes when practical. The harness should
  be trusted infrastructure, not tangled with sync fixes.
- Release user-visible sync fixes in patch releases as they land. Larger
  internal test-only batches can be grouped into the next normal build.

## Batch 1: Sync Risk Spine

These tests target the current highest-risk findings from
`docs/plans/editor-sync-durability.md`.

- [x] Webview edit updates the VS Code `TextDocument`
- [x] Save after webview edit writes disk bytes
- [x] Dirty webview plus non-overlapping external change merges
- [x] Dirty webview plus overlapping external change surfaces conflict
- [x] Accept external discards local dirty content
- [x] Keep mine preserves local content and stays dirty until saved
- [x] Queued edit cannot apply after accept external
  - Covered at the sequencer/provider level; add a full Electron interleaving
    test if we later add controllable provider delays.
- [x] Same file open in two editor groups sees shared updates
  - Covered for the simple clean-panel propagation case. Dirty competing-panel
    behavior is now covered by Batch 4's stale peer-save integration test.

Implementation note: `@vscode/test-electron` can launch VS Code and inspect the
extension host, but it cannot directly drive sandboxed webview DOM by itself.
Batch 1 likely needs either:

- a narrow test-only command surface on the extension provider, or
- extraction of a document sync controller that can be integration-tested without
  webview DOM access.

Prefer the sync controller extraction if it also simplifies production code.

## Batch 2: Core Extension Host Behavior

- [x] Open existing markdown as Human Markdown without changing text
- [x] Default markdown association opens Human Markdown when configured
- [x] Toggle command reaches the active custom editor
- [x] Find command reaches the active custom editor
- [x] Theme configuration broadcasts to open webviews
- [x] Native VS Code save updates the sync base
- [x] Clean webview accepts external document change

## Batch 3: Mode And Editor State

- [x] Raw mode edit persists after toggling to rendered mode
- [x] WYSIWYG edit persists after toggling to raw mode
- [x] Untouched raw-to-rendered-to-raw round trip preserves bytes
- [x] Undo/redo in WYSIWYG updates document
- [x] Undo/redo in raw mode updates document
- [x] Mode state restores after panel reload
- [x] Scroll state restores after panel reload

## Batch 4: Multiple Panels

- [x] Same file open in two editor groups receives shared updates
- [x] Two panels do not silently overwrite each other during save
- [x] Closing one panel does not break sync for the other
- [x] Active webview routing sends commands to the selected panel

## Batch 5: Round-Trip Fidelity In Real VS Code

- [x] Bare URLs preserve expected bytes when untouched
- [ ] Tables do not drift when untouched
- [ ] Lists preserve tight/loose behavior
- [ ] Frontmatter survives open/toggle/save
- [ ] Code fences survive open/toggle/save
- [ ] GitHub alerts survive open/toggle/save
- [ ] Math blocks survive open/toggle/save

## Batch 6: UI Smoke Tests

These may need an Electron UI driver such as Playwright in addition to
`@vscode/test-electron`.

- [ ] Toolbar mode button toggles rendered/raw
- [ ] Autosave toggle persists setting and saves after edit
- [ ] Conflict bar buttons work
- [ ] Find bar displays and navigates results
- [ ] Image path resolution renders safe local images
- [ ] Unsafe image paths outside the document directory do not resolve
- [ ] External links and relative links dispatch correctly

## Done Criteria Per Batch

- Tests run via `pnpm test:integration` or a clearly named related script.
- `pnpm test`, `pnpm typecheck`, and `pnpm lint` pass.
- Any required test hooks are gated so production users cannot invoke them.
- New failing behavior is either fixed in the same PR or tracked as skipped with
  an explicit checklist reference.
