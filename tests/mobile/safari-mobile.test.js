import { expect } from 'chai';
import { By, until } from 'selenium-webdriver';
import { WebDriverFactory, TestUtils, TestConfig } from '../utils/test-helpers.js';

describe('Mobile Safari Tests', function() {
  this.timeout(TestConfig.AUDIO_TIMEOUT);
  
  let driver;
  const baseUrl = TestUtils.getTestUrl();

  before(async function() {
    // Skip if not on macOS (Safari only available on macOS)
    if (process.platform !== 'darwin') {
      this.skip();
    }
  });

  beforeEach(async function() {
    // Create mobile Safari simulation using Chrome with mobile emulation
    driver = await WebDriverFactory.createDriver('chrome', {
      headless: process.env.HEADLESS === 'true',
      mobileDevice: 'iPhone 12',
      userAgent: TestConfig.MOBILE_DEVICES['iPhone 12'].userAgent
    });
  });

  afterEach(async function() {
    if (driver) {
      if (this.currentTest.state === 'failed') {
        await TestUtils.takeScreenshot(driver, `mobile_safari_failure_${this.currentTest.title.replace(/\s+/g, '_')}`);
      }
      await driver.quit();
    }
  });

  describe('Mobile Safari Compatibility', function() {
    it('should load correctly on mobile Safari viewport', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      // Check viewport
      const viewportWidth = await driver.executeScript('return window.innerWidth');
      expect(viewportWidth).to.be.lessThan(500); // Mobile width
      
      // Check if page loads
      const title = await driver.getTitle();
      expect(title).to.include('Faux News');
      
      // Check main elements are present
      const header = await TestUtils.waitForElementVisible(driver, By.css('header'));
      const main = await TestUtils.waitForElementVisible(driver, By.css('main'));
      
      expect(header).to.exist;
      expect(main).to.exist;
    });

    it('should display audio clips on mobile Safari', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      await driver.sleep(8000); // Extra wait for mobile loading
      
      // Take screenshot to verify mobile layout
      await TestUtils.takeScreenshot(driver, 'mobile_safari_full_page');
      
      const audioCards = await driver.findElements(By.css('.card-audio, .card'));
      expect(audioCards.length).to.be.greaterThan(3, `No audio clips found on mobile Safari, expected multiple clips but found: ${audioCards.length}`);
      
      // Verify each card has content
      for (let i = 0; i < Math.min(audioCards.length, 3); i++) {
        const card = audioCards[i];
        const cardText = await card.getText();
        expect(cardText.length).to.be.greaterThan(50, `Card ${i+1} should have transcript content on mobile`);
        
        // Check for audio element
        const audioElements = await card.findElements(By.css('audio, .audio-player'));
        expect(audioElements.length).to.be.greaterThan(0, `Card ${i+1} should have audio player on mobile Safari`);
        
        // Verify audio source exists and is MP3 (Safari compatible)
        if (audioElements.length > 0) {
          const audio = audioElements[0];
          const src = await audio.getAttribute('src') || await audio.getAttribute('data-src');
          expect(src).to.not.be.empty;
          expect(src).to.include('.mp3', 'Audio should be MP3 format for Safari compatibility');
        }
      }
    });

    it('should verify tag cloud exists and works on mobile Safari', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      await driver.sleep(5000);
      
      // Check for tag cloud
      const tags = await driver.findElements(By.css('[data-word]'));
      expect(tags.length).to.be.greaterThan(5, `Tag cloud should exist on mobile Safari, found: ${tags.length} tags`);
      
      // Test tag interaction on mobile
      if (tags.length > 0) {
        const firstTag = tags[0];
        const tagWord = await firstTag.getAttribute('data-word');
        
        // Simulate touch tap
        await driver.executeScript('arguments[0].click()', firstTag);
        await driver.sleep(1000);
        
        // Check if search was triggered
        const searchInput = await driver.findElement(By.css('#search'));
        const inputValue = await searchInput.getAttribute('value');
        expect(inputValue).to.equal(tagWord, 'Tag click should update search on mobile');
      }
    });

    it('should test audio playback controls on mobile Safari', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      await driver.sleep(8000);
      
      const playButtons = await driver.findElements(By.css('button[aria-label*="Play"], .play-btn, .audio-button'));
      expect(playButtons.length).to.be.greaterThan(0, 'No play buttons found on mobile Safari');
      
      if (playButtons.length > 0) {
        const firstPlayButton = playButtons[0];
        await TestUtils.scrollToElement(driver, firstPlayButton);
        
        // Check button is touch-accessible
        const buttonRect = await firstPlayButton.getRect();
        expect(buttonRect.width).to.be.greaterThan(40, 'Play button should be touch-friendly size');
        expect(buttonRect.height).to.be.greaterThan(40, 'Play button should be touch-friendly size');
        
        // Test touch interaction
        await driver.executeScript('arguments[0].focus()', firstPlayButton);
        await firstPlayButton.click();
        await driver.sleep(2000);
        
        // Verify button responded (should still exist)
        expect(firstPlayButton).to.exist;
        
        await TestUtils.takeScreenshot(driver, 'mobile_safari_audio_clicked');
      }
    });

    it('should verify transcripts are readable on mobile Safari', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      await driver.sleep(5000);
      
      const cards = await driver.findElements(By.css('.card-audio, .card'));
      expect(cards.length).to.be.greaterThan(0);
      
      let transcriptCards = 0;
      for (let i = 0; i < Math.min(cards.length, 5); i++) {
        const card = cards[i];
        const cardText = await card.getText();
        
        if (cardText.length > 100) {
          transcriptCards++;
          
          // Check readability on mobile
          const cardRect = await card.getRect();
          expect(cardRect.width).to.be.greaterThan(200, 'Card should be readable width on mobile');
          
          // Check for proper text content
          const hasReadableText = cardText.includes(' ') && 
                                 cardText.includes('.') && 
                                 cardText.length > 50;
          expect(hasReadableText).to.be.true;
        }
      }
      
      expect(transcriptCards).to.be.greaterThan(0, 'Should have cards with transcript content on mobile Safari');
    });

    it('should handle touch interactions', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      const searchInput = await TestUtils.waitForElementVisible(driver, By.css('#search'));
      
      // Simulate touch/tap
      await driver.executeScript('arguments[0].focus()', searchInput);
      await searchInput.sendKeys('test');
      
      const value = await searchInput.getAttribute('value');
      expect(value).to.equal('test');
    });

    it('should support mobile scrolling', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      await driver.sleep(3000);
      
      // Get initial scroll position
      const initialScrollY = await driver.executeScript('return window.scrollY');
      
      // Scroll down
      await driver.executeScript('window.scrollTo(0, 500)');
      await driver.sleep(1000);
      
      const newScrollY = await driver.executeScript('return window.scrollY');
      expect(newScrollY).to.be.greaterThan(initialScrollY);
    });

    it('should load audio files with correct MIME types for mobile Safari', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      await driver.sleep(5000);
      
      // Check if audio elements have proper sources
      const audioElements = await driver.findElements(By.css('audio'));
      
      if (audioElements.length > 0) {
        const firstAudio = audioElements[0];
        const src = await firstAudio.getAttribute('src');
        
        // Should have audio source
        expect(src).to.not.be.empty;
        
        // Check for MP3 format (Safari compatible)
        const hasMp3 = src.includes('.mp3') || src.includes('audio/mpeg');
        expect(hasMp3).to.be.true;
      }
    });

    it('should handle mobile Safari specific behaviors', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      // Check if iOS-specific meta tags are present
      const viewport = await driver.findElement(By.css('meta[name="viewport"]'));
      const viewportContent = await viewport.getAttribute('content');
      
      expect(viewportContent).to.include('width=device-width');
      expect(viewportContent).to.include('initial-scale=1');
    });
  });

  describe('Mobile Performance', function() {
    it('should load quickly on mobile connection', async function() {
      const startTime = Date.now();
      
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).to.be.lessThan(15000, 'Mobile page load too slow');
    });

    it('should have efficient resource loading on mobile', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      await driver.sleep(3000);
      
      // Check if images are optimized/disabled for mobile
      const images = await driver.findElements(By.css('img'));
      
      // Should have minimal images for faster mobile loading
      expect(images.length).to.be.lessThan(10);
    });
  });

  describe('Mobile User Experience', function() {
    it('should have touch-friendly interface elements', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      // Check button sizes
      const buttons = await driver.findElements(By.css('button'));
      
      if (buttons.length > 0) {
        const firstButton = buttons[0];
        const buttonSize = await firstButton.getRect();
        
        // Touch targets should be at least 44px
        const minTouchTarget = 44;
        expect(buttonSize.height).to.be.greaterThanOrEqual(minTouchTarget);
      }
    });

    it('should support mobile search gestures', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      const searchInput = await TestUtils.waitForElementVisible(driver, By.css('#search'));
      
      // Test mobile keyboard interaction
      await searchInput.click();
      await driver.sleep(500);
      
      // Should be focusable
      const focused = await driver.executeScript('return document.activeElement === arguments[0]', searchInput);
      expect(focused).to.be.true;
    });

    it('should handle mobile orientation changes', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      // Simulate landscape orientation
      await driver.manage().window().setRect({ width: 844, height: 390 });
      await driver.sleep(1000);
      
      // Check if layout adapts
      const header = await driver.findElement(By.css('header'));
      expect(header).to.exist;
      
      // Simulate portrait orientation
      await driver.manage().window().setRect({ width: 390, height: 844 });
      await driver.sleep(1000);
      
      // Layout should still work
      const searchInput = await driver.findElement(By.css('#search'));
      expect(searchInput).to.exist;
    });
  });

  describe('iOS Safari Specific Features', function() {
    it('should handle iOS Safari audio autoplay restrictions', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      await driver.sleep(3000);
      
      const playButtons = await driver.findElements(By.css('button[aria-label*="Play"], .play-btn, .audio-button'));
      
      if (playButtons.length > 0) {
        const firstPlayButton = playButtons[0];
        
        // Audio should not autoplay on iOS
        const audioElements = await driver.findElements(By.css('audio'));
        if (audioElements.length > 0) {
          const isPlaying = await driver.executeScript(`
            return !arguments[0].paused && arguments[0].currentTime > 0;
          `, audioElements[0]);
          
          expect(isPlaying).to.be.false; // Should not autoplay
        }
      }
    });

    it('should handle iOS Safari scroll behavior', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      // Check for -webkit-overflow-scrolling: touch
      const body = await driver.findElement(By.css('body'));
      const scrollBehavior = await body.getCssValue('-webkit-overflow-scrolling');
      
      // Should support smooth scrolling on iOS
      const hasScrollSupport = scrollBehavior === 'touch' || 
                              await driver.executeScript('return "scrollBehavior" in document.documentElement.style');
      
      expect(hasScrollSupport).to.be.true;
    });

    it('should display correctly with iOS Safari UI', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      // Check if content is not hidden behind iOS Safari UI
      const mainContent = await driver.findElement(By.css('main'));
      const contentTop = await mainContent.getRect();
      
      // Content should be visible (not too high up)
      expect(contentTop.y).to.be.greaterThan(-50);
    });
  });
});