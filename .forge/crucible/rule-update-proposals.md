# Rule Update Proposals — human-markdown

When Crucible notices a recurring pattern across 3+ PRs, it proposes a rule addition here. The user reviews on cadence and decides whether to add the rule to `/Users/jeffreese/Code/human-markdown/.claude/rules/` for real.

## Format

```
## <proposed rule name>
- **Proposed:** <date>
- **Status:** open / accepted (added to rules) / rejected
- **Pattern observed in:** PR #<N1>, #<N2>, #<N3>
- **Proposed rule text:**
  > <one paragraph — what the rule would say>
- **Reasoning:** <why this rises to a rule>
```

---

<!-- Entries appended below this line -->

## premature-flag-clear-before-async
- **Proposed:** 2026-05-21
- **Status:** accepted (2026-05-22)
- **Promoted to:** `behavior-async-state-mutations.md`
- **Pattern observed in:** PR #37, #37 (round 2), #46
- **Proposed rule text:**
  > Never mutate shared state (`webviewIsDirty`, `baseContent`, dirty indicators) before async work (`applyEdit`, `readFile`, `document.save()`) that the state depends on. Place the mutation inside the success callback. If the async work fails, the state must remain at its pre-call value so the UI reflects reality and other event handlers take the correct branch. When both success and failure callbacks exist, only the success callback should advance state.
- **Refined by build agent in PR #49 (4e3367d):** Original text only covered dependent state and would have discouraged the correct fix for guard flags. Rewritten to distinguish two patterns with opposite timing — guard flags (set before async) vs. dependent state (set in success callback).
- **Reasoning:** Hit 3 times across PRs #37 and #46. Each occurrence produced a silent state divergence between host and webview — dirty indicators showing clean when the file wasn't saved, `baseContent` updated before the edit that justified the update was confirmed. The pattern is subtle enough that it recurs despite being caught in review.
- **Recommended location:** `/Users/jeffreese/Code/human-markdown/.claude/rules/behavior-async-state-mutations.md`

## missing-error-recovery-in-async-resolution
- **Proposed:** 2026-05-22
- **Status:** accepted (2026-05-22)
- **Promoted to:** `behavior-async-error-feedback.md`
- **Pattern observed in:** PR #37, #46, #50
- **Proposed rule text:**
  > When a user-triggered action calls an async API (clipboard write, file save, apply edit) and the UI provides success feedback (checkmark, state change, dialog dismissal), the failure path must also provide feedback. An empty rejection handler `() => {}` or a missing `.catch()` is never acceptable on user-facing async operations. At minimum: show a brief error indicator on the originating UI element and log the rejection reason. If the success path changes UI state (hides a dialog, shows a checkmark), the failure path must either leave the UI unchanged or show an explicit error state — never silently swallow.
- **Reasoning:** Hit 3 times across PRs #37, #46, and #50. Each occurrence left the user with no feedback after a failed async operation — stranded with a dialog that dismissed itself, a save that silently failed, a copy button that did nothing. The pattern is easy to write (`.then(success)` without a rejection handler) and invisible until the async operation actually fails.
- **Recommended location:** `/Users/jeffreese/Code/human-markdown/.claude/rules/behavior-async-error-feedback.md`
