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
- @workflows/phase3-5-github-cli.md - Complete GitHub CLI integration for all commands

## Quick Reference
- **Server**: Express.js webhook server on port 8080
- **Security**: HMAC SHA-256 signature validation required
- **Testing**: Use `test-webhook.js` locally or Smee.io for external
- **Config**: Set `GITHUB_WEBHOOK_SECRET` in `.env` file
- **Phases 1-5**: ✅ ALL COMPLETE - Full webhook-to-Claude bridge operational
- **Work Dirs**: `/workspace/{repo-name}-{8-char-taskId}` pattern