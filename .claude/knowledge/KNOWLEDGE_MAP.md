# 📚 Homunculus Knowledge Map

*Last updated: 2025-09-10 20:24*

## 🏗️ Architecture
- [Homunculus Design](architecture/homunculus-design.md) - Core webhook-Claude bridge architecture

## 🔒 Security  
- [Webhook Security](security/webhook-security.md) - GitHub webhook security and Smee.io considerations

## ⚙️ Configuration
- [Phase 1 Implementation](config/phase1-implementation.md) - Initial webhook server setup and configuration

## 🔄 Workflows
- [Testing Webhooks](workflows/testing-webhooks.md) - How to test the webhook server locally and externally
- [Phase 2 Claude Integration](workflows/phase2-claude-integration.md) - Claude CLI integration implementation details

## Quick Reference
- **Server**: Express.js webhook server on port 8080
- **Security**: HMAC SHA-256 signature validation required
- **Testing**: Use `test-webhook.js` locally or Smee.io for external
- **Config**: Set `GITHUB_WEBHOOK_SECRET` in `.env` file
- **Phase 2**: Claude integration complete with detached process spawning
- **Work Dirs**: `/workspace/{repo-name}-{8-char-taskId}` pattern