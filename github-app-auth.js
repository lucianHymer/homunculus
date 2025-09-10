const jwt = require('jsonwebtoken');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class GitHubAppAuth {
  constructor(appId, privateKeyPath) {
    this.appId = appId;
    this.privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    this.tokenCache = new Map();
  }

  // Generate JWT for GitHub App authentication
  generateJWT() {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now - 60,  // Issued 60 seconds ago to account for clock drift
      exp: now + 600, // Expires in 10 minutes (max allowed)
      iss: this.appId
    };

    return jwt.sign(payload, this.privateKey, { algorithm: 'RS256' });
  }

  // Get installation token for a specific repository
  async getInstallationToken(owner, repo) {
    const cacheKey = `${owner}/${repo}`;
    const cached = this.tokenCache.get(cacheKey);
    
    // Check if we have a valid cached token (with 5 min buffer)
    if (cached && cached.expiresAt > Date.now() + 300000) {
      console.log(`Using cached token for ${cacheKey}`);
      return cached.token;
    }

    try {
      // First, get the installation ID for this repo
      const appJWT = this.generateJWT();
      const installationResponse = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/installation`,
        {
          headers: {
            Authorization: `Bearer ${appJWT}`,
            Accept: 'application/vnd.github.v3+json'
          }
        }
      );

      const installationId = installationResponse.data.id;
      console.log(`Found installation ID: ${installationId} for ${cacheKey}`);

      // Now get an installation access token
      const tokenResponse = await axios.post(
        `https://api.github.com/app/installations/${installationId}/access_tokens`,
        {
          repositories: [repo]
        },
        {
          headers: {
            Authorization: `Bearer ${appJWT}`,
            Accept: 'application/vnd.github.v3+json'
          }
        }
      );

      const token = tokenResponse.data.token;
      const expiresAt = new Date(tokenResponse.data.expires_at).getTime();
      
      // Cache the token
      this.tokenCache.set(cacheKey, { token, expiresAt });
      console.log(`Got new token for ${cacheKey}, expires at ${new Date(expiresAt).toISOString()}`);
      
      return token;
    } catch (error) {
      console.error('Error getting installation token:', error.response?.data || error.message);
      throw error;
    }
  }

  // Extract owner and repo from various webhook payload formats
  extractRepoInfo(payload) {
    // Handle different webhook event types
    const repository = payload.repository || 
                      payload.pull_request?.base?.repo ||
                      payload.issue?.repository;
    
    if (!repository) {
      throw new Error('Could not find repository information in payload');
    }

    return {
      owner: repository.owner.login,
      repo: repository.name
    };
  }
}

module.exports = GitHubAppAuth;