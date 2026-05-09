# Round-Trip Fidelity

The editor must never introduce formatting changes the user didn't make. When markdown is loaded, edited, and serialized back, the output must preserve:
- Indent style (spaces vs tabs, indent width)
- Blank line patterns
- Heading style (ATX `#` vs setext `===`)
- List marker style (`-` vs `*` vs `+`)
- Emphasis style (`*` vs `_`)

Test round-trip fidelity against the real-world markdown corpus in the test fixtures. Add new fixture files when edge cases are discovered.
