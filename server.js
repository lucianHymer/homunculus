#!/usr/bin/env node
require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
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

// Track recently processed commands to prevent duplicates
const recentlyProcessed = new Set();
// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const key of recentlyProcessed) {
    const timestamp = parseInt(key.split('-').pop());
    if (now - timestamp > 300000) { // 5 minutes
      recentlyProcessed.delete(key);
    }
  }
}, 300000);

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
  
  // Filter out actions we don't want to process
  const allowedActions = {
    'issues': ['opened', 'edited'],
    'issue_comment': ['created'],
    'pull_request_review': ['submitted']
  };
  
  if (!allowedActions[event]?.includes(payload.action)) {
    console.log(`Ignoring ${event} with action: ${payload.action}`);
    return res.status(200).send('Action not processed');
  }
  
  // Skip if comment is from the bot itself to prevent feedback loops
  const authorLogin = payload.comment?.user?.login || 
                     payload.issue?.user?.login ||
                     payload.sender?.login;
  
  if (authorLogin === 'dwarf-in-the-flask[bot]' || 
      authorLogin?.endsWith('[bot]')) {
    console.log('Ignoring bot\'s own comment');
    return res.status(200).send('Bot comment ignored');
  }
  
  const body = payload.comment?.body || 
               payload.issue?.body || 
               payload.review?.body || '';
  
  console.log(`Checking for /// commands in: "${body.substring(0, 100)}..."`)
  
  if (!body.includes('///')) {
    console.log('No /// command found');
    return res.status(200).send('No command');
  }
  
  console.log('Found /// command!');
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
        res.status(202).send(`Command triggered: ${result.action}`);
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
  let issueOrPrNumber = null;
  let isIssue = false;
  
  if (body.includes('///review') && ['issues', 'issue_comment'].includes(event)) {
    const num = payload.issue.number;
    issueOrPrNumber = num;
    isIssue = true;
    action = 'review';
    prompt = `You are conducting a technical review of a GitHub issue for handoff to another agent.

CONTEXT: You are the FIRST agent. The NEXT agent will:
- Have access ONLY to this issue and your review comment
- Start with a fresh Claude instance with NO prior knowledge
- Not see any of your working context or memory

Therefore, your review MUST be completely self-contained and comprehensive.

INSTRUCTIONS:
1. First, use 'gh issue view ${num} -R ${repo} --comments' to read the issue and all comments
2. Analyze the request thoroughly, considering implementation details
3. Run quick tests to verify your assumptions where applicable/practical (e.g., test file existence, check dependencies, validate syntax)
4. Post a structured review using 'gh issue comment ${num} -R ${repo} -b "your review"'

Your review comment MUST use this EXACT structure with ALL sections:

## Analysis: [Brief Issue Title]

### 📋 Problem Definition
[Clear, complete statement of what needs to be solved/built. Include specific requirements.]

### 🔧 Technical Scope
- **Affected Files**: [List specific files that need modification or creation]
- **Dependencies**: [Any libraries, APIs, or systems involved]
- **Architecture**: [Relevant patterns or system design considerations]

### 💡 Implementation Approach
[Suggested technical approach with specific steps. Be detailed - the implementer has no context.]

### ✅ Success Criteria
[Specific, testable criteria to verify the solution works correctly]
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Add more as needed]

### 🧪 Testing Requirements
[What tests to write/run, including specific test commands if known]

### ⚠️ Edge Cases & Constraints
[Known limitations, special cases, or gotchas to watch out for]

### 📝 Additional Context
[Any other information the implementer needs - assume they know NOTHING about this project]

IMPORTANT CHECKLIST before posting:
- Have you included ALL context needed for implementation?
- Are file paths and dependencies explicitly listed?
- Is the success criteria specific and testable?
- Would someone with NO prior knowledge understand what to build?

If you need clarification on requirements, ask questions IN THE GITHUB ISSUE COMMENT.
The user will respond in a new session.`;
    
  } else if (body.includes('///accept') && ['issues', 'issue_comment'].includes(event)) {
    const num = payload.issue.number;
    issueOrPrNumber = num;
    isIssue = true;
    action = 'accept';
    prompt = `You are implementing a solution for a GitHub issue.

First, use 'gh issue view ${num} -R ${repo} --comments' to read the issue and discussion.

Run quick tests to verify your assumptions where applicable/practical before and during implementation (e.g., test existing functionality, validate approaches, check dependencies).

Then implement the solution, create a new branch, commit your changes, and open a PR.
Use 'gh pr create' to create the PR and reference issue #${num} in the PR body.

IMPORTANT: If you need clarification, post questions to the issue using 'gh issue comment'.
The user will respond in a new session.`;
    
  } else if (event === 'pull_request_review' && body.includes('///')) {
    const num = payload.pull_request.number;
    issueOrPrNumber = num;
    isIssue = false;
    action = 'pr-review';
    prompt = `You are responding to PR review feedback.

CRITICAL: Review feedback often includes inline comments that are NOT visible with --comments flag.

1. First, use 'gh pr view ${num} -R ${repo} --comments' to see general PR comments
2. THEN use 'gh api repos/${repo}/pulls/${num}/reviews' to list all reviews
3. For each review with comments_count > 0, fetch inline comments:
   'gh api repos/${repo}/pulls/${num}/reviews/{review_id}/comments'
   
This ensures you see ALL feedback including inline code comments.

After reading all feedback:
- Checkout the PR branch with 'gh pr checkout ${num}'
- Run quick tests to verify your understanding of the feedback and validate your fixes (e.g., test that changes work as expected, verify edge cases)
- Address ALL requested changes from both general and inline comments
- Commit your changes and use 'git push' to push them

IMPORTANT: If you need clarification on the feedback, post a comment on the PR.
The reviewer will respond in a new session.`;
    
  } else {
    console.log('No recognized command found');
    return { action: 'none' };
  }
  
  // Check for duplicate processing within last 60 seconds
  const commandKey = `${repo}#${issueOrPrNumber}-${action}`;
  const now = Date.now();
  
  // Check if this exact command was processed recently
  for (const key of recentlyProcessed) {
    if (key.startsWith(commandKey)) {
      const timestamp = parseInt(key.split('-').pop());
      if (now - timestamp < 60000) { // 60 seconds
        console.log('Command recently processed, skipping duplicate');
        return { action: 'none' };
      }
    }
  }
  
  // Add to recently processed
  recentlyProcessed.add(`${commandKey}-${now}`);
  
  console.log(`Action: ${action}, Task ID: ${taskId}`);
  console.log(`Work directory: ${workDir}`);
  
  // Set up GitHub App auth if configured
  let claudeEnv = { 
    ...process.env,
    // Git config for commits
    GIT_AUTHOR_NAME: 'dwarf-in-the-flask[bot]',
    GIT_AUTHOR_EMAIL: 'dwarf-in-the-flask[bot]@users.noreply.github.com',
    GIT_COMMITTER_NAME: 'dwarf-in-the-flask[bot]',
    GIT_COMMITTER_EMAIL: 'dwarf-in-the-flask[bot]@users.noreply.github.com'
  };
  if (USE_GITHUB_APP && githubAppAuth) {
    try {
      const repoInfo = githubAppAuth.extractRepoInfo(payload);
      const appToken = await githubAppAuth.getInstallationToken(repoInfo.owner, repoInfo.repo);
      // gh CLI expects the token as GH_TOKEN or GITHUB_TOKEN
      claudeEnv.GH_TOKEN = appToken;
      console.log('Got GitHub App installation token for subprocess');
    } catch (err) {
      console.error('Failed to get installation token:', err.message);
      console.log('Subprocess will use existing gh auth');
    }
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
  
  // Set up git credential helper for all actions (they all may need to push)
  try {
    console.log('Setting up git credential helper...');
    execSync('git config --global credential.helper "!gh auth git-credential"', {
      stdio: 'pipe',
      encoding: 'utf8',
      env: claudeEnv
    });
    console.log('Git credential helper configured');
  } catch (err) {
    console.error('Failed to set up git credential helper:', err.message);
  }
  
  // Spawn Claude with detached process
  console.log('Spawning Claude with prompt:', prompt);
  
  try {
    // Whitelist tools: allow all gh commands, git commands, and common file operations
    const allowedTools = [
      'Bash(gh:*)',      // All gh CLI commands
      'Bash(git:*)',     // All git commands
      'mcp__mim__remember', // MCP remember tool
      'Read',            // Reading files
      'Write',           // Writing files  
      'Edit',            // Editing files
      'MultiEdit',       // Multiple edits
      'Grep',            // Searching
      'Glob',            // File patterns
      'TodoWrite',       // Task management
      'WebSearch',       // Web search for documentation
      'Task'             // Launch subtasks
    ].join(' ');
    
    const claudeProcess = spawn('claude', [
      '--output-format', 'json',
      '--allowedTools', allowedTools,
      '-p', prompt
    ], {
      cwd: workDir,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: claudeEnv
    });
    
    // Buffer to collect JSON output
    let outputBuffer = '';
    let errorBuffer = '';
    
    // Collect output for JSON parsing
    claudeProcess.stdout.on('data', (data) => {
      outputBuffer += data.toString();
      // Still log for debugging (though it will be JSON chunks)
      console.log(`Claude [${taskId}]:`, data.toString());
    });
    
    claudeProcess.stderr.on('data', (data) => {
      errorBuffer += data.toString();
      console.error(`Claude Error [${taskId}]:`, data.toString());
    });
    
    // Handle process completion
    claudeProcess.on('exit', async (code, signal) => {
      console.log(`Claude process [${taskId}] exited with code ${code}`);
      
      // Try to parse JSON output and extract session ID
      let sessionId = null;
      try {
        if (outputBuffer) {
          const jsonOutput = JSON.parse(outputBuffer);
          sessionId = jsonOutput.session_id || jsonOutput.sessionId || null;
          console.log(`Extracted session ID: ${sessionId}`);
        }
      } catch (err) {
        console.error('Failed to parse Claude JSON output:', err.message);
      }
      
      // Post completion comment if we have the necessary info
      if (issueOrPrNumber && repo) {
        await postCompletionComment(repo, issueOrPrNumber, isIssue, workDir, sessionId, taskId, claudeEnv);
      }
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

async function postCompletionComment(repo, number, isIssue, workDir, sessionId, taskId, env) {
  try {
    console.log(`Posting completion comment to ${isIssue ? 'issue' : 'PR'} #${number}`);
    
    // Build the comment body
    let commentBody = `🤖 Homunculus task completed!\n\n`;
    commentBody += `📂 **Workspace:** \`${workDir}\`\n`;
    
    if (sessionId) {
      commentBody += `🔖 **Session ID:** \`${sessionId}\`\n`;
      commentBody += `🔄 **Resume:** \`cd ${workDir} && claude --resume ${sessionId}\`\n`;
    } else {
      commentBody += `⚠️ _Session ID not available (JSON parsing may have failed)_\n`;
      commentBody += `📝 **Task ID:** \`${taskId}\`\n`;
    }
    
    // Write comment to temporary file to avoid escaping issues
    const tempFile = path.join(os.tmpdir(), `comment-${taskId}.md`);
    fs.writeFileSync(tempFile, commentBody);
    
    // Use gh CLI to post the comment with -F flag for file input
    const ghCommand = isIssue 
      ? `gh issue comment ${number} -R ${repo} -F ${tempFile}`
      : `gh pr comment ${number} -R ${repo} -F ${tempFile}`;
    
    execSync(ghCommand, {
      stdio: 'pipe',
      encoding: 'utf8',
      env: env
    });
    
    console.log('Completion comment posted successfully');
    
    // Clean up temporary file
    try {
      fs.unlinkSync(tempFile);
    } catch (cleanupErr) {
      console.log('Failed to clean up temp file:', cleanupErr.message);
    }
  } catch (err) {
    console.error('Failed to post completion comment:', err.message);
  }
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Homunculus webhook server listening on port ${PORT}`);
  console.log(`Workspace directory: ${WORKSPACE_DIR}`);
  if (!WEBHOOK_SECRET) {
    console.warn('WARNING: Running without webhook signature verification (GITHUB_WEBHOOK_SECRET not set)');
  }
});
