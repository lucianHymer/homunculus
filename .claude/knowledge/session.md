### [20:52] [architecture] GitHub App authentication implementation
**Details**: Implemented full GitHub App authentication for Homunculus. The system now supports both GitHub App tokens and personal access tokens. The GitHubAppAuth class handles JWT generation and installation token exchange with caching. Server.js automatically detects GitHub App configuration from environment variables (GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY_PATH) and obtains installation tokens for each webhook. These tokens are passed to Claude via GH_TOKEN environment variable, allowing proper GitHub CLI authentication without relying on local gh auth. Falls back gracefully to GH_TOKEN or existing gh CLI auth if App auth fails.
**Files**: github-app-auth.js, server.js, test-github-app.js, .env.example
---

### [23:36] [gotcha] GitHub CLI token authentication
**Details**: When passing GitHub App installation tokens to subprocesses that use gh CLI, the token must be passed via the GH_TOKEN environment variable. The gh CLI will automatically use this token for authentication. The server.js correctly passes the token on lines 191-205, setting GH_TOKEN in the subprocess environment when a GitHub App token is available.
**Files**: server.js
---

### [23:37] [architecture] GitHub App authentication for subprocesses
**Details**: GitHub App authentication is passed to Claude subprocess by forwarding the GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY_PATH environment variables. This allows the subprocess (Claude) to authenticate using the same GitHub App credentials. The gh CLI will use these credentials when available. GH_TOKEN is not used - we rely on proper GitHub App authentication instead.
**Files**: server.js
---

### [23:43] [gotcha] gh CLI and GitHub App authentication
**Details**: The gh CLI doesn't directly support GitHub App authentication. It expects either:
1. A personal access token (PAT) via GITHUB_TOKEN
2. OAuth authentication via 'gh auth login'

For GitHub Apps, we need to get an installation token and pass it as GH_TOKEN or GITHUB_TOKEN to the subprocess. The gh CLI will treat it like a regular token.
**Files**: server.js
---

### [23:50] [gotcha] Claude subprocess command approval
**Details**: When spawning Claude as a subprocess, it has a security approval mechanism that blocks commands by default. Even with proper GitHub App authentication (GH_TOKEN passed correctly), Claude cannot execute gh commands without user approval. This is a fundamental limitation of Claude's security model when running in subprocess mode. The authentication is working correctly - the issue is Claude's command approval system.
**Files**: test-claude-subprocess.js, server.js
---

### [23:53] [config] Claude subprocess tool whitelisting
**Details**: Claude subprocesses require explicit tool whitelisting to execute commands. Use the --allowed-tools flag with patterns like 'Bash(gh:*)' to allow gh CLI commands. The server now whitelists: gh commands, git commands, Read, Write, Edit, MultiEdit, Grep, Glob, and TodoWrite. This provides security while allowing necessary operations. The whitelisting successfully bypasses Claude's default command approval mechanism while maintaining security boundaries.
**Files**: server.js, test-claude-subprocess.js
---

### [23:59] [gotcha] GitHub App naming constraints
**Details**: GitHub Apps cannot use @ mentions like users - they have different invocation patterns. Also, the name "homunculus" is already taken by an existing GitHub user, preventing us from using it as an app name. Need to find alternative naming and invocation strategy.
**Files**: server.js
---

### [00:04] [gotcha] GitHub slash commands are not native
**Details**: GitHub does NOT have native slash command support with autocomplete like Discord/Slack. The "slash commands" people implement are just parsing regular comments for patterns like /deploy. GitHub Copilot has slash commands in VS Code, but that's different from GitHub.com. We'll need to stick with @mentions or keyword detection in comments. GitHub Apps can't add real slash commands to the GitHub UI.
**Files**: server.js
---

### [00:05] [gotcha] GitHub native slash commands exist but are built-in only
**Details**: GitHub DOES have native slash commands with autocomplete (/close, /assign, /label, /duplicate, etc.) but these are built-in GitHub features only. Third-party apps and bots CANNOT add custom slash commands to this autocomplete system. Custom "slash commands" from bots are just pattern matching in regular comments. We cannot make our bot integrate with GitHub's slash command autocomplete.
**Files**: server.js
---

### [00:07] [pattern] Triple-slash command pattern for bot invocation
**Details**: Instead of @mentions or GitHub App, using ///accept and ///review as custom command patterns in comments. This avoids naming conflicts and doesn't require a GitHub user account. For PR reviews, need to determine a pattern - possibly just ///review in PR review comments or ///fix for addressing feedback.
**Files**: server.js
---

### [00:18] [pattern] Command pattern changed from @homunculus to ///
**Details**: The project has switched from using @homunculus mentions to /// command pattern for triggering Claude in GitHub issues and PRs. This is a cleaner, more concise syntax. Commands are:
- /// [review] - for issue review
- /// [accept] - for implementing solutions
- /// - in PR reviews for addressing feedback
**Files**: README.md, server.js
---

