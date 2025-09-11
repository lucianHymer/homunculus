#!/usr/bin/env node
/**
 * Test script for bot filtering and action filtering
 * Tests the fixes for issue #4
 */

const axios = require('axios');
const crypto = require('crypto');

const WEBHOOK_URL = 'http://localhost:8080/webhook';
const SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'test-secret';

async function sendWebhook(event, payload) {
  const body = JSON.stringify(payload);
  const signature = 'sha256=' + crypto
    .createHmac('sha256', SECRET)
    .update(body)
    .digest('hex');
  
  try {
    const response = await axios.post(WEBHOOK_URL, body, {
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Event': event,
        'X-Hub-Signature-256': signature,
        'X-GitHub-Delivery': crypto.randomBytes(16).toString('hex')
      }
    });
    
    return { status: response.status, text: response.data };
  } catch (error) {
    if (error.response) {
      return { status: error.response.status, text: error.response.data };
    }
    throw error;
  }
}

async function runTests() {
  console.log('🧪 Testing bot filtering and action filtering...\n');
  
  // Test 1: Should ignore closed issues
  console.log('Test 1: Closed issue with /// command');
  const closedIssue = {
    action: 'closed',
    issue: {
      number: 1,
      title: 'Test issue',
      body: '///review this issue',
      user: { login: 'testuser' }
    },
    repository: {
      full_name: 'test/repo'
    }
  };
  
  const result1 = await sendWebhook('issues', closedIssue);
  console.log(`Response: ${result1.status} - ${result1.text}`);
  console.log(`✅ Expected: Should ignore (action not processed)\n`);
  
  // Test 2: Should process opened issues
  console.log('Test 2: Opened issue with /// command');
  const openedIssue = {
    action: 'opened',
    issue: {
      number: 2,
      title: 'Test issue',
      body: '///review this issue',
      user: { login: 'testuser' }
    },
    repository: {
      full_name: 'test/repo'
    }
  };
  
  const result2 = await sendWebhook('issues', openedIssue);
  console.log(`Response: ${result2.status} - ${result2.text}`);
  console.log(`✅ Expected: Should process (Command triggered)\n`);
  
  // Test 3: Should ignore bot's own comments
  console.log('Test 3: Bot\'s own comment with /// command');
  const botComment = {
    action: 'created',
    comment: {
      body: '///review completed',
      user: { login: 'dwarf-in-the-flask[bot]' }
    },
    issue: {
      number: 3,
      title: 'Test issue'
    },
    repository: {
      full_name: 'test/repo'
    }
  };
  
  const result3 = await sendWebhook('issue_comment', botComment);
  console.log(`Response: ${result3.status} - ${result3.text}`);
  console.log(`✅ Expected: Should ignore (Bot comment ignored)\n`);
  
  // Test 4: Should ignore deleted comments
  console.log('Test 4: Deleted comment with /// command');
  const deletedComment = {
    action: 'deleted',
    comment: {
      body: '///accept',
      user: { login: 'testuser' }
    },
    issue: {
      number: 4,
      title: 'Test issue'
    },
    repository: {
      full_name: 'test/repo'
    }
  };
  
  const result4 = await sendWebhook('issue_comment', deletedComment);
  console.log(`Response: ${result4.status} - ${result4.text}`);
  console.log(`✅ Expected: Should ignore (action not processed)\n`);
  
  // Test 5: Duplicate prevention
  console.log('Test 5: Duplicate command within 60 seconds');
  const duplicateIssue = {
    action: 'edited',
    issue: {
      number: 5,
      title: 'Test issue',
      body: '///review duplicate test',
      user: { login: 'testuser' }
    },
    repository: {
      full_name: 'test/repo'
    }
  };
  
  const result5a = await sendWebhook('issues', duplicateIssue);
  console.log(`First request: ${result5a.status} - ${result5a.text}`);
  
  // Send same command immediately
  const result5b = await sendWebhook('issues', duplicateIssue);
  console.log(`Second request: ${result5b.status} - ${result5b.text}`);
  console.log(`✅ Expected: First should process, second should be ignored\n`);
  
  console.log('✅ All tests completed!');
}

// Run tests
runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});