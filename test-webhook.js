#!/usr/bin/env node

const http = require('http');
const crypto = require('crypto');

// Test webhook secret (same as in .env if you set one)
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'test-secret-123';

// Sample GitHub issue comment webhook payload
const payload = {
  action: 'created',
  issue: {
    number: 42,
    title: 'Test issue for homunculus',
    body: 'This is a test issue',
    user: {
      login: 'testuser'
    }
  },
  comment: {
    body: 'Hey @homunculus [review] - can you take a look at this?',
    user: {
      login: 'testuser'
    }
  },
  repository: {
    full_name: 'testorg/testrepo',
    name: 'testrepo',
    owner: {
      login: 'testorg'
    }
  }
};

const payloadString = JSON.stringify(payload);

// Calculate signature
const signature = 'sha256=' + crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(payloadString)
  .digest('hex');

// Send to local server
const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payloadString),
    'X-GitHub-Event': 'issue_comment',
    'X-GitHub-Delivery': crypto.randomUUID(),
    'X-Hub-Signature-256': signature
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
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(payloadString);
req.end();

console.log('Sent test webhook with @homunculus mention');
console.log('Signature:', signature);