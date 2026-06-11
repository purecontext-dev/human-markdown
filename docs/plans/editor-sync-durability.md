# Editor Sync Durability Checklist

Human Markdown keeps three editing surfaces in sync:

- VS Code `TextDocument` in the extension host
- Milkdown/ProseMirror state in WYSIWYG mode
- CodeMirror state in raw mode

This checklist tracks the sync durability issues found during the June 2026
architecture review. Work through these one at a time, with focused tests for
each behavior before moving to the next item.

## Checklist

- [x] **Route conflict actions through the same sequencer as normal edits**
  - `accept-external` and `keep-mine` currently apply edits directly in
    `src/editor-provider.ts`, while ordinary webview edits and saves go through
    `WebviewEditSequencer`.
  - Status: fixed in the conflict sequencing branch; conflict resolution now
    invalidates stale queued edits and runs through the sequencer after any
    in-flight document mutation.
  - Target outcome: every document mutation from the webview is serialized
    through one ordered path, and conflict resolution invalidates older queued
    edits.
  - Likely files: `src/editor-provider.ts`, `src/webview-edit-sequencer.ts`,
    `src/webview-edit-sequencer.test.ts`, new provider sync tests.

- [x] **Keep local content dirty after "keep mine" until it is safely saved**
  - `keep-mine` currently clears `webviewIsDirty`, and the webview clears its
    dirty state immediately after choosing the local version.
  - Status: fixed in the current test-hardening branch; `keep-mine` now hides
    the conflict but keeps local content dirty until save.
  - Target outcome: choosing "keep mine" resolves the conflict UI, but local
    content remains dirty until it is saved or explicitly accepted as the sync
    base.
  - Likely files: `src/editor-provider.ts`, `webview/editor/index.ts`,
    `webview/editor/conflict-bar.ts`, `webview/editor/save-controller.ts`.

- [x] **Prevent external merges from using stale webview snapshots**
  - External merge handling uses `lastAppliedFromWebview ?? baseContent`, which
    can lag behind a newer queued edit from the webview.
  - Status: fixed in the queued external merge branch. The provider now queues
    dirty external merge handling behind pending webview edits, so merge
    decisions see the latest applied local content before reconciling the
    external change.
  - Target outcome: external merge decisions see the latest queued webview
    content, or wait behind queued edits before merging.
  - Likely files: `src/editor-provider.ts`, `src/webview-edit-sequencer.ts`,
    provider sync tests.

- [x] **Share sync state across multiple webviews for the same document**
  - Each `resolveCustomTextEditor` call owns independent `baseContent`,
    `webviewIsDirty`, and `lastAppliedFromWebview` state.
  - Status: fixed in the shared sync session branch; `MarkdownEditorProvider`
    now keeps one `DocumentSyncSession` per document URI and each webview panel
    only owns UI/message state. Follow-up Batch 4 integration coverage now
    verifies peer updates, stale peer-save rejection, disposal of one panel, and
    active-panel command routing.
  - Target outcome: multiple editor groups for the same markdown file coordinate
    through a per-document sync controller, while each panel only owns UI state.
  - Likely files: `src/editor-provider.ts`, possible new sync controller module,
    provider lifecycle tests.

- [x] **Harden source splicing for duplicate normalized blocks**
  - `spliceContent` maps unchanged blocks through LCS over normalized block
    strings. Duplicate blocks that serialize identically but had different
    original bytes can map to the wrong disk block.
  - Target outcome: duplicate normalized blocks either preserve the correct
    positional disk bytes or fall back to full live serialization when ambiguous.
  - Likely files: `webview/editor/source-splice.ts`,
    `webview/editor/source-splice.test.ts`,
    `webview/editor/spliced-resolve.test.ts`.

- [x] **Add host-level sync integration coverage**
  - Current tests cover save control, sequencing, and round-trip fidelity, but
    not the full provider state machine for queued edits, saves, conflict
    resolution, external changes, and multiple panels.
  - Initial Extension Host harness added via `pnpm test:integration`; it verifies
    activation, custom-editor open, and backing `TextDocument` usability.
  - Status: fixed in the host sync integration coverage branch; provider
    integration tests now exercise conflict resolution behind in-flight edits
    and verify stale queued webview edits cannot win afterward.
  - Target outcome: a mocked `MarkdownEditorProvider` harness exercises the
    real message flow and guards the highest-risk interleavings.
  - Likely files: new `src/editor-provider-sync.test.ts` or extracted sync
    controller tests.

## Done Criteria

- Each checklist item has a regression test that fails before the fix.
- `pnpm test`, `pnpm typecheck`, and `pnpm lint` pass.
- The implementation keeps document mutation ownership obvious: no new direct
  edit path without a reason documented in code or an ADR.
