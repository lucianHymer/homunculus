# Homunculus - GitHub Code Assistant

## Overview

A simple webhook server that passes GitHub events to Claude Code CLI. Claude does all the heavy lifting using `gh` CLI to read issues/PRs and implement solutions.

## How It Works

1. **`@homunculus [review]`** - Claude reads the issue/comments and posts an analysis
2. **`@homunculus [accept]`** - Claude implements the solution and creates a PR  
3. **`@homunculus` in PR review** - Claude addresses the feedback and pushes fixes

That's it. No complex orchestration, no state management. Just wake up Claude and let it work.

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
    echo "Setting up Cloudflare tunnel..."
    cloudflared tunnel login
    cloudflared tunnel create homunculus
    
    cat > ~/.cloudflared/config.yml << EOF
tunnel: $(cloudflared tunnel list | grep homunculus | awk '{print $1}')
credentials-file: $HOME/.cloudflared/$(cloudflared tunnel list | grep homunculus | awk '{print $1}').json

ingress:
  - hostname: homunculus.yourdomain.com
    service: http://localhost:8080
  - service: http_status:404
EOF

    cloudflared tunnel route dns homunculus homunculus.yourdomain.com
fi

# Setup GitHub CLI OAuth (one-time interactive)
if ! gh auth status &> /dev/null; then
    echo "Authenticating with GitHub..."
    gh auth login
fi

# Start services
echo "Starting services..."
cloudflared tunnel run homunculus &
node server.js &

echo "Homunculus is ready! Webhook URL: https://homunculus.yourdomain.com/webhook"
```

### Core Files

**server.js:**
```javascript
#!/usr/bin/env node
const express = require('express');
const crypto = require('crypto');
const { spawn } = require('child_process');

const app = express();
app.use(express.raw({ type: 'application/json' }));

// Security config
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;
const WORKSPACE_DIR = process.env.WORKSPACE_DIR || '/workspace';

app.post('/webhook', (req, res) => {
  // 1. Verify webhook signature
  const signature = req.headers['x-hub-signature-256'] || '';
  if (!verifySignature(req.body, signature)) {
    return res.status(401).send('Unauthorized');
  }
  
  const payload = JSON.parse(req.body.toString());
  
  // 2. Check for @homunculus mention
  const body = payload.comment?.body || 
               payload.issue?.body || 
               payload.review?.body || '';
  
  if (!body.includes('@homunculus')) {
    return res.status(200).send('Not mentioned');
  }
  
  // 3. Pre-clone repository
  const repo = payload.repository.full_name;
  const event = req.headers['x-github-event'];
  const taskId = crypto.randomBytes(8).toString('hex');
  const workDir = `${WORKSPACE_DIR}/${repo.replace('/', '-')}-${taskId}`;
  
  // Clone the repo first
  const { execSync } = require('child_process');
  try {
    execSync(`gh repo clone ${repo} ${workDir}`, { stdio: 'ignore' });
  } catch (err) {
    console.error(`Failed to clone ${repo}: ${err.message}`);
    return res.status(500).send('Clone failed');
  }
  
  // 4. Build simpler prompt (no need to clone)
  let prompt = '';
  
  if (body.includes('[review]') && ['issues', 'issue_comment'].includes(event)) {
    const num = payload.issue.number;
    prompt = `Use 'gh issue view ${num} -R ${repo} --comments' to read the issue and all comments.
Post a comment with your analysis and implementation plan.
Ask clarifying questions if needed.`;
    
  } else if (body.includes('[accept]') && ['issues', 'issue_comment'].includes(event)) {
    const num = payload.issue.number;
    prompt = `Use 'gh issue view ${num} -R ${repo} --comments' to read the issue and discussion.
Implement the solution, create a branch, commit, and open a PR.
Reference issue #${num}.`;
    
  } else if (event === 'pull_request_review' && body.includes('@homunculus')) {
    const num = payload.pull_request.number;
    prompt = `Use 'gh pr view ${num} -R ${repo} --comments' to read all review feedback.
Checkout the PR branch, address the requested changes, commit and push.`;
    
  } else {
    // Clean up if no action
    execSync(`rm -rf ${workDir}`, { stdio: 'ignore' });
    return res.status(200).send('No action');
  }
  
  // 5. Wake the homunculus in the cloned repo
  spawn('claude', ['-p', prompt], { cwd: workDir, detached: true });
  return res.status(202).send('Homunculus awakened');
});

function verifySignature(payload, signature) {
  if (!signature || !signature.startsWith('sha256=')) {
    return false;
  }
  const [, sig] = signature.split('=', 2);
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

app.listen(8080, '0.0.0.0', () => {
  console.log('Homunculus webhook server listening on port 8080');
});
```

## Testing

1. Use [smee.io](https://smee.io) to forward webhooks to localhost:
```bash
npm install -g smee-client
smee -u https://smee.io/your-channel -t http://localhost:8080/webhook
```

2. Create test issue: "Add a hello world function @homunculus [review]"
3. Comment "@homunculus [accept]" when ready

## How It Works Under the Hood

1. GitHub sends webhook to your server when `@homunculus` is mentioned
2. Server verifies the webhook signature
3. Based on the command ([review], [accept], or PR review), it constructs a simple prompt
4. Spawns Claude Code with the prompt, which uses `gh` CLI to:
   - Read issues/PRs and comments
   - Post analysis and implementation plans
   - Create branches and PRs
   - Push fixes based on review feedback

## That's It!

No complex orchestration. No prompt engineering. No state management. Just a simple webhook → Claude bridge. The homunculus awakens, solves the problem, and goes back to sleep.
