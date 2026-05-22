# Async State Mutations

Never mutate shared state (`webviewIsDirty`, `baseContent`, dirty indicators) before async work (`applyEdit`, `readFile`, `document.save()`) that the state depends on. Place the mutation inside the success callback. If the async work fails, the state must remain at its pre-call value so the UI reflects reality and other event handlers take the correct branch. When both success and failure callbacks exist, only the success callback should advance state.
