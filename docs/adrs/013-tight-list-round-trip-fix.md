# ADR-013: Remark Stringify Patch for List Round-Trip Fidelity

## Status

Accepted

## Context

The prototype spike revealed that Milkdown converts MDAST `spread` booleans to strings via template literals (`${node.spread}`). The string `"false"` is truthy in JavaScript, so `remark-stringify` treated every list as "loose" — inserting blank lines between items. Tight lists became loose on every save, the single biggest round-trip fidelity violation.

## Decision

Patch `remark.stringify()` after editor creation to normalize the `spread` property on MDAST list and listItem nodes from strings back to booleans before serialization.

## What We Tried First

A remark transform plugin to fix `spread` values in the MDAST tree. This failed because `remark.stringify()` doesn't run transform plugins — only `remark.process()` does. Since Milkdown calls `stringify()` directly (not `process()`), the transform never fires.

## Alternatives Considered

1. **Remark transform plugin** — tried, doesn't work because `stringify()` skips transforms
2. **Accepting the drift** — rejected. Round-trip fidelity is core to the product. Tight lists loosening on every save would make the editor hostile for users who care about their markdown formatting.
3. **Custom remark-stringify options** — implemented for configurable items (`bullet: '-'`, `rule: '-'`), but `spread` coercion is a Milkdown bug, not a configuration issue

## Consequences

### Positive

- Round-trip idempotency went from 2/6 to 4/6 exact preservation on test fixtures
- Tight lists survive the WYSIWYG round-trip without inserting blank lines

### Negative

- Monkey-patching `stringify()` is fragile — Milkdown or remark updates could break the patch point
- The root cause is in Milkdown's MDAST handling; this is a workaround, not a proper fix. An upstream PR would be the durable solution.

## Related Decisions

- Round-trip fidelity convention (see CLAUDE.md / rules)
