import { expect } from 'chai';
import { By, until } from 'selenium-webdriver';
import { WebDriverFactory, TestUtils, TestConfig } from '../utils/test-helpers.js';

describe('Cross-Browser Compatibility Tests', function() {
  this.timeout(TestConfig.AUDIO_TIMEOUT);
  
  const browsers = ['chrome', 'firefox', 'edge', 'safari'];
  const baseUrl = TestUtils.getTestUrl();

  browsers.forEach(browserName => {
    describe(`${browserName.charAt(0).toUpperCase() + browserName.slice(1)} Browser Tests`, function() {
      let driver;

      before(function() {
        // Skip Safari tests if not on macOS
        if (browserName === 'safari' && process.platform !== 'darwin') {
          this.skip();
        }
      });

      beforeEach(async function() {
        try {
          driver = await WebDriverFactory.createDriver(browserName, {
            headless: process.env.HEADLESS === 'true' && browserName !== 'safari'
          });
        } catch (error) {
          this.skip(`${browserName} driver not available: ${error.message}`);
        }
      });

      afterEach(async function() {
        if (driver) {
          if (this.currentTest.state === 'failed') {
            await TestUtils.takeScreenshot(driver, `${browserName}_failure_${this.currentTest.title.replace(/\s+/g, '_')}`);
          }
          await driver.quit();
        }
      });

      it(`should load homepage correctly in ${browserName}`, async function() {
        await driver.get(baseUrl);
        await TestUtils.waitForPageLoad(driver);
        
        const title = await driver.getTitle();
        expect(title).to.include('Faux News');
        
        // Check main elements
        const header = await TestUtils.waitForElementVisible(driver, By.css('header'));
        const main = await TestUtils.waitForElementVisible(driver, By.css('main'));
        const footer = await TestUtils.waitForElementVisible(driver, By.css('footer'));
        
        expect(header).to.exist;
        expect(main).to.exist;
        expect(footer).to.exist;
      });

      it(`should render CSS correctly in ${browserName}`, async function() {
        await driver.get(baseUrl);
        await TestUtils.waitForPageLoad(driver);
        
        // Check if dark theme is applied
        const body = await driver.findElement(By.css('body'));
        const backgroundColor = await body.getCssValue('background-color');
        
        // Should not be default white
        expect(backgroundColor).to.not.equal('rgba(255, 255, 255, 1)');
        
        // Check if main content has proper styling
        const main = await driver.findElement(By.css('main'));
        const display = await main.getCssValue('display');
        expect(display).to.not.equal('none');
      });

      it(`should handle search functionality in ${browserName}`, async function() {
        await driver.get(baseUrl);
        await TestUtils.waitForPageLoad(driver);
        
        const searchInput = await TestUtils.waitForElementVisible(driver, By.css('#search'));
        await searchInput.clear();
        await searchInput.sendKeys('test');
        
        const value = await searchInput.getAttribute('value');
        expect(value).to.equal('test');
        
        // Wait for search results
        await driver.sleep(1000);
        
        const resultsContainer = await driver.findElement(By.css('#results'));
        expect(resultsContainer).to.exist;
      });

      it(`should load and display content in ${browserName}`, async function() {
        await driver.get(baseUrl);
        await TestUtils.waitForPageLoad(driver);
        await driver.sleep(3000);
        
        const contentCards = await driver.findElements(By.css('.card-audio, .card'));
        expect(contentCards.length).to.be.greaterThan(0, `No content cards found in ${browserName}`);
      });

      it(`should handle audio elements in ${browserName}`, async function() {
        await driver.get(baseUrl);
        await TestUtils.waitForPageLoad(driver);
        await driver.sleep(3000);
        
        const audioElements = await driver.findElements(By.css('audio, .audio-player'));
        
        if (audioElements.length > 0) {
          const firstAudio = audioElements[0];
          
          // Check if audio element has proper attributes
          if (await firstAudio.getTagName() === 'audio') {
            const controls = await firstAudio.getAttribute('controls');
            expect(controls).to.not.be.null;
          }
        }
      });

      it(`should support JavaScript interactions in ${browserName}`, async function() {
        await driver.get(baseUrl);
        await TestUtils.waitForPageLoad(driver);
        
        // Test JavaScript execution
        const result = await driver.executeScript('return window.PATH_PREFIX || "/"');
        expect(result).to.be.a('string');
        
        // Test DOM manipulation
        const tags = await driver.findElements(By.css('[data-word]'));
        if (tags.length > 0) {
          const firstTag = tags[0];
          await firstTag.click();
          
          const searchInput = await driver.findElement(By.css('#search'));
          const inputValue = await searchInput.getAttribute('value');
          expect(inputValue).to.not.be.empty;
        }
      });

      it(`should handle responsive design in ${browserName}`, async function() {
        // Test mobile viewport
        await driver.manage().window().setRect({ width: 375, height: 667 });
        await driver.get(baseUrl);
        await TestUtils.waitForPageLoad(driver);
        
        const searchInput = await TestUtils.waitForElementVisible(driver, By.css('#search'));
        expect(searchInput).to.exist;
        
        // Test desktop viewport
        await driver.manage().window().setRect({ width: 1920, height: 1080 });
        await driver.sleep(500);
        
        const header = await driver.findElement(By.css('header'));
        expect(header).to.exist;
      });

      it(`should not have console errors in ${browserName}`, async function() {
        await driver.get(baseUrl);
        await TestUtils.waitForPageLoad(driver);
        await driver.sleep(2000);
        
        const errors = await TestUtils.checkConsoleErrors(driver);
        const criticalErrors = errors.filter(error => 
          !error.message.includes('favicon') && 
          !error.message.includes('404') &&
          error.level.name === 'SEVERE'
        );
        
        expect(criticalErrors).to.have.lengthOf(0, 
          `Console errors in ${browserName}: ${criticalErrors.map(e => e.message).join(', ')}`);
      });
    });
  });

  describe('Browser Feature Compatibility', function() {
    let drivers = {};

    before(async function() {
      // Create drivers for available browsers
      const availableBrowsers = [];
      
      for (const browser of browsers) {
        try {
          if (browser === 'safari' && process.platform !== 'darwin') {
            continue;
          }
          
          const driver = await WebDriverFactory.createDriver(browser, {
            headless: process.env.HEADLESS === 'true' && browser !== 'safari'
          });
          
          drivers[browser] = driver;
          availableBrowsers.push(browser);
        } catch (error) {
          console.log(`Skipping ${browser}: ${error.message}`);
        }
      }
      
      if (availableBrowsers.length < 2) {
        this.skip('Need at least 2 browsers for comparison tests');
      }
    });

    after(async function() {
      // Cleanup all drivers
      for (const [browser, driver] of Object.entries(drivers)) {
        try {
          await driver.quit();
        } catch (error) {
          console.log(`Error closing ${browser} driver:`, error.message);
        }
      }
    });

    it('should render consistently across browsers', async function() {
      const screenshots = {};
      
      for (const [browser, driver] of Object.entries(drivers)) {
        await driver.get(baseUrl);
        await TestUtils.waitForPageLoad(driver);
        await driver.sleep(3000);
        
        // Take screenshot for visual comparison
        const screenshot = await TestUtils.takeScreenshot(driver, `cross_browser_${browser}_comparison`);
        screenshots[browser] = screenshot;
        
        // Check basic elements exist
        const title = await driver.getTitle();
        expect(title).to.include('Faux News');
        
        const searchInput = await driver.findElement(By.css('#search'));
        expect(searchInput).to.exist;
      }
      
      // All browsers should have captured screenshots
      expect(Object.keys(screenshots).length).to.equal(Object.keys(drivers).length);
    });

    it('should have consistent functionality across browsers', async function() {
      const results = {};
      
      for (const [browser, driver] of Object.entries(drivers)) {
        await driver.get(baseUrl);
        await TestUtils.waitForPageLoad(driver);
        await driver.sleep(3000);
        
        // Test search functionality
        const searchInput = await driver.findElement(By.css('#search'));
        await searchInput.clear();
        await searchInput.sendKeys('test');
        await driver.sleep(1000);
        
        const searchValue = await searchInput.getAttribute('value');
        const cardCount = (await driver.findElements(By.css('.card-audio, .card'))).length;
        
        results[browser] = {
          searchValue,
          cardCount,
          hasContent: cardCount > 0
        };
      }
      
      // All browsers should have similar basic functionality
      const browsers = Object.keys(results);
      if (browsers.length > 1) {
        const firstBrowser = browsers[0];
        const firstResult = results[firstBrowser];
        
        for (let i = 1; i < browsers.length; i++) {
          const currentBrowser = browsers[i];
          const currentResult = results[currentBrowser];
          
          expect(currentResult.searchValue).to.equal(firstResult.searchValue);
          expect(currentResult.hasContent).to.equal(firstResult.hasContent);
        }
      }
    });
  });
});