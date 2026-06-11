# Integration Test Runner

Run the real VS Code Extension Host integration suite with:

```sh
pnpm test:integration
```

This command launches a real VS Code GUI process. In Codex/Claude sandboxed
sessions, run it with elevated/unsandboxed command execution; sandboxed launches
can terminate with `SIGABRT` before any test output appears.

Do not launch the suite against the shared `.vscode-test/user-data` or
`.vscode-test/extensions` directories. Shared VS Code profile state can make
failures harder to reproduce. The project runner intentionally creates a fresh
temp workspace, user-data dir, and extensions dir for each run.

Keep the temp root short, such as `/tmp/hm-it-*`. VS Code creates an IPC socket
inside `--user-data-dir`; long macOS temp paths can exceed the Unix socket path
limit and fail with `listen EINVAL` / `main.sock is longer than 103 chars`.

If the command fails before test output appears, first check whether the runner
is running unsandboxed, using a short `/tmp` root, and passing isolated
`--user-data-dir` and `--extensions-dir` launch args. Only use manual
`open -n -W ...Visual Studio Code.app` launches as a diagnostic fallback; they
do not stream test output reliably and are not the canonical path.

`pnpm test:integration` already builds the extension, bundles
`test/integration/suite.ts`, enables `HUMAN_MARKDOWN_TEST_HOOKS=1`, and runs the
full suite. Prefer fixing that script over creating one-off launch commands.
