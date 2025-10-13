#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const config = {
  browsers: ['chrome', 'firefox', 'edge', 'safari'],
  testSuites: {
    critical: 'tests/critical/*.test.js',
    smoke: 'tests/smoke/*.test.js',
    functional: 'tests/functional/*.test.js',
    mobile: 'tests/mobile/*.test.js',
    'cross-browser': 'tests/cross-browser/*.test.js',
    performance: 'tests/performance/*.test.js',
    accessibility: 'tests/accessibility/*.test.js',
    responsive: 'tests/responsive/*.test.js'
  },
  defaultTimeout: 60000,
  parallel: false
};

// Parse command line arguments
const args = process.argv.slice(2);
let testSuite = 'critical';
let browser = 'chrome';
let headless = false;
let parallel = false;
let url = 'https://www.voxpopulist.com';
let verbose = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case '--suite':
      testSuite = args[++i];
      break;
    case '--browser':
      browser = args[++i];
      break;
    case '--headless':
      headless = true;
      break;
    case '--parallel':
      parallel = true;
      break;
    case '--url':
      url = args[++i];
      break;
    case '--verbose':
      verbose = true;
      break;
    case '--help':
      showHelp();
      process.exit(0);
    default:
      if (arg.startsWith('--')) {
        console.error(`Unknown option: ${arg}`);
        process.exit(1);
      }
  }
}

function showHelp() {
  console.log(`
Faux News E2E Test Runner

Usage: node run-tests.js [options]

Options:
  --suite <name>     Test suite to run (${Object.keys(config.testSuites).join(', ')})
  --browser <name>   Browser to use (${config.browsers.join(', ')})
  --headless         Run in headless mode
  --parallel         Run tests in parallel
  --url <url>        Base URL to test (default: ${url})
  --verbose          Verbose output
  --help             Show this help

Examples:
  node run-tests.js --suite smoke --browser chrome --headless
  node run-tests.js --suite functional --url http://localhost:4321
  node run-tests.js --suite cross-browser --parallel
  `);
}

function runTests(suite, browserName, options = {}) {
  return new Promise((resolve, reject) => {
    const testPattern = config.testSuites[suite];
    if (!testPattern) {
      reject(new Error(`Unknown test suite: ${suite}`));
      return;
    }

    const mochaArgs = [
      testPattern,
      '--timeout', options.timeout || config.defaultTimeout,
      '--reporter', 'spec'
    ];

    if (options.parallel) {
      mochaArgs.push('--parallel');
    }

    if (options.verbose) {
      mochaArgs.push('--verbose');
    }

    const env = {
      ...process.env,
      BROWSER: browserName,
      TEST_URL: options.url,
      HEADLESS: options.headless ? 'true' : 'false'
    };

    console.log(`\n🚀 Running ${suite} tests in ${browserName}${options.headless ? ' (headless)' : ''}...`);
    console.log(`📍 Testing URL: ${options.url}`);
    
    const mocha = spawn('npx', ['mocha', ...mochaArgs], {
      env,
      stdio: 'inherit',
      cwd: __dirname
    });

    mocha.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${suite} tests passed in ${browserName}`);
        resolve();
      } else {
        console.log(`❌ ${suite} tests failed in ${browserName} (exit code: ${code})`);
        reject(new Error(`Tests failed with exit code ${code}`));
      }
    });

    mocha.on('error', (error) => {
      console.error(`❌ Failed to start tests: ${error.message}`);
      reject(error);
    });
  });
}

async function runCrossBrowserTests(suite, options = {}) {
  const availableBrowsers = config.browsers.filter(browserName => {
    // Skip Safari on non-macOS
    if (browserName === 'safari' && process.platform !== 'darwin') {
      console.log(`⏭️  Skipping Safari tests (not on macOS)`);
      return false;
    }
    return true;
  });

  let passed = 0;
  let failed = 0;

  for (const browserName of availableBrowsers) {
    try {
      await runTests(suite, browserName, options);
      passed++;
    } catch (error) {
      failed++;
      console.error(`❌ Tests failed in ${browserName}:`, error.message);
    }
  }

  console.log(`\n📊 Cross-browser test results:`);
  console.log(`✅ Passed: ${passed}/${availableBrowsers.length} browsers`);
  console.log(`❌ Failed: ${failed}/${availableBrowsers.length} browsers`);

  if (failed > 0) {
    process.exit(1);
  }
}

async function main() {
  try {
    console.log(`🧪 Faux News E2E Test Runner`);
    console.log(`📋 Suite: ${testSuite}`);
    console.log(`🌐 Browser: ${browser}`);
    console.log(`📱 Headless: ${headless}`);
    console.log(`⚡ Parallel: ${parallel}`);

    const options = {
      headless,
      parallel,
      url,
      verbose,
      timeout: config.defaultTimeout
    };

    if (testSuite === 'cross-browser') {
      await runCrossBrowserTests('functional', options);
    } else if (browser === 'all') {
      await runCrossBrowserTests(testSuite, options);
    } else {
      await runTests(testSuite, browser, options);
    }

    console.log(`\n🎉 All tests completed successfully!`);
  } catch (error) {
    console.error(`\n💥 Test run failed:`, error.message);
    process.exit(1);
  }
}

// Run the tests
main();