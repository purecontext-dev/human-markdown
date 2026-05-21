# ADR-018: Document Sync Flag for External Edit Handling

## Status

Accepted

## Context

Milkdown's Remark serializer normalizes content during `create()` and after `replaceAll()` — changing list markers, collapsing whitespace, etc. These normalizations fire the `markdownUpdated` callback, which sends `edit` messages to the extension host even though the user hasn't changed anything. The extension host's content guard (`msg.content === document.getText()`) only catches exact matches, so normalized content bypasses it. The result: opening a file or receiving an external edit immediately marks the document as dirty.

## Decision

Add a `syncingContent` flag that absorbs content normalization from both initial editor creation and external content updates. `markdownUpdated` always tracks Milkdown's actual state in `currentContent`, but only sends `edit` messages when `syncingContent` is false.

## Implementation Detail

The flag uses `requestAnimationFrame` to catch deferred normalization that fires past the synchronous suppression window. Milkdown sometimes normalizes content asynchronously (e.g., after ProseMirror transactions settle), so the suppression window must extend past the current microtask.

## Alternatives Considered

1. **Content comparison in the callback** — comparing new content against the last-known document state could work, but normalization means the content is legitimately different (just not user-initiated). A string comparison would either miss normalizations or require maintaining a separate "expected normalized" state.
2. **Debouncing edit messages** — delays all edits, including real user edits. Adds latency to the dirty-state indicator.
3. **Ignoring the first N edits after load** — fragile heuristic. The number of normalization edits depends on document content.

## Consequences

### Positive

- Opening a file doesn't immediately mark it as dirty
- External edits (git pull, other editors) sync without false dirty state
- User edits are still sent immediately when not in a sync window

### Negative

- If a user edits during the sync window (e.g., types immediately after opening), that edit could be swallowed. The `requestAnimationFrame` window is short enough (~16ms) that this is unlikely but theoretically possible.
- The flag adds state management complexity to the message flow between webview and extension host
