# Homunculus - GitHub Code Assistant

> *An artificial being, confined to a container. It's gonna solve all your problems. This is definitely going to go great.*

## Overview

A containerized GitHub bot that uses Claude Code CLI to automatically fix issues and respond to PR reviews. Summoned by mentioning `@homunculus` in issues and PRs.

## Architecture

### Core Components

```
Container (homunculus):
├── cloudflared (tunnel daemon)
├── Webhook Server (Flask/FastAPI)
│   └── /webhook endpoint
├── GitHub App Authentication
│   └── Private key (.pem)
├── Claude Code CLI
│   └── Pre-authenticated via OAuth
├── Orchestrator Service
│   ├── Webhook processor
│   ├── Prompt builder
│   └── State manager
└── Git Operations
    ├── Clone/branch/commit
    └── Push changes
```

### Workflow Triggers

1. **Issue Creation with @homunculus tag**
   - Bot creates a plan and posts as comment
   
2. **Issue Comment with @homunculus tag**
   - `@homunculus [review]` - Bot reviews and posts analysis
   - `@homunculus [approve]` - Bot creates PR with implementation
   
3. **PR Review Completion with @homunculus tag**
   - Bot addresses review feedback and pushes fixes

## Setup Instructions

### 1. GitHub App Creation

1. Go to GitHub Settings → Developer Settings → GitHub Apps → New GitHub App
2. Configure:
   - **Name**: homunculus
   - **Homepage URL**: Your domain or GitHub repo
   - **Webhook URL**: `https://homunculus.yourdomain.com/webhook`
   - **Webhook Secret**: Generate a strong secret, save it
   - **Permissions**:
     - Repository:
       - Issues: Read & Write
       - Pull Requests: Read & Write
       - Contents: Read & Write
       - Metadata: Read
   - **Subscribe to Events**:
     - Issues
     - Issue comment
     - Pull request
     - Pull request review
     - Pull request review comment
3. Create App and save:
   - App ID
   - Download Private Key (.pem file)
4. Install the App on your repositories

### 2. Cloudflare Tunnel Setup

```bash
# On your host machine (one-time setup)
# Install cloudflared
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Authenticate with Cloudflare
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create homunculus
# This creates ~/.cloudflared/<tunnel-id>.json credentials file

# Create config file at ~/.cloudflared/config.yml
```

**config.yml:**
```yaml
tunnel: <your-tunnel-id>
credentials-file: /home/user/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: homunculus.yourdomain.com
    service: http://localhost:8080
  - service: http_status:404
```

```bash
# Add DNS record (if using your own domain)
cloudflared tunnel route dns homunculus homunculus.yourdomain.com
```

### 3. Claude Code Authentication

```bash
# Inside container or on host (credentials can be mounted)
claude login
# Follow OAuth flow, authenticate with Claude subscription
# Credentials saved to ~/.claude/
```

### 4. Container Setup

**Dockerfile:**
```dockerfile
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install cloudflared
RUN wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb \
    && dpkg -i cloudflared-linux-amd64.deb \
    && rm cloudflared-linux-amd64.deb

# Install Claude Code CLI
RUN curl -fsSL https://storage.googleapis.com/claude-code-cli/install.sh | bash

# Install Python dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy application code
COPY app/ /app
WORKDIR /app

# Copy credentials (mounted at runtime)
# GitHub App private key
# Claude auth credentials
# Cloudflare tunnel credentials

CMD ["./start.sh"]
```

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  homunculus:
    build: .
    container_name: homunculus
    volumes:
      - ~/.cloudflared:/root/.cloudflared:ro
      - ~/.claude:/root/.claude:ro
      - ./github-app-key.pem:/app/github-app-key.pem:ro
      - ./workspace:/workspace
    environment:
      - GITHUB_APP_ID=your_app_id
      - GITHUB_WEBHOOK_SECRET=your_webhook_secret
      - TUNNEL_NAME=homunculus
    restart: unless-stopped
```

### 5. Webhook Server Structure

**app/server.py (Flask example):**
```python
from flask import Flask, request
import hmac
import hashlib
import json
from orchestrator import Orchestrator

