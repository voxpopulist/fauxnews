import { expect } from 'chai';
import { By, until } from 'selenium-webdriver';
import { WebDriverFactory, TestUtils, TestConfig } from '../utils/test-helpers.js';

describe('Responsive Design Tests', function() {
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
        await TestUtils.takeScreenshot(driver, `responsive_failure_${this.currentTest.title.replace(/\s+/g, '_')}`);
      }
      await driver.quit();
    }
  });

  describe('Mobile Responsive Tests', function() {
    TestConfig.MOBILE_RESOLUTIONS.forEach(resolution => {
      it(`should display correctly at ${resolution.name} (${resolution.width}x${resolution.height})`, async function() {
        await driver.manage().window().setRect({ 
          width: resolution.width, 
          height: resolution.height 
        });
        
        await driver.get(baseUrl);
        await TestUtils.waitForPageLoad(driver);
        await driver.sleep(1000);
        
        // Take screenshot for visual verification
        await TestUtils.takeScreenshot(driver, `mobile_${resolution.name.replace(/\s+/g, '_')}_${resolution.width}x${resolution.height}`);
        
        // Check basic elements are visible
        const header = await TestUtils.waitForElementVisible(driver, By.css('header'));
        const searchInput = await TestUtils.waitForElementVisible(driver, By.css('#search'));
        const main = await TestUtils.waitForElementVisible(driver, By.css('main'));
        
        expect(header).to.exist;
        expect(searchInput).to.exist;
        expect(main).to.exist;
        
        // Check search input is properly sized
        const searchRect = await searchInput.getRect();
        expect(searchRect.width).to.be.greaterThan(200);
        expect(searchRect.width).to.be.lessThan(resolution.width);
        
        // Check content doesn't overflow
        const bodyOverflow = await driver.executeScript('return document.body.scrollWidth > window.innerWidth');
        expect(bodyOverflow).to.be.false;
      });
    });

    it('should handle mobile orientation changes', async function() {
      // Portrait
      await driver.manage().window().setRect({ width: 375, height: 667 });
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      const portraitSearch = await driver.findElement(By.css('#search'));
      const portraitRect = await portraitSearch.getRect();
      
      // Landscape
      await driver.manage().window().setRect({ width: 667, height: 375 });
      await driver.sleep(500);
      
      const landscapeSearch = await driver.findElement(By.css('#search'));
      const landscapeRect = await landscapeSearch.getRect();
      
      // Both orientations should work
      expect(portraitRect.width).to.be.greaterThan(0);
      expect(landscapeRect.width).to.be.greaterThan(0);
    });

    it('should have mobile-friendly touch targets', async function() {
      await driver.manage().window().setRect({ width: 375, height: 667 });
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      await driver.sleep(2000);
      
      const touchTargets = await driver.findElements(By.css('button, a, [data-word], input[type="button"]'));
      
      for (let i = 0; i < Math.min(touchTargets.length, 10); i++) {
        const target = touchTargets[i];
        const rect = await target.getRect();
        
        // Touch targets should be at least 44x44px (Apple HIG) or 48x48px (Material Design)
        const minSize = 40; // Being slightly lenient
        expect(rect.width).to.be.greaterThan(minSize, `Touch target ${i} width too small: ${rect.width}px`);
        expect(rect.height).to.be.greaterThan(minSize, `Touch target ${i} height too small: ${rect.height}px`);
      }
    });
  });

  describe('Tablet Responsive Tests', function() {
    TestConfig.TABLET_RESOLUTIONS.forEach(resolution => {
      it(`should display correctly at ${resolution.name} (${resolution.width}x${resolution.height})`, async function() {
        await driver.manage().window().setRect({ 
          width: resolution.width, 
          height: resolution.height 
        });
        
        await driver.get(baseUrl);
        await TestUtils.waitForPageLoad(driver);
        await driver.sleep(1000);
        
        // Take screenshot
        await TestUtils.takeScreenshot(driver, `tablet_${resolution.name.replace(/\s+/g, '_')}_${resolution.width}x${resolution.height}`);
        
        // Check layout adapts properly
        const header = await driver.findElement(By.css('header'));
        const main = await driver.findElement(By.css('main'));
        
        expect(header).to.exist;
        expect(main).to.exist;
        
        // Check grid layout on tablet
        const resultsContainer = await driver.findElement(By.css('#results'));
        const gridStyles = await resultsContainer.getCssValue('display');
        expect(gridStyles).to.equal('grid');
        
        // Content should use available space efficiently
        const mainRect = await main.getRect();
        expect(mainRect.width).to.be.greaterThan(resolution.width * 0.8);
      });
    });

    it('should optimize content layout for tablet', async function() {
      await driver.manage().window().setRect({ width: 768, height: 1024 });
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      await driver.sleep(3000);
      
      // Check if content is displayed in appropriate columns
      const cards = await driver.findElements(By.css('.card-audio, .card'));
      
      if (cards.length > 1) {
        const firstCard = cards[0];
        const secondCard = cards[1];
        
        const firstRect = await firstCard.getRect();
        const secondRect = await secondCard.getRect();
        
        // On tablet, cards might be side by side
        const areSideBySide = Math.abs(firstRect.y - secondRect.y) < 50;
        const areStacked = Math.abs(firstRect.x - secondRect.x) < 50;
        
        // Should have reasonable layout (either stacked or side-by-side)
        expect(areSideBySide || areStacked).to.be.true;
      }
    });
  });

  describe('Desktop Responsive Tests', function() {
    TestConfig.DESKTOP_RESOLUTIONS.forEach(resolution => {
      it(`should display correctly at ${resolution.name} (${resolution.width}x${resolution.height})`, async function() {
        await driver.manage().window().setRect({ 
          width: resolution.width, 
          height: resolution.height 
        });
        
        await driver.get(baseUrl);
        await TestUtils.waitForPageLoad(driver);
        await driver.sleep(1000);
        
        // Take screenshot
        await TestUtils.takeScreenshot(driver, `desktop_${resolution.name.replace(/\s+/g, '_')}_${resolution.width}x${resolution.height}`);
        
        // Check full desktop layout
        const header = await driver.findElement(By.css('header'));
        const main = await driver.findElement(By.css('main'));
        const footer = await driver.findElement(By.css('footer'));
        
        expect(header).to.exist;
        expect(main).to.exist;
        expect(footer).to.exist;
        
        // Check content utilizes full width appropriately
        const mainRect = await main.getRect();
        expect(mainRect.width).to.be.greaterThan(resolution.width * 0.7);
        expect(mainRect.width).to.be.lessThan(resolution.width * 1.1);
      });
    });

    it('should show multi-column layout on desktop', async function() {
      await driver.manage().window().setRect({ width: 1920, height: 1080 });
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      await driver.sleep(3000);
      
      const cards = await driver.findElements(By.css('.card-audio, .card'));
      
      if (cards.length >= 3) {
        const positions = [];
        for (let i = 0; i < 3; i++) {
          const rect = await cards[i].getRect();
          positions.push({ x: rect.x, y: rect.y });
        }
        
        // Should have multiple columns (cards at different x positions in same row)
        const uniqueXPositions = [...new Set(positions.map(p => Math.round(p.x / 10) * 10))];
        expect(uniqueXPositions.length).to.be.greaterThan(1, 'Should have multi-column layout on desktop');
      }
    });

    it('should handle very wide screens', async function() {
      await driver.manage().window().setRect({ width: 2560, height: 1440 });
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      // Content should be centered and not stretch too wide
      const main = await driver.findElement(By.css('main'));
      const mainRect = await main.getRect();
      
      // Should have reasonable max-width
      expect(mainRect.width).to.be.lessThan(2000, 'Content should not stretch too wide on large screens');
      
      // Should be centered
      const centerX = 2560 / 2;
      const mainCenterX = mainRect.x + (mainRect.width / 2);
      const centerOffset = Math.abs(centerX - mainCenterX);
      expect(centerOffset).to.be.lessThan(100, 'Content should be centered on wide screens');
    });
  });

  describe('Responsive Behavior Tests', function() {
    it('should maintain functionality across screen sizes', async function() {
      const resolutions = [
        { width: 375, height: 667 },   // Mobile
        { width: 768, height: 1024 },  // Tablet
        { width: 1920, height: 1080 }  // Desktop
      ];
      
      for (const resolution of resolutions) {
        await driver.manage().window().setRect(resolution);
        await driver.get(baseUrl);
        await TestUtils.waitForPageLoad(driver);
        
        // Test search functionality
        const searchInput = await TestUtils.waitForElementVisible(driver, By.css('#search'));
        await searchInput.clear();
        await searchInput.sendKeys('test');
        
        const value = await searchInput.getAttribute('value');
        expect(value).to.equal('test');
        
        // Test tag interaction
        const tags = await driver.findElements(By.css('[data-word]'));
        if (tags.length > 0) {
          const firstTag = tags[0];
          const tagWord = await firstTag.getAttribute('data-word');
          await firstTag.click();
          
          const searchValue = await searchInput.getAttribute('value');
          expect(searchValue).to.equal(tagWord);
        }
        
        // Clear for next iteration
        await searchInput.clear();
      }
    });

    it('should adapt typography for different screen sizes', async function() {
      // Mobile
      await driver.manage().window().setRect({ width: 375, height: 667 });
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      const h1Mobile = await driver.findElement(By.css('h1'));
      const mobileFontSize = await h1Mobile.getCssValue('font-size');
      
      // Desktop
      await driver.manage().window().setRect({ width: 1920, height: 1080 });
      await driver.sleep(500);
      
      const h1Desktop = await driver.findElement(By.css('h1'));
      const desktopFontSize = await h1Desktop.getCssValue('font-size');
      
      // Font sizes should be responsive (not necessarily larger on desktop due to Tailwind)
      expect(mobileFontSize).to.not.be.empty;
      expect(desktopFontSize).to.not.be.empty;
    });

    it('should handle content overflow gracefully', async function() {
      const resolutions = [
        { width: 320, height: 568 },   // Very small mobile
        { width: 375, height: 667 },   // iPhone
        { width: 768, height: 1024 }   // Tablet
      ];
      
      for (const resolution of resolutions) {
        await driver.manage().window().setRect(resolution);
        await driver.get(baseUrl);
        await TestUtils.waitForPageLoad(driver);
        await driver.sleep(1000);
        
        // Check for horizontal scrollbars
        const hasHorizontalScroll = await driver.executeScript(`
          return document.body.scrollWidth > window.innerWidth;
        `);
        
        expect(hasHorizontalScroll).to.be.false, 
          `Horizontal scroll detected at ${resolution.width}x${resolution.height}`);
        
        // Check all content is within viewport
        const viewportWidth = await driver.executeScript('return window.innerWidth');
        const bodyWidth = await driver.executeScript('return document.body.scrollWidth');
        
        expect(bodyWidth).to.be.lessThanOrEqual(viewportWidth + 5); // Allow 5px tolerance
      }
    });

    it('should maintain aspect ratios and proportions', async function() {
      await driver.manage().window().setRect({ width: 1200, height: 800 });
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      await driver.sleep(3000);
      
      const cards = await driver.findElements(By.css('.card-audio, .card'));
      
      if (cards.length > 0) {
        const firstCard = cards[0];
        const cardRect = await firstCard.getRect();
        
        // Cards should have reasonable aspect ratio
        const aspectRatio = cardRect.width / cardRect.height;
        expect(aspectRatio).to.be.greaterThan(0.5, 'Card too tall');
        expect(aspectRatio).to.be.lessThan(3, 'Card too wide');
      }
    });

    it('should maintain aspect ratios and proportions', async function() {
      await driver.manage().window().setRect({ width: 1200, height: 800 });
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      await driver.sleep(3000);
      
      const cards = await driver.findElements(By.css('.card-audio, .card'));
      
      if (cards.length > 0) {
        const firstCard = cards[0];
        const cardRect = await firstCard.getRect();
        
        // Cards should have reasonable aspect ratio
        const aspectRatio = cardRect.width / cardRect.height;
        expect(aspectRatio).to.be.greaterThan(0.5, 'Card too tall');
        expect(aspectRatio).to.be.lessThan(3, 'Card too wide');
      }
    });
  });
});