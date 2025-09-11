# GitHub Platform Limitations & Gotchas

## [2024-12] GitHub CLI Token Authentication
The gh CLI doesn't directly support GitHub App authentication. It expects either:
1. A personal access token (PAT) via `GITHUB_TOKEN`
2. OAuth authentication via 'gh auth login'

For GitHub Apps, we get an installation token and pass it as `GH_TOKEN` to the subprocess.

## [2024-12] GitHub App Naming Constraints
GitHub Apps cannot use @ mentions like users - they have different invocation patterns. The name "homunculus" is already taken by an existing GitHub user.

## [2024-12] GitHub Slash Commands Are Built-in Only
GitHub has native slash commands with autocomplete (/close, /assign, /label, etc.) but these are built-in features only. Third-party apps CANNOT add custom slash commands to the autocomplete system. Custom "slash commands" are just pattern matching in regular comments.

## [2024-12] Git User Config for Bot Operations
When Claude subprocess tries to create PRs, git user.name and user.email must be configured. Without this, git fails with "Please tell me who you are" error. The server spawns Claude in fresh work directories without git config.

## Related Files
- `server.js` - Where these limitations are handled