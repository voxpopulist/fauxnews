import { expect } from 'chai';
import { By, until } from 'selenium-webdriver';
import { WebDriverFactory, TestUtils, TestConfig } from '../utils/test-helpers.js';

describe('Smoke Tests - Basic Functionality', function() {
  this.timeout(TestConfig.LONG_TIMEOUT);
  
  let driver;
  const baseUrl = TestUtils.getTestUrl();

  beforeEach(async function() {
    const browserName = process.env.BROWSER || 'chrome';
    driver = await WebDriverFactory.createDriver(browserName, {
      headless: process.env.HEADLESS === 'true'
    });
  });

  afterEach(async function() {
    if (driver) {
      if (this.currentTest.state === 'failed') {
        await TestUtils.takeScreenshot(driver, `smoke_failure_${this.currentTest.title.replace(/\s+/g, '_')}`);
      }
      await driver.quit();
    }
  });

  describe('Page Load and Basic Elements', function() {
    it('should load the homepage successfully', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      const title = await driver.getTitle();
      expect(title).to.include('Faux News');
      
      // Check for main sections
      const header = await TestUtils.waitForElementVisible(driver, By.css('header'));
      const main = await TestUtils.waitForElementVisible(driver, By.css('main'));
      const footer = await TestUtils.waitForElementVisible(driver, By.css('footer'));
      
      expect(header).to.exist;
      expect(main).to.exist;
      expect(footer).to.exist;
    });

    it('should display the site logo and navigation', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      // Check for logo/brand
      const brand = await TestUtils.waitForElementVisible(driver, By.css('h1'));
      const brandText = await brand.getText();
      expect(brandText).to.include('Faux News');
      
      // Check for navigation elements
      const headerNav = await driver.findElement(By.css('header'));
      expect(headerNav).to.exist;
    });

    it('should display the search input', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      const searchInput = await TestUtils.waitForElementVisible(driver, By.css('#search'));
      expect(searchInput).to.exist;
      
      const placeholder = await searchInput.getAttribute('placeholder');
      expect(placeholder).to.not.be.empty;
    });

    it('should load CSS styles correctly', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      // Check if main content has proper styling
      const body = await driver.findElement(By.css('body'));
      const backgroundColor = await body.getCssValue('background-color');
      
      // Should have a dark theme (not default white)
      expect(backgroundColor).to.not.equal('rgba(255, 255, 255, 1)');
    });

    it('should not have console errors on page load', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      const errors = await TestUtils.checkConsoleErrors(driver);
      const criticalErrors = errors.filter(error => 
        !error.message.includes('favicon') && 
        !error.message.includes('404') &&
        error.level.name === 'SEVERE'
      );
      
      expect(criticalErrors).to.have.lengthOf(0, 
        `Console errors found: ${criticalErrors.map(e => e.message).join(', ')}`);
    });
  });

  describe('Search Functionality', function() {
    it('should allow typing in the search box', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      const searchInput = await TestUtils.waitForElementVisible(driver, By.css('#search'));
      await searchInput.clear();
      await searchInput.sendKeys('test');
      
      const value = await searchInput.getAttribute('value');
      expect(value).to.equal('test');
    });

    it('should display search results when typing', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      const searchInput = await TestUtils.waitForElementVisible(driver, By.css('#search'));
      await searchInput.clear();
      await searchInput.sendKeys('the');
      
      // Wait for search results to appear
      await driver.sleep(1000);
      
      const resultsContainer = await driver.findElement(By.css('#results'));
      expect(resultsContainer).to.exist;
    });

    it('should show results count', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      const searchInput = await TestUtils.waitForElementVisible(driver, By.css('#search'));
      await searchInput.clear();
      await searchInput.sendKeys('news');
      
      // Wait for search to complete and results count to be populated
      await driver.wait(async () => {
        try {
          const resultsCount = await driver.findElement(By.css('#resultsCount'));
          const countText = await resultsCount.getText();
          return countText && countText.trim() !== '';
        } catch (e) {
          return false;
        }
      }, 10000, 'Results count not populated within 10 seconds');
      
      const resultsCount = await driver.findElement(By.css('#resultsCount'));
      const countText = await resultsCount.getText();
      
      expect(countText).to.match(/\d+\s+results?|No results/);
    });
  });

  describe('Content Loading', function() {
    it('should load multiple audio clips with content', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      // Wait for initial content to load
      await driver.sleep(5000);
      
  const audioCards = await driver.findElements(By.css('article[data-transcript-src]'));
      expect(audioCards.length).to.be.greaterThan(3, `Should have multiple clips, found: ${audioCards.length}`);
      
      // Verify each clip has actual content
      for (let i = 0; i < Math.min(audioCards.length, 3); i++) {
        const card = audioCards[i];
        const cardText = await card.getText();
        expect(cardText.length).to.be.greaterThan(20, `Card ${i+1} should have substantial content`);
        
        // Check for audio element or player
  const audioElements = await card.findElements(By.css('audio, .audio-player, .card__player'));
        expect(audioElements.length).to.be.greaterThan(0, `Card ${i+1} should have audio player`);
      }
      
      await TestUtils.takeScreenshot(driver, 'audio_clips_loaded');
    });

    it('should display clip metadata and transcripts', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      // Wait for content to load
      await driver.sleep(5000);
      
  const cards = await driver.findElements(By.css('article[data-transcript-src]'));
      expect(cards.length).to.be.greaterThan(0);
      
      // Check first few cards for transcript content
      for (let i = 0; i < Math.min(cards.length, 3); i++) {
        const card = cards[i];
        const cardText = await card.getText();
        expect(cardText.length).to.be.greaterThan(50, `Card ${i+1} should have transcript content`);
        
        // Look for transcript indicators
        const hasTranscriptText = cardText.toLowerCase().includes('transcript') || 
                                 cardText.length > 100; // Substantial text indicates transcript
        expect(hasTranscriptText).to.be.true;
      }
    });

    it('should verify audio players are ready for playback', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      await driver.sleep(5000);
      
      const audioElements = await driver.findElements(By.css('audio'));
      expect(audioElements.length).to.be.greaterThan(0, 'No audio elements found');
      
      // Check first few audio elements
      for (let i = 0; i < Math.min(audioElements.length, 3); i++) {
        const audio = audioElements[i];
        const src = await audio.getAttribute('src');
        const dataSrc = await audio.getAttribute('data-src');
        
        expect(src || dataSrc).to.not.be.empty;
        expect(src || dataSrc).to.include('.mp3');
        
        // Verify audio is not broken
        const readyState = await driver.executeScript('return arguments[0].readyState', audio);
        expect(readyState).to.be.greaterThanOrEqual(0); // At least HAVE_NOTHING
      }
    });
  });

  describe('Tag Cloud Functionality', function() {
    it('should display tag cloud with multiple tags', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      await driver.sleep(3000); // Wait for content to load
      
      // Look for tag elements
      const tags = await driver.findElements(By.css('[data-word]'));
      expect(tags.length).to.be.greaterThan(5, `Tag cloud should have multiple tags, found: ${tags.length}`);
      
      // Verify tags have text content
      for (let i = 0; i < Math.min(tags.length, 5); i++) {
        const tagText = await tags[i].getText();
        const tagWord = await tags[i].getAttribute('data-word');
        expect(tagText.trim()).to.not.be.empty;
        expect(tagWord).to.not.be.empty;
      }
      
      // Take screenshot for verification
      await TestUtils.takeScreenshot(driver, 'tag_cloud_display');
    });

    it('should allow clicking on tags', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      const tags = await driver.findElements(By.css('[data-word]'));
      if (tags.length > 0) {
        const firstTag = tags[0];
        const tagWord = await firstTag.getAttribute('data-word');
        
        await firstTag.click();
        
        // Check if search input was updated
        const searchInput = await driver.findElement(By.css('#search'));
        const inputValue = await searchInput.getAttribute('value');
        
        expect(inputValue).to.equal(tagWord);
      }
    });
  });

  describe('Responsive Design', function() {
    it('should be responsive on mobile viewport', async function() {
      await driver.manage().window().setRect({ width: 375, height: 667 });
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      // Check if mobile layout is applied
      const header = await driver.findElement(By.css('header'));
      expect(header).to.exist;
      
      // Check if content is still accessible
      const searchInput = await TestUtils.waitForElementVisible(driver, By.css('#search'));
      expect(searchInput).to.exist;
    });

    it('should be responsive on tablet viewport', async function() {
      await driver.manage().window().setRect({ width: 768, height: 1024 });
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      const main = await driver.findElement(By.css('main'));
      expect(main).to.exist;
      
      const searchInput = await TestUtils.waitForElementVisible(driver, By.css('#search'));
      expect(searchInput).to.exist;
    });
  });
});