# ADR-016: Dual Marketplace Publishing (VS Code + Open VSX)

## Status

Accepted

## Context

The extension needs to reach users on both VS Code and Cursor. Cursor uses the Open VSX Registry as its extension source, not the VS Code Marketplace.

## Decision

The publish workflow pushes the same `.vsix` artifact to both the VS Code Marketplace (via `vsce`) and Open VSX (via `ovsx`). The workflow also creates the Open VSX namespace on first run (no-op after that).

## Implementation Notes

- The same `.vsix` file works for both registries — no separate builds needed
- `pnpm publish` intercepts the lifecycle script and enforces git branch checks that fail on detached HEAD in CI (tag checkouts). The workflow calls `vsce publish` directly to avoid this.
- Open VSX namespace creation is idempotent — safe to run on every publish

## Alternatives Considered

1. **VS Code Marketplace only** — would exclude Cursor users entirely
2. **Separate publish workflows** — unnecessary complexity since the same artifact works for both
3. **Manual Open VSX uploads** — error-prone, easy to forget

## Consequences

### Positive

- Single publish action reaches both editor ecosystems
- Cursor users get the same version at the same time as VS Code users

### Negative

- Two sets of API tokens to maintain (VSCE_PAT + OVSX_PAT)
- Open VSX has different review/moderation policies that could cause version skew if a publish is rejected on one side
