# Homunculus


<p align="center">
    An artificial being, confined to a container, here to
    solve all your problems......this is gonna be great!
    <br><br>
    <img src="https://raw.githubusercontent.com/lucianHymer/homunculus/refs/heads/main/assets/homuncul.png" width="320px" alt="Homunculus">
</p>

This application interacts with github to automate issue and PR resolution.

---

## 🤖 What is Homunculus?

Homunculus is a GitHub webhook server that bridges GitHub events to Claude Code CLI,
enabling automated code review, issue resolution, and pull request management. When
mentioned in GitHub issues or PRs with `///`, it spawns a Claude instance to analyze,
implement, or review code changes.

## 🚀 Features

- **Automated Issue Review**: Use `///review` in an issue to get Claude's analysis
- **Solution Implementation**: Use `///accept` to have Claude implement a solution and PR
- **PR Review Responses**: Use `///` in PR reviews to have Claude address feedback
- **Secure Webhook Handling**: HMAC signature validation for GitHub webhooks
- **GitHub App Authentication**: Supports both PAT and GitHub App authentication
- **Isolated Task Execution**: Each task runs in its own workspace directory

## 📋 Prerequisites

- Node.js 18+ 
- Claude Code CLI installed and configured
- GitHub Personal Access Token or GitHub App credentials
- A server accessible from GitHub (or use ngrok/smee.io for development)

## 🔧 Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/homunculus.git
cd homunculus
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Required
GITHUB_WEBHOOK_SECRET=your-webhook-secret
GITHUB_TOKEN=your-github-pat-or-leave-empty-for-app-auth

# For GitHub App Auth (optional, instead of PAT)
GITHUB_APP_ID=your-app-id
GITHUB_APP_PRIVATE_KEY_PATH=path/to/private-key.pem
GITHUB_APP_INSTALLATION_ID=your-installation-id

# Optional
PORT=8080
WORKSPACE_DIR=/workspace
```

## 🏃 Running the Server

### Production Mode
```bash
npm start
```

### Development Mode (with nodemon)
```bash
npm run dev
```

### Background Mode
```bash
nohup node server.js > server.log 2>&1 &
```

## 🧪 Testing

Run all tests:
```bash
npm test
```

Run specific test suites:
```bash
# Test webhook handling
npm run test:webhook

# Test Claude subprocess spawning
npm run test:claude

# Test GitHub authentication
npm run test:github
```

## 🔗 Webhook Setup

### Local Development with Smee.io

1. Create a Smee channel at https://smee.io/new
2. Forward webhooks to your local server:
```bash
npx smee -u https://smee.io/YOUR_CHANNEL_ID -t http://localhost:8080/webhook
```

### GitHub Webhook Configuration

1. Go to your repository settings → Webhooks
2. Add webhook:
   - **Payload URL**: `https://your-server.com/webhook` (or Smee URL for dev)
   - **Content type**: `application/json`
   - **Secret**: Your `GITHUB_WEBHOOK_SECRET`
   - **Events**: Select "Issues", "Issue comments", and "Pull request reviews"

## 📝 Usage Examples

### Review an Issue
Create an issue with:
```
///review

The application crashes when processing large files...
```

### Implement a Solution
Comment on an issue:
```
///accept
```

### Address PR Feedback
In a PR review comment:
```
/// please update the error handling here
```

## 🏗️ Architecture

Homunculus follows a simple webhook → Claude bridge architecture:

1. **Webhook Reception**: Express server receives and validates GitHub webhooks
2. **Event Processing**: Checks for /// mentions and parses commands
3. **Task Spawning**: Creates isolated workspace and spawns Claude Code CLI
4. **Claude Execution**: Claude analyzes the context and performs requested actions
5. **GitHub Integration**: Claude uses `gh` CLI to interact with GitHub

## 🔒 Security Considerations

- Always use HTTPS in production
- Keep your webhook secret secure
- Validate all webhook signatures
- Use GitHub App auth for fine-grained permissions
- Never commit `.env` or private keys
- Consider rate limiting for production deployments

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details
