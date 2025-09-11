#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const testFiles = {
  webhook: 'test-webhook.js',
  claude: 'test-claude-subprocess.js',
  github: 'test-github-app.js',
  'github-token': 'test-gh-with-app-token.js',
  phase2: 'test-phase2.js',
  phase3: 'test-phase3.js'
};

const testName = process.argv[2];
const testsDir = __dirname;

function runTest(file) {
  return new Promise((resolve, reject) => {
    const testPath = path.join(testsDir, file);
    
    if (!fs.existsSync(testPath)) {
      console.error(`❌ Test file not found: ${file}`);
      return reject(new Error(`Test file not found: ${file}`));
    }

    console.log(`\n🧪 Running ${file}...`);
    console.log('─'.repeat(50));
    
    const test = spawn('node', [testPath], {
      stdio: 'inherit'
    });

    test.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${file} passed\n`);
        resolve();
      } else {
        console.error(`❌ ${file} failed with code ${code}\n`);
        reject(new Error(`Test failed with code ${code}`));
      }
    });

    test.on('error', (err) => {
      console.error(`❌ Error running ${file}:`, err);
      reject(err);
    });
  });
}

async function runAllTests() {
  console.log('🚀 Running all tests...\n');
  const results = { passed: [], failed: [] };

  for (const [name, file] of Object.entries(testFiles)) {
    try {
      await runTest(file);
      results.passed.push(file);
    } catch (err) {
      results.failed.push(file);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results:');
  console.log(`✅ Passed: ${results.passed.length}/${Object.keys(testFiles).length}`);
  
  if (results.failed.length > 0) {
    console.log(`❌ Failed: ${results.failed.join(', ')}`);
    process.exit(1);
  } else {
    console.log('🎉 All tests passed!');
  }
}

async function main() {
  if (!testName) {
    await runAllTests();
  } else if (testName === 'help' || testName === '--help') {
    console.log('Usage: npm test [test-name]');
    console.log('\nAvailable tests:');
    Object.keys(testFiles).forEach(name => {
      console.log(`  - ${name}`);
    });
    console.log('\nRun all tests: npm test');
  } else if (testFiles[testName]) {
    try {
      await runTest(testFiles[testName]);
    } catch (err) {
      process.exit(1);
    }
  } else {
    console.error(`❌ Unknown test: ${testName}`);
    console.log('\nAvailable tests:');
    Object.keys(testFiles).forEach(name => {
      console.log(`  - ${name}`);
    });
    process.exit(1);
  }
}

main().catch(console.error);