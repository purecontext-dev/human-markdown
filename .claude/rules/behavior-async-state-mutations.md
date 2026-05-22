# Async State Mutations

Two patterns, opposite timing:

- **Guard flags** (re-entry prevention: `hasOfferedReopen`, `isSaving`): set *before* the async call. The flag means "initiated," not "succeeded." Setting it after the async boundary allows duplicate invocations if the extension host re-activates or the event fires again before the callback resolves.

- **Dependent state** (values that reflect async results: `baseContent`, `webviewIsDirty`): set *inside the success callback*. If the async work fails, state must remain at its pre-call value so the UI reflects reality and other event handlers take the correct branch.
