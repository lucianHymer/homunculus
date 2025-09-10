#!/usr/bin/env node
require('dotenv').config();
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.raw({ type: 'application/json' }));

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;
const PORT = process.env.PORT || 8080;

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
  
  const body = payload.comment?.body || 
               payload.issue?.body || 
               payload.review?.body || '';
  
  console.log(`Checking for @homunculus mention in: "${body.substring(0, 100)}..."`);
  
  if (!body.includes('@homunculus')) {
    console.log('No @homunculus mention found');
    return res.status(200).send('Not mentioned');
  }
  
  console.log('Found @homunculus mention!');
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
  
  return res.status(200).send('Webhook received and logged');
});

app.get('/health', (req, res) => {
  res.status(200).send('Homunculus webhook server is running');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Homunculus webhook server listening on port ${PORT}`);
  if (!WEBHOOK_SECRET) {
    console.warn('WARNING: Running without webhook signature verification (GITHUB_WEBHOOK_SECRET not set)');
  }
});