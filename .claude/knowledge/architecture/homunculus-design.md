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

## Related Files
- `homunculus-plan.md` - Original design document
- `server.js` - Main webhook server implementation