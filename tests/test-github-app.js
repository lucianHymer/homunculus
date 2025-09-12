#!/usr/bin/env node
require('dotenv').config();
const GitHubAppAuth = require('../src/github-app-auth');

// Test the GitHub App authentication
async function testGitHubApp() {
  const appId = process.env.GITHUB_APP_ID;
  const privateKeyPath = process.env.GITHUB_APP_PRIVATE_KEY_PATH;
  
  if (!appId || !privateKeyPath) {
    console.error('Please set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY_PATH in .env');
    process.exit(1);
  }
  
  console.log('Testing GitHub App authentication...');
  console.log(`App ID: ${appId}`);
  console.log(`Private key path: ${privateKeyPath}`);
  
  try {
    const auth = new GitHubAppAuth(appId, privateKeyPath);
    console.log('✓ GitHub App auth initialized');
    
    // Test JWT generation
    const jwt = auth.generateJWT();
    console.log('✓ JWT generated successfully');
    console.log(`JWT (first 50 chars): ${jwt.substring(0, 50)}...`);
    
    // Test with a sample repository (replace with your repo)
    const testRepo = process.argv[2];
    if (testRepo) {
      const [owner, repo] = testRepo.split('/');
      console.log(`\nTesting installation token for ${owner}/${repo}...`);
      
      const token = await auth.getInstallationToken(owner, repo);
      console.log('✓ Installation token obtained!');
      console.log(`Token (first 20 chars): ${token.substring(0, 20)}...`);
      
      // Test caching
      console.log('\nTesting token cache...');
      const token2 = await auth.getInstallationToken(owner, repo);
      console.log('✓ Cached token retrieved');
      console.log(`Tokens match: ${token === token2}`);
    } else {
      console.log('\nTo test installation token, run with: node test-github-app.js owner/repo');
    }
    
    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('GitHub API response:', error.response.data);
    }
    process.exit(1);
  }
}

testGitHubApp();