#!/usr/bin/env node
require('dotenv').config();
const GitHubAppAuth = require('../src/github-app-auth');
const { execSync, spawn } = require('child_process');

async function testGhWithAppToken() {
  const appId = process.env.GITHUB_APP_ID;
  const privateKeyPath = process.env.GITHUB_APP_PRIVATE_KEY_PATH;
  
  if (!appId || !privateKeyPath) {
    console.error('Please set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY_PATH in .env');
    process.exit(1);
  }
  
  console.log('Testing gh CLI with GitHub App token...\n');
  
  try {
    const auth = new GitHubAppAuth(appId, privateKeyPath);
    console.log('✓ GitHub App auth initialized');
    
    // Get token for lucianHymer/mim repo
    const owner = 'lucianHymer';
    const repo = 'mim';
    console.log(`Getting installation token for ${owner}/${repo}...`);
    
    const token = await auth.getInstallationToken(owner, repo);
    console.log('✓ Got installation token\n');
    
    // Test 1: Direct gh command with token
    console.log('Test 1: Direct gh command with GH_TOKEN...');
    try {
      const result = execSync('gh issue view 1 -R lucianHymer/mim', {
        env: { ...process.env, GH_TOKEN: token },
        encoding: 'utf8'
      });
      console.log('✓ Successfully accessed issue #1');
      console.log('Issue content (first 200 chars):', result.substring(0, 200) + '...\n');
    } catch (err) {
      console.error('✗ Failed to access issue:', err.message);
    }
    
    // Test 2: Subprocess with token (like Claude would be spawned)
    console.log('Test 2: Subprocess with GH_TOKEN (simulating Claude)...');
    const child = spawn('sh', ['-c', 'gh issue view 1 -R lucianHymer/mim --comments | head -20'], {
      env: { ...process.env, GH_TOKEN: token },
      stdio: 'pipe'
    });
    
    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      console.error('Subprocess error:', data.toString());
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log('✓ Subprocess successfully accessed issue');
        console.log('Output:', output.substring(0, 300) + '...\n');
      } else {
        console.log('✗ Subprocess failed with code:', code);
      }
      
      // Test 3: Test auth status with the token
      console.log('Test 3: Check gh auth status with token...');
      try {
        const authStatus = execSync('gh auth status', {
          env: { ...process.env, GH_TOKEN: token },
          encoding: 'utf8'
        });
        console.log('Auth status:\n', authStatus);
      } catch (err) {
        console.error('Auth status error:', err.message);
      }
    });
    
  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response?.data) {
      console.error('GitHub API response:', error.response.data);
    }
    process.exit(1);
  }
}

testGhWithAppToken();