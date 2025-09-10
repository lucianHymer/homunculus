# 📚 Homunculus Knowledge Map

## 🏗️ Architecture
- @architecture/homunculus-design.md - Core webhook-Claude bridge architecture

## 🔒 Security  
- @security/webhook-security.md - GitHub webhook security and Smee.io considerations

## ⚙️ Configuration
- @config/phase1-implementation.md - Initial webhook server setup and configuration

## 🔄 Workflows
- @workflows/testing-webhooks.md - How to test the webhook server locally and externally
- @workflows/phase2-claude-integration.md - Claude CLI integration implementation details

## Quick Reference
- **Server**: Express.js webhook server on port 8080
- **Security**: HMAC SHA-256 signature validation required
- **Testing**: Use `test-webhook.js` locally or Smee.io for external
- **Config**: Set `GITHUB_WEBHOOK_SECRET` in `.env` file
- **Phase 2**: Claude integration complete with detached process spawning
- **Work Dirs**: `/workspace/{repo-name}-{8-char-taskId}` pattern