app = Flask(__name__)
orchestrator = Orchestrator()

@app.route('/webhook', methods=['POST'])
def webhook():
    # Verify webhook signature
    signature = request.headers.get('X-Hub-Signature-256')
    if not verify_signature(request.data, signature):
        return 'Unauthorized', 401
    
    event_type = request.headers.get('X-GitHub-Event')
    payload = request.json
    
    # Check if homunculus is mentioned
    if not is_homunculus_mentioned(payload):
        return 'OK', 200
    
    # Process based on event type
    if event_type == 'issues':
        orchestrator.handle_issue(payload)
    elif event_type == 'issue_comment':
        orchestrator.handle_issue_comment(payload)
    elif event_type == 'pull_request_review':
        orchestrator.handle_pr_review(payload)
    
    return 'OK', 200

def verify_signature(payload, signature):
    secret = os.environ['GITHUB_WEBHOOK_SECRET']
    expected = 'sha256=' + hmac.new(
        secret.encode(), 
        payload, 
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

### 6. Orchestrator Logic

**Key Functions:**
```python
class Orchestrator:
    def handle_issue(self, payload):
        # Extract issue details
        # Build prompt for Claude
        # Run: claude --output-format json -p "Create a plan for: {issue}"
        # Parse response
        # Post plan as comment via GitHub API
    
    def handle_issue_comment(self, payload):
        # Check for [review] or [approve] commands
        # If [review]: Analyze with Claude, post findings
        # If [approve]: Generate fix, create branch, open PR
    
    def handle_pr_review(self, payload):
        # Collect all review comments
        # Build comprehensive prompt
        # Run: claude -p "Address these review comments: {feedback}"
        # Apply changes, commit, push
```

## Claude Prompting Strategy

### System Prompts

**For Issue Analysis:**
```
You are a GitHub issue resolver. Analyze the issue and output JSON:
{
  "understanding": "what the issue is asking for",
  "approach": "how you would solve it",
  "files_affected": ["list", "of", "files"],
  "complexity": "simple|moderate|complex",
  "questions": ["any clarifications needed"]
}
```

**For Code Generation:**
```
You are implementing a GitHub issue fix. Output JSON:
{
  "summary": "what you're changing",
  "changes": [
    {
      "file": "path/to/file",
      "operation": "create|modify|delete",
      "content": "full file content or diff"
    }
  ],
  "testing": "how to verify the fix"
}
```

## Security Considerations

1. **Cloudflare Tunnel**: No inbound ports required
2. **Webhook Verification**: Always verify GitHub signatures
3. **Limited Permissions**: GitHub App only has necessary repo access
4. **Container Isolation**: All operations in contained environment
5. **Credential Management**: Mount as read-only volumes

## State Management

Track in SQLite or JSON file:
- Processed webhook IDs (avoid duplicates)
- Issue → PR mappings
- Review comment threads
- Pending approvals

## Future Enhancements

1. **Test Suite Integration**: Run tests before committing
2. **Multi-round Conversations**: Maintain context across interactions
3. **Custom Commands**: 
   - `@homunculus explain [file]`
   - `@homunculus refactor [component]`
   - `@homunculus test [function]`
4. **Metrics Dashboard**: Track success rate, response times
5. **Rate Limiting**: Prevent Claude API exhaustion

## Startup Sequence

```bash
#!/bin/bash
# start.sh

# Start Cloudflare tunnel in background
cloudflared tunnel run homunculus &

# Wait for tunnel to establish
sleep 5

# Start webhook server
python server.py
```

## Testing

1. Create test issue: "Fix typo in README @homunculus"
2. Watch container logs for webhook receipt
3. Verify bot posts plan as comment
4. Comment "@homunculus [approve]"
5. Verify PR creation

## Monitoring

- Container logs: `docker logs -f homunculus`
- Cloudflare dashboard: Tunnel metrics
- GitHub App dashboard: Delivery history
- Claude usage: Monitor via Claude dashboard

## Avatar Setup

Use the Flask Homunculus image from Full Metal Alchemist as the GitHub App avatar for maximum aesthetic impact.