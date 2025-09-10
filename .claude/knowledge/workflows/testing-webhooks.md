# Testing Webhook Server Workflow

## Local Testing

### 1. Start the Server
```bash
# Foreground mode
node server.js

# Background mode with logging
nohup node server.js > server.log 2>&1 &
```

### 2. Test with Local Script
```bash
node test-webhook.js
```

## External Webhook Testing

### Using Smee.io
For testing with actual GitHub webhooks:
```bash
npx smee -u https://smee.io/new -t http://localhost:8080/webhook
```

## Configuration Requirements
- Server validates signatures when `GITHUB_WEBHOOK_SECRET` is set in `.env` file
- Ensure `.env` file exists with proper secret configuration

## Related Files
- `server.js` - Main webhook server
- `test-webhook.js` - Local testing script
- `.env.example` - Configuration template