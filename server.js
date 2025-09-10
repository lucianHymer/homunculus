#!/usr/bin/env node
require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const GitHubAppAuth = require('./github-app-auth');

const app = express();
app.use(express.raw({ type: 'application/json' }));

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;
const PORT = process.env.PORT || 8080;
const WORKSPACE_DIR = process.env.WORKSPACE_DIR || '/workspace';

// GitHub App configuration
const GITHUB_APP_ID = process.env.GITHUB_APP_ID;
const GITHUB_APP_PRIVATE_KEY_PATH = process.env.GITHUB_APP_PRIVATE_KEY_PATH;
const USE_GITHUB_APP = GITHUB_APP_ID && GITHUB_APP_PRIVATE_KEY_PATH;

let githubAppAuth;
if (USE_GITHUB_APP) {
  try {
    githubAppAuth = new GitHubAppAuth(GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY_PATH);
    console.log('GitHub App authentication configured');
  } catch (err) {
    console.error('Failed to configure GitHub App:', err.message);
    console.log('Falling back to GH_TOKEN or gh CLI auth');
  }
}

function verifySignature(payload, signature) {
  if (!WEBHOOK_SECRET) {
    console.warn('WARNING: GITHUB_WEBHOOK_SECRET not set, skipping verification');
    return true;
  }
  
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

app.post('/webhook', (req, res) => {
  console.log('Received webhook event');
  
  const signature = req.headers['x-hub-signature-256'] || '';
  const event = req.headers['x-github-event'];
  const delivery = req.headers['x-github-delivery'];
  
  console.log(`Event: ${event}, Delivery: ${delivery}`);
  
  if (!verifySignature(req.body, signature)) {
    console.error('Invalid signature');
    return res.status(401).send('Unauthorized');
  }
  
  const payload = JSON.parse(req.body.toString());
  
  const body = payload.comment?.body || 
               payload.issue?.body || 
               payload.review?.body || '';
  
  console.log(`Checking for @homunculus mention in: "${body.substring(0, 100)}..."`);
  
  if (!body.includes('@homunculus')) {
    console.log('No @homunculus mention found');
    return res.status(200).send('Not mentioned');
  }
  
  console.log('Found @homunculus mention!');
  console.log('Repository:', payload.repository?.full_name);
  console.log('Action:', payload.action);
  
  if (payload.issue) {
    console.log('Issue #:', payload.issue.number);
    console.log('Issue title:', payload.issue.title);
  }
  
  if (payload.pull_request) {
    console.log('PR #:', payload.pull_request.number);
    console.log('PR title:', payload.pull_request.title);
  }
  
  // Phase 2: Process the webhook and spawn Claude
  processWebhook(payload, event, body)
    .then(result => {
      if (result.action === 'none') {
        res.status(200).send('No action needed');
      } else {
        res.status(202).send(`Homunculus awakened: ${result.action}`);
      }
    })
    .catch(err => {
      console.error('Error processing webhook:', err);
      res.status(500).send('Internal error');
    });
});

app.get('/health', (req, res) => {
  res.status(200).send('Homunculus webhook server is running');
});

async function processWebhook(payload, event, body) {
  const repo = payload.repository?.full_name;
  if (!repo) {
    console.error('No repository information in payload');
    return { action: 'none' };
  }
  
  // Generate unique task ID
  const taskId = crypto.randomBytes(8).toString('hex');
  const workDir = path.join(WORKSPACE_DIR, `${repo.replace('/', '-')}-${taskId}`);
  
  // Determine action and build prompt
  let prompt = '';
  let action = 'none';
  
  if (body.includes('[review]') && ['issues', 'issue_comment'].includes(event)) {
    const num = payload.issue.number;
    action = 'review';
    prompt = `Use 'gh issue view ${num} -R ${repo} --comments' to read the issue and all comments.
Post a comment with your analysis and implementation plan using 'gh issue comment ${num} -R ${repo} -b "your analysis here"'.
Ask clarifying questions if needed.`;
    
  } else if (body.includes('[accept]') && ['issues', 'issue_comment'].includes(event)) {
    const num = payload.issue.number;
    action = 'accept';
    prompt = `Use 'gh issue view ${num} -R ${repo} --comments' to read the issue and discussion.
Implement the solution in the code, create a new branch, commit your changes, and open a PR.
Use 'gh pr create' to create the PR and reference issue #${num} in the PR body.`;
    
  } else if (event === 'pull_request_review' && body.includes('@homunculus')) {
    const num = payload.pull_request.number;
    action = 'pr-review';
    prompt = `Use 'gh pr view ${num} -R ${repo} --comments' to read all review feedback.
Checkout the PR branch with 'gh pr checkout ${num}', address the requested changes, commit and push.
The PR will automatically update with your new commits.`;
    
  } else {
    console.log('No recognized command found');
    return { action: 'none' };
  }
  
  console.log(`Action: ${action}, Task ID: ${taskId}`);
  console.log(`Work directory: ${workDir}`);
  
  // Set up GitHub App auth environment variables if configured
  let claudeEnv = { ...process.env };
  if (USE_GITHUB_APP) {
    // Pass GitHub App credentials to subprocess
    claudeEnv.GITHUB_APP_ID = GITHUB_APP_ID;
    claudeEnv.GITHUB_APP_PRIVATE_KEY_PATH = GITHUB_APP_PRIVATE_KEY_PATH;
    console.log('Passing GitHub App credentials to Claude subprocess');
  }
  
  // Clone repository
  try {
    console.log(`Cloning repository ${repo}...`);
    execSync(`gh repo clone ${repo} "${workDir}"`, { 
      stdio: 'pipe',
      encoding: 'utf8',
      env: claudeEnv
    });
    console.log('Repository cloned successfully');
  } catch (err) {
    console.error(`Failed to clone ${repo}:`, err.message);
    // For Phase 2 testing, create directory anyway
    fs.mkdirSync(workDir, { recursive: true });
    console.log('Created work directory for testing');
  }
  
  // Spawn Claude with detached process
  console.log('Spawning Claude with prompt:', prompt);
  
  try {
    const claudeProcess = spawn('claude', ['-p', prompt], {
      cwd: workDir,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: claudeEnv
    });
    
    // Log initial output for debugging
    claudeProcess.stdout.on('data', (data) => {
      console.log(`Claude [${taskId}]:`, data.toString());
    });
    
    claudeProcess.stderr.on('data', (data) => {
      console.error(`Claude Error [${taskId}]:`, data.toString());
    });
    
    // Detach the process so it continues after server responds
    claudeProcess.unref();
    
    console.log(`Claude spawned with PID: ${claudeProcess.pid}`);
  } catch (err) {
    console.error('Failed to spawn Claude:', err.message);
    return { action: 'error', error: err.message };
  }
  
  return { action, taskId, workDir };
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Homunculus webhook server listening on port ${PORT}`);
  console.log(`Workspace directory: ${WORKSPACE_DIR}`);
  if (!WEBHOOK_SECRET) {
    console.warn('WARNING: Running without webhook signature verification (GITHUB_WEBHOOK_SECRET not set)');
  }
});