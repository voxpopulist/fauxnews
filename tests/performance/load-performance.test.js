import { expect } from 'chai';
import { By, until } from 'selenium-webdriver';
import { WebDriverFactory, TestUtils, TestConfig } from '../utils/test-helpers.js';

describe('Performance Tests', function() {
  this.timeout(TestConfig.AUDIO_TIMEOUT * 2);
  
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
        await TestUtils.takeScreenshot(driver, `performance_failure_${this.currentTest.title.replace(/\s+/g, '_')}`);
      }
      await driver.quit();
    }
  });

  describe('Page Load Performance', function() {
    it('should load initial page quickly', async function() {
      const startTime = Date.now();
      
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).to.be.lessThan(5000, `Page load took ${loadTime}ms, should be under 5000ms`);
    });

    it('should have good Core Web Vitals', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      await driver.sleep(3000);
      
      const metrics = await TestUtils.getNetworkMetrics(driver);
      
      // Largest Contentful Paint should be under 2.5s
      expect(metrics.loadTime).to.be.lessThan(2500, 'Load time should be under 2.5s');
      
      // First Contentful Paint should be under 1.8s
      if (metrics.firstContentfulPaint > 0) {
        expect(metrics.firstContentfulPaint).to.be.lessThan(1800, 'First Contentful Paint should be under 1.8s');
      }
      
      // DOM Content Loaded should be quick
      expect(metrics.domContentLoaded).to.be.lessThan(2000, 'DOM Content Loaded should be under 2s');
    });

    it('should handle resource loading efficiently', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      // Check if resources are loaded efficiently
      const resourceTiming = await driver.executeScript(`
        return performance.getEntriesByType('resource').map(resource => ({
          name: resource.name.split('/').pop(),
          duration: resource.duration,
          size: resource.transferSize || 0,
          type: resource.initiatorType
        })).filter(resource => resource.duration > 0);
      `);
      
      // No single resource should take more than 3 seconds
      const slowResources = resourceTiming.filter(resource => resource.duration > 3000);
      expect(slowResources).to.have.lengthOf(0, 
        `Slow resources found: ${slowResources.map(r => `${r.name} (${r.duration}ms)`).join(', ')}`);
      
      // CSS should load quickly
      const cssResources = resourceTiming.filter(resource => 
        resource.name.endsWith('.css') || resource.type === 'link');
      cssResources.forEach(css => {
        expect(css.duration).to.be.lessThan(1000, `CSS file ${css.name} took ${css.duration}ms`);
      });
    });
  });

  describe('Runtime Performance', function() {
    it('should handle search operations efficiently', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      await driver.sleep(2000);
      
      const searchInput = await TestUtils.waitForElementVisible(driver, By.css('#search'));
      
      // Measure search performance
      const searchTerms = ['trump', 'biden', 'news', 'politics', 'test'];
      const searchTimes = [];
      
      for (const term of searchTerms) {
        const startTime = Date.now();
        
        await searchInput.clear();
        await searchInput.sendKeys(term);
        
        // Wait for search to complete
        await driver.sleep(500);
        
        const endTime = Date.now();
        const searchTime = endTime - startTime;
        searchTimes.push(searchTime);
        
        expect(searchTime).to.be.lessThan(1000, `Search for "${term}" took ${searchTime}ms`);
      }
      
      // Average search time should be reasonable
      const avgSearchTime = searchTimes.reduce((a, b) => a + b) / searchTimes.length;
      expect(avgSearchTime).to.be.lessThan(500, `Average search time was ${avgSearchTime}ms`);
    });

    it('should scroll smoothly with content', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      await driver.sleep(3000);
      
      // Measure scroll performance
      const scrollMetrics = await driver.executeScript(`
        let frameCount = 0;
        let startTime = performance.now();
        
        function countFrames() {
          frameCount++;
          if (performance.now() - startTime < 1000) {
            requestAnimationFrame(countFrames);
          }
        }
        
        requestAnimationFrame(countFrames);
        
        // Perform scroll
        window.scrollTo({ top: 500, behavior: 'smooth' });
        
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              fps: frameCount,
              scrollTop: window.scrollY
            });
          }, 1000);
        });
      `);
      
      expect(scrollMetrics.fps).to.be.greaterThan(30, 'Should maintain at least 30 FPS during scroll');
      expect(scrollMetrics.scrollTop).to.be.greaterThan(0, 'Page should have scrolled');
    });

    it('should handle multiple audio players efficiently', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      await driver.sleep(5000);
      
      const audioElements = await driver.findElements(By.css('audio, .audio-player'));
      
      if (audioElements.length > 1) {
        // Test interaction with multiple audio players
        const startTime = Date.now();
        
        for (let i = 0; i < Math.min(audioElements.length, 3); i++) {
          const audio = audioElements[i];
          await TestUtils.scrollToElement(driver, audio);
          
          // Try to interact with audio player
          const playButtons = await audio.findElements(By.css('button, .play-btn'));
          if (playButtons.length > 0) {
            await playButtons[0].click();
            await driver.sleep(100);
          }
        }
        
        const totalTime = Date.now() - startTime;
        expect(totalTime).to.be.lessThan(2000, 'Multiple audio interactions should be fast');
      }
    });
  });

  describe('Memory and Resource Usage', function() {
    it('should not have memory leaks during navigation', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      // Get initial memory usage
      const initialMemory = await driver.executeScript(`
        return performance.memory ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize
        } : { usedJSHeapSize: 0, totalJSHeapSize: 0 };
      `);
      
      // Perform multiple searches to test for memory leaks
      const searchInput = await driver.findElement(By.css('#search'));
      const searchTerms = ['test1', 'test2', 'test3', 'test4', 'test5'];
      
      for (const term of searchTerms) {
        await searchInput.clear();
        await searchInput.sendKeys(term);
        await driver.sleep(500);
      }
      
      // Force garbage collection if possible
      await driver.executeScript('if (window.gc) window.gc();');
      await driver.sleep(1000);
      
      const finalMemory = await driver.executeScript(`
        return performance.memory ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize
        } : { usedJSHeapSize: 0, totalJSHeapSize: 0 };
      `);
      
      if (initialMemory.usedJSHeapSize > 0 && finalMemory.usedJSHeapSize > 0) {
        const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        const memoryIncreasePercent = (memoryIncrease / initialMemory.usedJSHeapSize) * 100;
        
        // Memory shouldn't increase by more than 50% during basic operations
        expect(memoryIncreasePercent).to.be.lessThan(50, 
          `Memory usage increased by ${memoryIncreasePercent.toFixed(2)}%`);
      }
    });

    it('should load images and assets lazily', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      // Check initial network requests
      const initialRequests = await driver.executeScript(`
        return performance.getEntriesByType('resource').length;
      `);
      
      // Scroll to load more content
      await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
      await driver.sleep(2000);
      
      const afterScrollRequests = await driver.executeScript(`
        return performance.getEntriesByType('resource').length;
      `);
      
      // Should have lazy loaded some additional resources
      expect(afterScrollRequests).to.be.greaterThanOrEqual(initialRequests);
      
      // But not too many new requests (indicates efficient lazy loading)
      const newRequests = afterScrollRequests - initialRequests;
      expect(newRequests).to.be.lessThan(20, 'Too many new requests after scroll');
    });
  });

  describe('Network Performance', function() {
    it('should minimize HTTP requests', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      await driver.sleep(3000);
      
      const networkRequests = await driver.executeScript(`
        return performance.getEntriesByType('resource').map(resource => ({
          name: resource.name,
          type: resource.initiatorType,
          size: resource.transferSize || 0,
          duration: resource.duration
        }));
      `);
      
      // Should have reasonable number of requests
      expect(networkRequests.length).to.be.lessThan(50, 'Too many HTTP requests');
      
      // Check for efficient resource bundling
      const jsFiles = networkRequests.filter(req => req.name.endsWith('.js'));
      const cssFiles = networkRequests.filter(req => req.name.endsWith('.css'));
      
      expect(jsFiles.length).to.be.lessThan(10, 'Too many separate JS files');
      expect(cssFiles.length).to.be.lessThan(5, 'Too many separate CSS files');
    });

    it('should compress resources efficiently', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      const resourceSizes = await driver.executeScript(`
        return performance.getEntriesByType('resource')
          .filter(resource => resource.transferSize > 0)
          .map(resource => ({
            name: resource.name.split('/').pop(),
            size: resource.transferSize,
            type: resource.initiatorType
          }));
      `);
      
      // Main CSS should be reasonably sized
      const cssResources = resourceSizes.filter(resource => 
        resource.name.endsWith('.css'));
      
      cssResources.forEach(css => {
        expect(css.size).to.be.lessThan(100000, 
          `CSS file ${css.name} is ${css.size} bytes, should be under 100KB`);
      });
      
      // Main JS should be reasonably sized
      const jsResources = resourceSizes.filter(resource => 
        resource.name.endsWith('.js'));
      
      jsResources.forEach(js => {
        expect(js.size).to.be.lessThan(200000, 
          `JS file ${js.name} is ${js.size} bytes, should be under 200KB`);
      });
    });
  });
});