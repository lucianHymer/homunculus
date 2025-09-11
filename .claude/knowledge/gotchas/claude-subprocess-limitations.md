# Claude Subprocess Limitations & Gotchas

## [2024-12] Command Approval Security Model
When spawning Claude as a subprocess, it has a security approval mechanism that blocks commands by default. Even with proper GitHub App authentication (GH_TOKEN passed correctly), Claude cannot execute gh commands without user approval. This is a fundamental limitation of Claude's security model when running in subprocess mode.

## [2024-12] PR Creation Restrictions
Claude cannot create PRs when running as a subprocess, even with proper GitHub authentication. The server correctly passes GitHub App tokens via GH_TOKEN environment variable (server.js:178), and tokens work for reading issues. However, Claude has built-in restrictions preventing PR creation in subprocess mode, likely requiring interactive approval for write operations.

This is NOT an authentication issue - the GitHub App has write permissions and can create branches.

## Related Files
- `test-claude-subprocess.js` - Demonstrates limitations
- `server.js` - Subprocess spawning implementation
- `test-pr-creation.js` - Proves GitHub App has write access