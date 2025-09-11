#!/usr/bin/env node
const http = require('http');
const crypto = require('crypto');

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'test-secret-123';

function makeWebhookRequest(payload, event = 'issues') {
  const payloadString = JSON.stringify(payload);
  const signature = 'sha256=' + crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payloadString)
    .digest('hex');
  
  const options = {
    hostname: 'localhost',
    port: 8080,
    path: '/webhook',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payloadString),
      'X-Hub-Signature-256': signature,
      'X-GitHub-Event': event,
      'X-GitHub-Delivery': crypto.randomBytes(16).toString('hex')
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`Response (${res.statusCode}): ${data}`);
        resolve({ status: res.statusCode, data });
      });
    });
    
    req.on('error', reject);
    req.write(payloadString);
    req.end();
  });
}

async function runTests() {
  console.log('Phase 2 Testing - Claude Spawning\n');
  console.log('=================================\n');
  
  // Test 1: Review command
  console.log('Test 1: Issue with [review] command');
  await makeWebhookRequest({
    action: 'opened',
    issue: {
      number: 123,
      title: 'Test Issue',
      body: 'Please review this @homunculus [review]'
    },
    repository: {
      full_name: 'test-org/test-repo'
    }
  }, 'issues');
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 2: Accept command
  console.log('\nTest 2: Issue with [accept] command');
  await makeWebhookRequest({
    action: 'created',
    issue: {
      number: 456,
      title: 'Feature Request',
      body: 'Original issue body'
    },
    comment: {
      body: 'Looks good, @homunculus [accept]'
    },
    repository: {
      full_name: 'test-org/test-repo'
    }
  }, 'issue_comment');
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 3: PR review
  console.log('\nTest 3: PR review mention');
  await makeWebhookRequest({
    action: 'submitted',
    pull_request: {
      number: 789,
      title: 'Fix bug'
    },
    review: {
      body: '@homunculus please address these changes'
    },
    repository: {
      full_name: 'test-org/test-repo'
    }
  }, 'pull_request_review');
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 4: No mention (should be ignored)
  console.log('\nTest 4: Issue without @homunculus mention');
  await makeWebhookRequest({
    action: 'opened',
    issue: {
      number: 999,
      title: 'Regular Issue',
      body: 'This is just a regular issue'
    },
    repository: {
      full_name: 'test-org/test-repo'
    }
  }, 'issues');
  
  console.log('\n=================================');
  console.log('Phase 2 tests completed!');
  console.log('Check server logs for Claude spawning details');
}

runTests().catch(console.error);