const { spawn } = require("child_process");

// Test spawning a subprocess with GH_TOKEN
const testEnv = {
  ...process.env,
  GH_TOKEN: "test-token-12345"
};

const child = spawn("sh", ["-c", "echo GH_TOKEN is: $GH_TOKEN"], {
  env: testEnv,
  stdio: "inherit"
});

child.on("close", (code) => {
  console.log(`Process exited with code ${code}`);
});
