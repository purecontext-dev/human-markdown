---
name: publish
description: Publish a new release to the VS Code Marketplace and Cursor (Open VSX). Runs pre-flight checks, bumps version, tags, and pushes.
allowed-tools: Bash, Read, Edit, AskUserQuestion
---

# Publish Release

Publish a new release of Human Markdown to both the VS Code Marketplace and the Cursor (Open VSX) marketplace.

## Steps

1. **Check branch** — confirm we're on `main` and up to date with origin. If on a feature branch, warn the user and stop.

2. **Ask for version bump** — read the current version from `package.json`. Ask the user for the bump type (major, minor, or patch). Show the current version and what the new version will be. Confirm before proceeding.

3. **Run pre-flight checks** — run in parallel and report results:
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test`
   - `pnpm build`

   If any fail, stop and help fix the issue. Do not proceed with a failing check.

4. **Bump the version** — edit the `version` field in `package.json`. Do not use `npm version` (it creates its own commit and tag with the wrong format).

5. **Update the changelog** — add a new section at the top of `CHANGELOG.md` for the new version:
   - Use `git log --oneline` from the last tag to HEAD to find what changed
   - Write user-facing entries (features, fixes, improvements). Skip internal chores (version bumps, CI tweaks, docs-only changes unless they're meaningful to users).
   - Format: `## <version> - <YYYY-MM-DD>` followed by bulleted list
   - If uncertain about what's user-facing, ask the user

6. **Create a release branch and PR** — main has branch protection, so direct pushes are blocked.
   - Create branch `chore/release-<new-version>`
   - Commit with message: `chore: bump version to <new-version>`
   - Push the branch and open a PR
   - Tell the user to merge the PR, then wait

7. **After the PR merges** — reset to main, then tag and push:
   - `git checkout main && git pull`
   - `git tag v<new-version>`
   - `git push origin v<new-version>`

   The publish workflow (`.github/workflows/publish.yml`) runs automatically on `v*` tag push and publishes to:
   - **VS Code Marketplace** via `vsce` (uses `VSCE_PAT` secret)
   - **Open VSX / Cursor** via `ovsx` (uses `OVSX_PAT` secret)

8. **Link the Actions run** — use `gh run list` to find the triggered workflow run and give the user a link to monitor it.

## Important

- Always confirm the version number with the user before committing.
- The actual publishing happens in CI (.github/workflows/publish.yml), not locally.
- Clean up the release branch after merge (`git branch -d chore/release-<version>`).
