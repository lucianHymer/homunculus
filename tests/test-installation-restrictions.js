#!/usr/bin/env node
const axios = require('axios');
const crypto = require('crypto');

// Test configuration
const SERVER_URL = 'http://localhost:8080/webhook';
const SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'test-secret';

// Helper function to create webhook signature
function createSignature(payload, secret) {
  const signature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return `sha256=${signature}`;
}

// Helper function to send webhook
async function sendWebhook(payload, headers) {
  try {
    const response = await axios.post(SERVER_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Event': headers.event || 'issues',
        'X-GitHub-Delivery': headers.delivery || crypto.randomUUID(),
        'X-Hub-Signature-256': createSignature(payload, SECRET),
        ...headers
      },
      validateStatus: () => true // Don't throw on any status code
    });
    return response;
  } catch (error) {
    console.error('Request failed:', error.message);
    throw error;
  }
}

// Test cases
async function runTests() {
  console.log('🧪 Testing Installation Restrictions\n');
  console.log('Make sure server.js is running with ALLOWED_INSTALLATIONS configured.\n');
  
  // Test 1: Valid installation ID in allowlist
  console.log('Test 1: Valid installation ID (should be accepted if in allowlist)');
  const validPayload = {
    action: 'opened',
    installation: {
      id: 123456  // Update this to match your ALLOWED_INSTALLATIONS
    },
    issue: {
      number: 1,
      title: 'Test issue',
      body: '///review - Test with valid installation',
      user: { login: 'testuser' }
    },
    repository: {
      full_name: 'test/repo',
      owner: { login: 'test' },
      name: 'repo'
    }
  };
  
  const response1 = await sendWebhook(validPayload, { event: 'issues' });
  console.log(`  Status: ${response1.status}`);
  console.log(`  Response: ${response1.data}`);
  console.log(`  Expected: 202 (if in allowlist) or 403 (if not)\n`);
  
  // Test 2: Invalid installation ID not in allowlist
  console.log('Test 2: Invalid installation ID (should be rejected if allowlist is set)');
  const invalidPayload = {
    ...validPayload,
    installation: {
      id: 999999  // This should not be in the allowlist
    },
    issue: {
      ...validPayload.issue,
      body: '///review - Test with invalid installation'
    }
  };
  
  const response2 = await sendWebhook(invalidPayload, { event: 'issues' });
  console.log(`  Status: ${response2.status}`);
  console.log(`  Response: ${response2.data}`);
  console.log(`  Expected: 403 (if allowlist is configured)\n`);
  
  // Test 3: Missing installation field (non-GitHub App webhook)
  console.log('Test 3: Missing installation field (PAT webhook)');
  const noInstallationPayload = {
    action: 'opened',
    // No installation field - simulates PAT webhook
    issue: {
      number: 1,
      title: 'Test issue',
      body: '///review - Test without installation',
      user: { login: 'testuser' }
    },
    repository: {
      full_name: 'test/repo',
      owner: { login: 'test' },
      name: 'repo'
    }
  };
  
  const response3 = await sendWebhook(noInstallationPayload, { event: 'issues' });
  console.log(`  Status: ${response3.status}`);
  console.log(`  Response: ${response3.data}`);
  console.log(`  Expected: 403 (if allowlist is configured) or 202 (if not configured)\n`);
  
  // Test 4: Different event type with valid installation
  console.log('Test 4: Issue comment with valid installation');
  const commentPayload = {
    action: 'created',
    installation: {
      id: 123456  // Update this to match your ALLOWED_INSTALLATIONS
    },
    comment: {
      body: '///accept - Test comment with valid installation',
      user: { login: 'testuser' }
    },
    issue: {
      number: 1,
      title: 'Test issue',
      user: { login: 'testuser' }
    },
    repository: {
      full_name: 'test/repo',
      owner: { login: 'test' },
      name: 'repo'
    }
  };
  
  const response4 = await sendWebhook(commentPayload, { event: 'issue_comment' });
  console.log(`  Status: ${response4.status}`);
  console.log(`  Response: ${response4.data}`);
  console.log(`  Expected: 202 (if in allowlist) or 403 (if not)\n`);
  
  console.log('✅ Test suite completed!\n');
  console.log('Note: To test with actual installation IDs:');
  console.log('1. Update ALLOWED_INSTALLATIONS in server.js with real installation IDs');
  console.log('2. Update the test payloads above with matching IDs');
  console.log('3. Restart the server and run this test again\n');
}

// Run tests
runTests().catch(console.error);