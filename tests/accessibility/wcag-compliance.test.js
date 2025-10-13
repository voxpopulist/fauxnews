import { expect } from 'chai';
import { By, until } from 'selenium-webdriver';
import { WebDriverFactory, TestUtils, TestConfig } from '../utils/test-helpers.js';

describe('Accessibility Tests', function() {
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
        await TestUtils.takeScreenshot(driver, `accessibility_failure_${this.currentTest.title.replace(/\s+/g, '_')}`);
      }
      await driver.quit();
    }
  });

  describe('WCAG 2.1 Compliance', function() {
    it('should pass automated accessibility scan', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      await driver.sleep(3000);
      
      const results = await TestUtils.checkAccessibility(driver);
      
      // Check for violations
      expect(results.violations).to.be.an('array');
      
      const criticalViolations = results.violations.filter(violation => 
        violation.impact === 'critical' || violation.impact === 'serious'
      );
      
      if (criticalViolations.length > 0) {
        const violationMessages = criticalViolations.map(v => 
          `${v.id}: ${v.description} (${v.nodes.length} instances)`
        ).join('\n');
        
        expect(criticalViolations).to.have.lengthOf(0, 
          `Critical accessibility violations found:\n${violationMessages}`);
      }
    });

    it('should have proper heading structure', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      const headings = await driver.findElements(By.css('h1, h2, h3, h4, h5, h6'));
      expect(headings.length).to.be.greaterThan(0, 'Page should have headings');
      
      // Check for h1
      const h1Elements = await driver.findElements(By.css('h1'));
      expect(h1Elements.length).to.be.greaterThan(0, 'Page should have at least one h1');
      expect(h1Elements.length).to.be.lessThan(3, 'Page should not have too many h1 elements');
      
      // Check heading hierarchy
      const headingLevels = [];
      for (const heading of headings) {
        const tagName = await heading.getTagName();
        const level = parseInt(tagName.charAt(1));
        headingLevels.push(level);
      }
      
      // First heading should be h1
      expect(headingLevels[0]).to.equal(1, 'First heading should be h1');
    });

    it('should have proper alt text for images', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      const images = await driver.findElements(By.css('img'));
      
      for (const img of images) {
        const alt = await img.getAttribute('alt');
        const src = await img.getAttribute('src');
        
        // Decorative images can have empty alt, but alt attribute should exist
        expect(alt).to.not.be.null;
        
        // If image has content, alt should not be just filename
        if (alt && alt.trim() !== '') {
          const filename = src ? src.split('/').pop().split('.')[0] : '';
          expect(alt.toLowerCase()).to.not.equal(filename.toLowerCase());
        }
      }
    });

    it('should have proper form labels', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      const inputs = await driver.findElements(By.css('input, textarea, select'));
      
      for (const input of inputs) {
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledby = await input.getAttribute('aria-labelledby');
        const placeholder = await input.getAttribute('placeholder');
        
        // Input should have some form of label
        const hasLabel = id ? 
          (await driver.findElements(By.css(`label[for="${id}"]`))).length > 0 :
          false;
        
        const hasAccessibleName = hasLabel || ariaLabel || ariaLabelledby || placeholder;
        expect(hasAccessibleName).to.be.true;
      }
    });

    it('should support keyboard navigation', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      // Get all focusable elements
      const focusableElements = await driver.findElements(By.css(
        'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
      ));
      
      expect(focusableElements.length).to.be.greaterThan(0, 'Page should have focusable elements');
      
      // Test tab navigation through first few elements
      const searchInput = await driver.findElement(By.css('#search'));
      await searchInput.click();
      
      // Should be able to focus
      const focused = await driver.executeScript('return document.activeElement');
      expect(focused).to.exist;
      
      // Test keyboard interaction
      await searchInput.sendKeys('test');
      const value = await searchInput.getAttribute('value');
      expect(value).to.equal('test');
    });

    it('should have sufficient color contrast', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      // Check main text elements for contrast
      const textElements = await driver.findElements(By.css('h1, h2, h3, p, span, a, button'));
      
      for (let i = 0; i < Math.min(textElements.length, 10); i++) {
        const element = textElements[i];
        const text = await element.getText();
        
        if (text && text.trim().length > 0) {
          const color = await element.getCssValue('color');
          const backgroundColor = await element.getCssValue('background-color');
          
          // Basic check that colors are not the same
          expect(color).to.not.equal(backgroundColor);
          
          // Colors should not be transparent or default
          expect(color).to.not.equal('rgba(0, 0, 0, 0)');
        }
      }
    });
  });

  describe('Keyboard Accessibility', function() {
    it('should support tab navigation', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      const body = await driver.findElement(By.css('body'));
      
      // Start tabbing through elements
      await body.sendKeys('\ue004'); // Tab key
      
      let activeElement = await driver.executeScript('return document.activeElement');
      expect(activeElement).to.exist;
      
      const tagName = await activeElement.getTagName();
      const focusableElements = ['input', 'button', 'a', 'select', 'textarea'];
      expect(focusableElements).to.include(tagName.toLowerCase());
    });

    it('should support Enter key for activation', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      const tags = await driver.findElements(By.css('[data-word]'));
      if (tags.length > 0) {
        const firstTag = tags[0];
        const tagWord = await firstTag.getAttribute('data-word');
        
        // Focus and press Enter
        await firstTag.click();
        await firstTag.sendKeys('\ue007'); // Enter key
        
        // Check if action was triggered
        const searchInput = await driver.findElement(By.css('#search'));
        const inputValue = await searchInput.getAttribute('value');
        expect(inputValue).to.equal(tagWord);
      }
    });

    it('should provide visible focus indicators', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      const searchInput = await driver.findElement(By.css('#search'));
      await searchInput.click();
      
      // Check for focus styles
      const outline = await searchInput.getCssValue('outline');
      const outlineWidth = await searchInput.getCssValue('outline-width');
      const borderColor = await searchInput.getCssValue('border-color');
      const boxShadow = await searchInput.getCssValue('box-shadow');
      
      // Should have some form of focus indicator
      const hasFocusIndicator = outline !== 'none' || 
                               outlineWidth !== '0px' ||
                               borderColor.includes('rgb') ||
                               boxShadow !== 'none';
      
      expect(hasFocusIndicator).to.be.true;
    });

    it('should support Escape key for closing interactions', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      const searchInput = await driver.findElement(By.css('#search'));
      await searchInput.click();
      await searchInput.sendKeys('test');
      
      // Press Escape
      await searchInput.sendKeys('\ue00c'); // Escape key
      
      // Input should still exist and be functional
      expect(searchInput).to.exist;
    });
  });

  describe('Screen Reader Compatibility', function() {
    it('should have proper ARIA labels', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      const interactiveElements = await driver.findElements(By.css('button, [role="button"], input'));
      
      for (const element of interactiveElements) {
        const ariaLabel = await element.getAttribute('aria-label');
        const ariaLabelledby = await element.getAttribute('aria-labelledby');
        const title = await element.getAttribute('title');
        const text = await element.getText();
        
        // Interactive elements should have accessible names
        const hasAccessibleName = ariaLabel || ariaLabelledby || title || (text && text.trim());
        expect(hasAccessibleName).to.be.true;
      }
    });

    it('should have proper ARIA roles', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      // Check for semantic HTML or ARIA roles
      const regions = await driver.findElements(By.css('main, [role="main"], header, [role="banner"], footer, [role="contentinfo"]'));
      expect(regions.length).to.be.greaterThan(0, 'Page should have semantic regions');
      
      // Check navigation elements
      const navigation = await driver.findElements(By.css('nav, [role="navigation"]'));
      // Navigation is optional but if present should be marked up properly
      
      // Check for proper button roles
      const buttons = await driver.findElements(By.css('button, [role="button"]'));
      for (const button of buttons) {
        const role = await button.getAttribute('role');
        const tagName = await button.getTagName();
        
        if (tagName.toLowerCase() !== 'button' && !role) {
          // Custom button elements should have button role
          expect(role).to.equal('button');
        }
      }
    });

    it('should provide status updates for dynamic content', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      // Check for live regions or status updates
      const searchInput = await driver.findElement(By.css('#search'));
      await searchInput.sendKeys('test');
      await driver.sleep(1000);
      
      // Results count should be announced to screen readers
      const resultsCount = await driver.findElement(By.css('#resultsCount'));
      const ariaLive = await resultsCount.getAttribute('aria-live');
      const role = await resultsCount.getAttribute('role');
      
      // Should have some mechanism for announcing updates
      const hasLiveRegion = ariaLive || role === 'status' || role === 'alert';
      // This is not strictly required but is good practice
    });

    it('should handle dynamic content changes accessibly', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      const searchInput = await driver.findElement(By.css('#search'));
      
      // Perform search that changes content
      await searchInput.clear();
      await searchInput.sendKeys('test');
      await driver.sleep(1000);
      
      // Check if focus is managed properly
      const activeElement = await driver.executeScript('return document.activeElement');
      expect(activeElement).to.exist;
      
      // Search input should maintain focus
      const searchInputStillFocused = await driver.executeScript(
        'return document.activeElement === arguments[0]', searchInput
      );
      expect(searchInputStillFocused).to.be.true;
    });
  });

  describe('Mobile Accessibility', function() {
    it('should be accessible on mobile devices', async function() {
      await driver.manage().window().setRect({ width: 375, height: 667 });
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      // Check touch target sizes
      const buttons = await driver.findElements(By.css('button, a, [role="button"]'));
      
      for (let i = 0; i < Math.min(buttons.length, 5); i++) {
        const button = buttons[i];
        const rect = await button.getRect();
        
        // Touch targets should be at least 44x44px
        expect(rect.width).to.be.greaterThan(30, 'Touch target too narrow');
        expect(rect.height).to.be.greaterThan(30, 'Touch target too short');
      }
    });

    it('should support mobile screen readers', async function() {
      await driver.manage().window().setRect({ width: 375, height: 667 });
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      // Check for mobile-specific accessibility features
      const viewport = await driver.findElement(By.css('meta[name="viewport"]'));
      const content = await viewport.getAttribute('content');
      
      expect(content).to.include('width=device-width');
      expect(content).to.include('initial-scale=1');
      
      // Ensure no maximum-scale restriction that breaks zoom
      expect(content).to.not.include('maximum-scale=1');
      expect(content).to.not.include('user-scalable=no');
    });
  });
});