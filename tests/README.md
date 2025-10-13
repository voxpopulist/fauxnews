# Faux News E2E Test Suite

A comprehensive end-to-end testing suite for the Faux News website built with Selenium WebDriver and Node.js.

## Features

- ✅ **Cross-browser testing** (Chrome, Firefox, Edge, Safari)
- 📱 **Mobile and responsive testing**
- ♿ **Accessibility testing** (WCAG 2.1 compliance)
- ⚡ **Performance testing** (Core Web Vitals)
- 🔍 **Functional testing** (Search, audio, interactions)
- 💨 **Smoke testing** (Basic functionality)
- 📊 **Detailed reporting** with screenshots

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Chrome, Firefox, Edge browsers installed
- Safari (macOS only)

### Installation

```bash
cd tests
npm install
```

### Running Tests

```bash
# Run smoke tests
npm test

# Run specific test suite
npm run test:smoke
npm run test:functional
npm run test:mobile
npm run test:accessibility
npm run test:performance

# Run in specific browser
npm run test:chrome
npm run test:firefox
npm run test:safari
npm run test:edge

# Cross-browser testing
npm run test:cross-browser

# Headless mode
npm run test:headless
```

### Custom Test Runs

```bash
# Using the test runner directly
node run-tests.js --suite functional --browser chrome --headless
node run-tests.js --suite mobile --url http://localhost:4321
node run-tests.js --suite cross-browser --parallel

# Test against different environments
TEST_URL=http://localhost:4321 npm test
TEST_URL=https://staging.example.com npm run test:functional
```

## Test Suites

### 🚨 Smoke Tests
Basic functionality and page load tests. Quick validation that the site is working.

**Files:** `tests/smoke/*.test.js`
**Runtime:** ~2-3 minutes

- Page loads successfully
- Main elements present (header, search, content)
- No critical console errors
- Basic search functionality
- Tag cloud interaction

### 🔧 Functional Tests
Comprehensive feature testing including audio players, search, and user interactions.

**Files:** `tests/functional/*.test.js`
**Runtime:** ~5-10 minutes

- Audio player controls
- Advanced search functionality
- Tag cloud interactions and highlighting
- Transcript loading and display
- Dynamic content loading
- Performance metrics

### 📱 Mobile Tests
Mobile Safari compatibility and touch interaction testing.

**Files:** `tests/mobile/*.test.js`
**Runtime:** ~3-5 minutes

- Mobile Safari compatibility
- Touch target sizing
- Mobile responsive layout
- iOS-specific behaviors
- Mobile audio playback restrictions

### 🌐 Cross-Browser Tests
Compatibility testing across Chrome, Firefox, Edge, and Safari.

**Files:** `tests/cross-browser/*.test.js`
**Runtime:** ~10-15 minutes

- Consistent rendering across browsers
- JavaScript compatibility
- CSS consistency
- Feature parity
- Performance comparison

### ⚡ Performance Tests
Core Web Vitals, load times, and resource optimization testing.

**Files:** `tests/performance/*.test.js`
**Runtime:** ~5-8 minutes

- Page load performance
- Core Web Vitals (LCP, FCP, CLS)
- Resource loading efficiency
- Memory usage monitoring
- Network request optimization

### ♿ Accessibility Tests
WCAG 2.1 compliance and keyboard accessibility testing.

**Files:** `tests/accessibility/*.test.js`
**Runtime:** ~4-6 minutes

- Automated accessibility scanning
- Keyboard navigation
- Screen reader compatibility
- Color contrast checking
- ARIA labels and roles
- Focus management

### 📐 Responsive Tests
Layout and design testing across different screen sizes and orientations.

**Files:** `tests/responsive/*.test.js`
**Runtime:** ~6-8 minutes

- Mobile, tablet, desktop layouts
- Content overflow handling
- Touch target sizing
- Orientation changes
- Typography scaling

## Configuration

### Environment Variables

```bash
# Test target URL
TEST_URL=https://www.voxpopulist.com

# Browser selection
BROWSER=chrome|firefox|edge|safari

# Headless mode
HEADLESS=true|false

# Staging URL (optional)
STAGING_URL=https://staging.example.com
```

### Browser Support

