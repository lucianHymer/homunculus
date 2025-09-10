### [20:10] [architecture] Current Phase 1 webhook server implementation
**Details**: The Phase 1 server is currently a basic Express webhook receiver that:
1. Uses dotenv for configuration
2. Validates GitHub webhook signatures using HMAC SHA-256
3. Checks for @homunculus mentions in issue/PR/review bodies
4. Logs events but doesn't take action yet
5. Has PORT and GITHUB_WEBHOOK_SECRET env vars
6. Currently just returns status codes, doesn't spawn any processes
**Files**: server.js
---

### [20:16] [workflow] Phase 2 implementation complete
**Details**: Successfully implemented Phase 2 with:
1. Claude spawning with detached processes using spawn() 
2. WORKSPACE_DIR environment variable support (defaults to /workspace)
3. Repository cloning with gh CLI (falls back to creating directory if repo doesn't exist)
4. Task ID generation for unique work directories
5. Process detachment with unref() so server can respond immediately
6. Claude executes in cloned repo directory (cwd parameter)
7. Logging of Claude output for debugging
8. Successfully tested with all three command types: [review], [accept], and PR review
**Files**: server.js, test-phase2.js
---

