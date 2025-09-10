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

