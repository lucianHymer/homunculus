# Webhook Security Considerations

## Smee.io Development Tool
**WARNING**: Smee.io is a FREE development tool, NOT for production use
- Channels are unauthenticated - anyone with the URL can see payloads
- No data storage, just a pass-through proxy
- Alternatives: hook.pipelinesascode.com or self-host

## GitHub Webhook Security
### Payload Contents
GitHub webhook payloads don't contain auth tokens/secrets but include:
- Repository metadata
- Issue/PR content  
- User information
- Security headers (X-Hub-Signature-256) for verification

### Security Best Practices
- Payloads are NOT encrypted, sent over HTTPS
- **MUST** validate signatures to prevent MITM attacks
- **NEVER** put secrets in webhook URLs
- Use HMAC SHA-256 signature verification

## Related Files
- `homunculus-plan.md` - Security considerations documentation