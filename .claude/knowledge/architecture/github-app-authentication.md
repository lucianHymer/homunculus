# GitHub App Authentication Architecture

## Core Implementation
Homunculus supports full GitHub App authentication alongside personal access tokens. The system automatically detects GitHub App configuration from environment variables and handles token management.

## Components

### GitHubAppAuth Class
- Handles JWT generation for GitHub App authentication
- Manages installation token exchange with caching
- Located in `github-app-auth.js`

### Server Integration
- Automatically detects GitHub App configuration from:
  - `GITHUB_APP_ID`
  - `GITHUB_APP_PRIVATE_KEY_PATH`
- Obtains installation tokens for each webhook
- Passes tokens to Claude subprocess via `GH_TOKEN` environment variable
- Falls back gracefully to personal tokens or existing gh CLI auth

### Subprocess Authentication
GitHub App authentication is passed to Claude subprocess by:
1. Setting `GH_TOKEN` environment variable with installation token
2. The gh CLI automatically uses this token for authentication
3. No direct GitHub App support in gh CLI - uses token as regular PAT

## Related Files
- `github-app-auth.js` - GitHub App authentication implementation
- `server.js` - Integration and token passing (lines 191-205)
- `test-github-app.js` - Testing utilities
- `.env.example` - Configuration template