# Knowledge Capture Session - 2025-09-10

### [14:44] [architecture] Homunculus webhook-Claude bridge architecture
**Details**: Homunculus is a minimal webhook server that passes GitHub events to Claude Code CLI. Core workflow:
1. @homunculus [review] - Claude reads issue/comments and posts analysis
2. @homunculus [accept] - Claude implements solution and creates PR
3. @homunculus in PR review - Claude addresses feedback and pushes fixes

Server verifies webhook signatures, clones repo to workspace, constructs simple prompts, and spawns Claude with detached process. No complex orchestration or state management - just wake Claude and let it work using gh CLI.
**Files**: homunculus-plan.md, server.js
---

### [14:55] [security] Smee.io and webhook security considerations
**Details**: Smee.io is a FREE development tool, NOT for production:
- Channels are unauthenticated - anyone with URL can see payloads
- No data storage, just pass-through proxy
- Alternative: hook.pipelinesascode.com or self-host

GitHub webhook payloads don't contain auth tokens/secrets but include:
- Repository metadata, issue/PR content, user info
- Security headers (X-Hub-Signature-256) for verification
- Payloads are NOT encrypted, sent over HTTPS
- Must validate signatures to prevent MITM attacks
- Never put secrets in webhook URLs
**Files**: homunculus-plan.md
---

