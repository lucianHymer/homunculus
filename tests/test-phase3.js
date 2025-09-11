#!/usr/bin/env node
const http = require('http');
const crypto = require('crypto');

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'test-secret';

function createSignature(payload) {
  return 'sha256=' + crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
}

function sendWebhook(eventType, payload) {
  const body = JSON.stringify(payload);
  const signature = createSignature(body);
  
  const options = {
    hostname: 'localhost',
    port: 8080,
    path: '/webhook',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': body.length,
      'X-Hub-Signature-256': signature,
      'X-GitHub-Event': eventType,
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
    });
  });

  req.on('error', (error) => {
    console.error('Error:', error);
  });

  req.write(body);
  req.end();
}

// Test scenarios
const testScenario = process.argv[2] || 'review';

switch (testScenario) {
  case 'review':
    console.log('Testing [review] command...');
    sendWebhook('issues', {
      action: 'opened',
      issue: {
        number: 42,
        title: 'Add a hello world function',
        body: 'Please add a simple hello world function to our codebase. ///review'
      },
      repository: {
        full_name: 'test-org/test-repo'
      }
    });
    break;
    
  case 'accept':
    console.log('Testing [accept] command...');
    sendWebhook('issue_comment', {
      action: 'created',
      issue: {
        number: 42,
        title: 'Add a hello world function'
      },
      comment: {
        body: 'Looks good, let\'s implement this. @homunculus [accept]'
      },
      repository: {
        full_name: 'test-org/test-repo'
      }
    });
    break;
    
  case 'pr-review':
    console.log('Testing PR review response...');
    sendWebhook('pull_request_review', {
      action: 'submitted',
      pull_request: {
        number: 99,
        title: 'Fix: Add hello world function'
      },
      review: {
        body: '@homunculus Please add error handling to the function and update the tests.'
      },
      repository: {
        full_name: 'test-org/test-repo'
      }
    });
    break;
    
  default:
    console.log('Usage: node test-phase3.js [review|accept|pr-review]');
}