# Homunculus Architecture

## Core Design
Homunculus is a minimal webhook server that serves as a bridge between GitHub events and Claude Code CLI. The architecture follows a simple, stateless design pattern.

## Workflow
1. **@homunculus [review]** - Claude reads issue/comments and posts analysis
2. **@homunculus [accept]** - Claude implements solution and creates PR  
3. **@homunculus in PR review** - Claude addresses feedback and pushes fixes

## Implementation Details
- Simple webhook → Claude bridge architecture
- Server receives GitHub webhooks and verifies signatures
- Checks for @homunculus mentions in payloads
- Clones repository to workspace
- Constructs simple prompts based on the event
- Spawns Claude Code CLI with detached process
- No complex orchestration or state management
- Claude handles all GitHub interactions using gh CLI

## Phase Implementation Status

### Phase 1 - Basic Webhook Server
Implemented as a basic Express webhook receiver with:
- dotenv configuration support
- GitHub webhook signature validation (HMAC SHA-256)
- @homunculus mention detection in issue/PR/review bodies
- Event logging (no action taken yet)
- Environment variables: PORT and GITHUB_WEBHOOK_SECRET

### Phase 2 - Claude Integration ✅
Successfully implemented with features beyond requirements:
- Claude spawning with detached processes using spawn()
- WORKSPACE_DIR environment variable (defaults to /workspace)
- Repository cloning with gh CLI (graceful fallback to mkdir)
- Task ID generation for unique work directories ({repo-name}-{8-char-taskId})
- Process detachment with unref() for immediate server response
- Claude executes in cloned repo directory
- Complete command parsing ([review], [accept], PR review)
- Full event routing (issues, issue_comment, pull_request_review)
- processWebhook() handles all webhook types
- **Note**: Overcomplete implementation facilitated rapid Phase 3-5 completion

### Phase 3-5 - GitHub CLI Integration ✅ 
All three phases completed with full GitHub CLI integration:
- **Phase 3 ([review])**: gh issue view → Claude analysis → gh issue comment
- **Phase 4 ([accept])**: gh issue view → Claude implementation → gh pr create
- **Phase 5 (PR review)**: gh pr view → gh pr checkout → Claude fixes → git push
- Implemented in server.js lines 108-124
- Complete webhook-to-Claude bridge functionality achieved

## Related Files
- `homunculus-plan.md` - Original design document
- `server.js` - Main webhook server implementation
- `test-phase2.js` - Phase 2 testing script
- `test-phase3.js` - Phase 3-5 testing script