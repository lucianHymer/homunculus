# Homunculus - GitHub Code Assistant

## Overview

A simple webhook server that passes GitHub events to Claude Code CLI. Claude does all the heavy lifting using `gh` CLI to read issues/PRs and implement solutions.

## How It Works

1. **`@homunculus [review]`** - Claude reads the issue/comments and posts an analysis
2. **`@homunculus [accept]`** - Claude implements the solution and creates a PR  
3. **`@homunculus` in PR review** - Claude addresses the feedback and pushes fixes

That's it. No complex orchestration, no state management. Just wake up Claude and let it work.

## Current Status

**Phase 1 COMPLETED**: Core webhook server is operational with full signature verification, @homunculus mention detection, and testing infrastructure.

## Quick Setup

### Prerequisites
- GitHub webhook secret for verification
- Cloudflare account for tunnel (or any other tunnel solution)
- Claude Code authenticated (`claude login`)
- GitHub CLI authenticated (`gh auth login`)

### Setup Script

Create a `setup-homunculus.sh`:

```bash
#!/bin/bash

# Configuration
export GITHUB_WEBHOOK_SECRET="your_webhook_secret"
export WORKSPACE_DIR="/workspace"  # Override if needed

# Install dependencies
echo "Installing dependencies..."
npm install express

# Setup Cloudflare tunnel (if not already done)
if ! command -v cloudflared &> /dev/null; then
    echo "Installing cloudflared..."
    wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    sudo dpkg -i cloudflared-linux-amd64.deb
    rm cloudflared-linux-amd64.deb
fi

# Create tunnel config if needed
if [ ! -f ~/.cloudflared/config.yml ]; then
    echo "Setting up tunnel..."
    cloudflared tunnel login
    cloudflared tunnel create homunculus
    
    # Create config file
    cat > ~/.cloudflared/config.yml << EOF
tunnel: homunculus
credentials-file: $HOME/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: homunculus.yourdomain.com
    service: http://localhost:8080
  - service: http_status:404
EOF
fi

# Start services
echo "Starting Cloudflare tunnel..."
cloudflared tunnel run homunculus &

echo "Starting Homunculus server..."
node src/server.js
```

### GitHub Repository Setup

1. **Create Webhook**:
   - URL: `https://homunculus.yourdomain.com/webhook`
   - Content type: `application/json`
   - Secret: Same as `GITHUB_WEBHOOK_SECRET`
   - Events: Issues, Issue comments, Pull request reviews

2. **Permissions** (if using personal token):
   - `gh auth login` with appropriate permissions
   - Needs: repo, write:discussion

## Architecture

The implementation is deliberately simple:

1. **Webhook Server** (`src/server.js`):
   - Validates GitHub webhook signatures
   - Checks for @homunculus mentions
   - Spawns Claude Code CLI with appropriate context

2. **Claude Integration**:
   - Uses the Claude Code CLI directly
   - All GitHub operations through `gh` CLI
   - No complex state management or database

3. **Security**:
   - HMAC signature validation on all webhooks
   - Environment variable for webhook secret
   - Claude runs in isolated subprocess

## Phase Implementation

### Phase 1: Basic Webhook Server ✅
- Express webhook receiver
- GitHub signature validation
- @homunculus mention detection
- Environment configuration

### Phase 2: Claude Integration (Next)
- Spawn Claude subprocess for each webhook
- Pass GitHub context to Claude
- Let Claude handle all operations via `gh` CLI

### Phase 3: Issue Review Command
- `@homunculus [review]` triggers issue analysis
- Claude reads issue with `gh issue view`
- Posts analysis as comment

### Phase 4: Solution Implementation  
- `@homunculus [accept]` triggers implementation
- Claude creates feature branch
- Implements solution and creates PR

### Phase 5: PR Review Handling
- @homunculus in PR review triggers response
- Claude addresses feedback
- Pushes fixes to PR branch

## Development

### Running Locally

```bash
# Install dependencies
npm install

# Set environment variables
export GITHUB_WEBHOOK_SECRET="your_secret"
export PORT=8080

# Run the server
node src/server.js
```

### Testing Webhooks Locally

Use the provided test script:

```bash
node test-webhook.js
```

Or use a tool like [smee.io](https://smee.io) to forward GitHub webhooks to your local server:

```bash
npx smee -u https://smee.io/your_channel -t http://localhost:8080/webhook
```

### Security Considerations

⚠️ **About smee.io**: It's a FREE development tool, not for production. Channels are unauthenticated - anyone with the URL can see payloads. For production, use proper tunneling solutions like Cloudflare Tunnel, ngrok with authentication, or deploy to a proper server.

GitHub webhook payloads don't contain auth tokens but include:
- Repository metadata
- Issue/PR content  
- User information
- Security headers for verification

Always validate signatures and never put secrets in webhook URLs.

## Troubleshooting

### Common Issues

1. **Signature Validation Failing**
   - Ensure `GITHUB_WEBHOOK_SECRET` matches GitHub webhook configuration
   - Check that the secret is not wrapped in quotes in the environment

2. **Claude Not Responding**
   - Verify Claude Code is authenticated: `claude login`
   - Check Claude has necessary permissions

3. **GitHub Operations Failing**
   - Ensure `gh` CLI is authenticated: `gh auth status`
   - Verify repository permissions

### Debug Mode

Set `DEBUG=true` for verbose logging:

```bash
DEBUG=true node src/server.js
```

## Future Enhancements

Potential improvements (keep it simple though):

- [ ] Rate limiting for webhook processing
- [ ] Basic metrics/logging
- [ ] Webhook replay capability
- [ ] Simple web UI for monitoring

Remember: The goal is simplicity. Resist the urge to over-engineer.

## License

MIT - See LICENSE file for details.