#!/usr/bin/env node
const http = require('http');
const crypto = require('crypto');

// Test payload for ///review command
const testPayload = {
  action: 'created',
  issue: {
    number: 1,
    title: 'Test Issue for Session Capture',
    body: 'This is a test issue body',
    user: { login: 'testuser' }
  },
  comment: {
    body: 'Testing session capture feature ///review'
  },
  repository: {
    full_name: 'test-org/test-repo'
  }
};

const secret = process.env.GITHUB_WEBHOOK_SECRET || 'test-secret';
const payloadString = JSON.stringify(testPayload);

// Generate signature
const signature = 'sha256=' + crypto
  .createHmac('sha256', secret)
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
    'X-GitHub-Event': 'issue_comment',
    'X-GitHub-Delivery': crypto.randomUUID()
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    console.log('\nTest webhook sent successfully!');
    console.log('Check server logs for session capture and completion comment.');
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(payloadString);
req.end();