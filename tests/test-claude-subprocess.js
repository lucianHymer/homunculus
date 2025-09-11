#!/usr/bin/env node
require('dotenv').config();
const GitHubAppAuth = require('../github-app-auth');
const { spawn } = require('child_process');
const path = require('path');

async function testClaudeSubprocess() {
  const appId = process.env.GITHUB_APP_ID;
  const privateKeyPath = process.env.GITHUB_APP_PRIVATE_KEY_PATH;
  
  if (!appId || !privateKeyPath) {
    console.error('Please set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY_PATH in .env');
    process.exit(1);
  }
  
  console.log('Testing Claude subprocess with GitHub App token...\n');
  
  try {
    const auth = new GitHubAppAuth(appId, privateKeyPath);
    const token = await auth.getInstallationToken('lucianHymer', 'mim');
    console.log('✓ Got GitHub App installation token\n');
    
    // Create a test prompt that uses gh
    const prompt = `You are testing GitHub authentication.

Run this command and show the output:
gh issue view 1 -R lucianHymer/mim

If it works, say "AUTH SUCCESS: I can see issue #1"
If it fails, say "AUTH FAILED" and explain the error.`;
    
    console.log('Spawning Claude with test prompt...');
    console.log('Working directory: /tmp/test-claude-auth');
    
    // Create test directory
    const testDir = '/tmp/test-claude-auth';
    require('fs').mkdirSync(testDir, { recursive: true });
    
    // Spawn Claude exactly like server.js does
    const claudeEnv = { ...process.env, GH_TOKEN: token };
    
    // Whitelist tools - same as server.js
    const allowedTools = [
      'Bash(gh:*)',
      'Bash(git:*)',
      'Read',
      'Write',
      'Edit',
      'MultiEdit',
      'Grep',
      'Glob',
      'TodoWrite'
    ].join(' ');
    
    const claudeProcess = spawn('claude', [
      '--allowed-tools', allowedTools,
      '-p', prompt
    ], {
      cwd: testDir,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: claudeEnv
    });
    
    console.log(`Claude spawned with PID: ${claudeProcess.pid}`);
    console.log('Waiting for output...\n');
    
    // Capture output
    claudeProcess.stdout.on('data', (data) => {
      console.log('Claude output:', data.toString());
    });
    
    claudeProcess.stderr.on('data', (data) => {
      console.error('Claude error:', data.toString());
    });
    
    // Don't detach for testing - wait for completion
    claudeProcess.on('close', (code) => {
      console.log(`\nClaude process exited with code: ${code}`);
    });
    
  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

testClaudeSubprocess();