| Browser | Platform | Headless | Notes |
|---------|----------|----------|-------|
| Chrome | All | ✅ | Primary test browser |
| Firefox | All | ✅ | Full feature support |
| Edge | Windows/macOS | ✅ | Chromium-based |
| Safari | macOS only | ❌ | Native Safari driver |

## Test Structure

```
tests/
├── utils/
│   └── test-helpers.js      # WebDriver factory, utilities
├── smoke/
│   └── basic-functionality.test.js
├── functional/
│   └── advanced-features.test.js
├── mobile/
│   └── safari-mobile.test.js
├── cross-browser/
│   └── compatibility.test.js
├── performance/
│   └── load-performance.test.js
├── accessibility/
│   └── wcag-compliance.test.js
├── responsive/
│   └── layout-tests.test.js
├── screenshots/             # Test failure screenshots
├── reports/                 # HTML test reports
├── package.json
├── run-tests.js            # Custom test runner
└── README.md
```

## Reports and Screenshots

- **HTML Reports:** Generated in `reports/` directory
- **Screenshots:** Saved to `screenshots/` on test failures
- **Console Output:** Detailed test progress and results

### Viewing Reports

```bash
# Generate HTML report
npm run test:report

# Open report in browser
open reports/report.html
```

## Debugging Tests

### Running Single Tests

```bash
# Run specific test file
npx mocha tests/smoke/basic-functionality.test.js --timeout 60000

# Run with specific browser
BROWSER=firefox npx mocha tests/functional/advanced-features.test.js
```

### Debug Mode

```bash
# Disable headless mode to see browser
HEADLESS=false npm test

# Verbose output
npm test -- --verbose

# Enable browser dev tools
HEADLESS=false npm run test:chrome
```

### Common Issues

1. **Browser driver issues**: Run `npm install` to update WebDriver binaries
2. **Timeout errors**: Increase timeout in test files or via `--timeout` flag
3. **Safari not found**: Safari only available on macOS
4. **Network issues**: Check TEST_URL and network connectivity

## CI/CD Integration

### GitHub Actions

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd tests && npm install
      - run: cd tests && npm run test:headless
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: screenshots
          path: tests/screenshots/
```

### Jenkins

```groovy
pipeline {
    agent any
    stages {
        stage('E2E Tests') {
            steps {
                dir('tests') {
                    sh 'npm install'
                    sh 'npm run test:cross-browser'
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'tests/screenshots/*', allowEmptyArchive: true
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'tests/reports',
                        reportFiles: 'report.html',
                        reportName: 'E2E Test Report'
                    ])
                }
            }
        }
    }
}
```

## Contributing

1. **Add new tests**: Create test files in appropriate suite directories
2. **Follow patterns**: Use existing test structure and utilities
3. **Add documentation**: Update README for new test categories
4. **Test locally**: Run full suite before submitting PRs

### Test Writing Guidelines

```javascript
// Good test structure
describe('Feature Name', function() {
  this.timeout(TestConfig.LONG_TIMEOUT);
  
  let driver;
  const baseUrl = TestUtils.getTestUrl();

  beforeEach(async function() {
    driver = await WebDriverFactory.createDriver('chrome');
  });

  afterEach(async function() {
    if (this.currentTest.state === 'failed') {
      await TestUtils.takeScreenshot(driver, 'test_failure');
    }
    await driver.quit();
  });

  it('should do something specific', async function() {
    await driver.get(baseUrl);
    await TestUtils.waitForPageLoad(driver);
    
    // Test implementation
    const element = await TestUtils.waitForElementVisible(driver, By.css('#selector'));
    expect(element).to.exist;
  });
});
```

## Performance Targets

- **Page Load**: < 5 seconds
- **First Contentful Paint**: < 1.8 seconds
- **Largest Contentful Paint**: < 2.5 seconds
- **Search Response**: < 500ms
- **Audio Loading**: < 3 seconds

## Accessibility Standards

- **WCAG 2.1 Level AA** compliance
- **Keyboard navigation** support
- **Screen reader** compatibility
- **Color contrast** ratios ≥ 4.5:1
- **Touch targets** ≥ 44px minimum

## License

Same as parent project.