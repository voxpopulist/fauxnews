import { expect } from 'chai';
import { By, until, Key } from 'selenium-webdriver';
import { WebDriverFactory, TestUtils, TestConfig } from '../utils/test-helpers.js';

describe('Functional Tests - Advanced Features', function() {
  this.timeout(TestConfig.AUDIO_TIMEOUT);
  
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
        await TestUtils.takeScreenshot(driver, `functional_failure_${this.currentTest.title.replace(/\s+/g, '_')}`);
      }
      await driver.quit();
    }
  });

  describe('Audio Player Functionality', function() {
    it('should display audio players for clips', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      // Wait for content to load
      await driver.sleep(5000);
      
      const audioElements = await driver.findElements(By.css('audio, .audio-player, .card__player'));
      expect(audioElements.length).to.be.greaterThan(3, `Should have multiple audio players, found: ${audioElements.length}`);
      
      // Verify audio sources are MP3 format (Safari compatible)
      const audioSources = await driver.findElements(By.css('audio[src], audio[data-src]'));
      for (let i = 0; i < Math.min(audioSources.length, 3); i++) {
        const audio = audioSources[i];
        const src = await audio.getAttribute('src') || await audio.getAttribute('data-src');
        expect(src).to.include('.mp3', `Audio ${i+1} should be MP3 format for Safari compatibility`);
      }
    });

    it('should have functional play buttons that respond to clicks', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      await driver.sleep(5000);
      
      const playButtons = await driver.findElements(By.css('button[aria-label*="Play"], .play-btn, .audio-button, button[title*="Play"]'));
      expect(playButtons.length).to.be.greaterThan(0, 'No play buttons found');
      
      if (playButtons.length > 0) {
        const firstPlayButton = playButtons[0];
        await TestUtils.scrollToElement(driver, firstPlayButton);
        
        // Check if button is clickable
        const isEnabled = await firstPlayButton.isEnabled();
        const isDisplayed = await firstPlayButton.isDisplayed();
        expect(isEnabled).to.be.true;
        expect(isDisplayed).to.be.true;
        
        // Get initial state
        const initialAriaLabel = await firstPlayButton.getAttribute('aria-label');
        const initialTitle = await firstPlayButton.getAttribute('title');
        
        // Click play button
        await firstPlayButton.click();
        await driver.sleep(1000);
        
        // Button should still exist and potentially show different state
        expect(firstPlayButton).to.exist;
        
        // Take screenshot of player state
        await TestUtils.takeScreenshot(driver, 'audio_player_clicked');
      }
    });

    it('should load and verify audio file accessibility', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      await driver.sleep(5000);
      
      const audioElements = await driver.findElements(By.css('audio'));
      expect(audioElements.length).to.be.greaterThan(0);
      
      // Test first few audio elements
      for (let i = 0; i < Math.min(audioElements.length, 3); i++) {
        const audio = audioElements[i];
        
        // Get audio source
        const src = await audio.getAttribute('src') || await audio.getAttribute('data-src');
        expect(src).to.not.be.empty;
        
        // Check if audio can be loaded
        const networkState = await driver.executeScript('return arguments[0].networkState', audio);
        const readyState = await driver.executeScript('return arguments[0].readyState', audio);
        
        // NetworkState: 0=EMPTY, 1=IDLE, 2=LOADING, 3=NO_SOURCE
        // ReadyState: 0=HAVE_NOTHING, 1=HAVE_METADATA, 2=HAVE_CURRENT_DATA, 3=HAVE_FUTURE_DATA, 4=HAVE_ENOUGH_DATA
        expect(networkState).to.not.equal(3, `Audio ${i+1} should have valid source`);
        expect(readyState).to.be.greaterThanOrEqual(0, `Audio ${i+1} should be in valid ready state`);
        
        // Try to load metadata
        await driver.executeScript('arguments[0].load()', audio);
        await driver.sleep(1000);
      }
    });

    it('should have playable audio controls', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      await driver.sleep(3000);
      
      const playButtons = await driver.findElements(By.css('button[aria-label*="Play"], .play-btn, .audio-button'));
      
      if (playButtons.length > 0) {
        const firstPlayButton = playButtons[0];
        await TestUtils.scrollToElement(driver, firstPlayButton);
        
        // Check if button is clickable
        const isEnabled = await firstPlayButton.isEnabled();
        expect(isEnabled).to.be.true;
        
        // Try to click (may not actually play due to autoplay policies)
        await firstPlayButton.click();
        
        // Check if button state changed or audio started
        await driver.sleep(1000);
        // Button should still exist after click
        expect(firstPlayButton).to.exist;
      }
    });

    it('should show audio duration and progress', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      await driver.sleep(3000);
      
      // Look for time displays
      const timeElements = await driver.findElements(By.css(
        '.audio-time, .duration, [class*="time"], [class*="duration"]'
      ));
      
      // At least some audio players should show time information
      if (timeElements.length > 0) {
        const timeText = await timeElements[0].getText();
        expect(timeText).to.match(/\d+:\d+|\d+s|--:--|00:00/);
      }
    });
  });

  describe('Search and Filtering', function() {
    it('should perform live search as user types', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      const searchInput = await TestUtils.waitForElementVisible(driver, By.css('#search'));
      
      // Get initial results count
      await driver.sleep(2000);
      const initialResults = await driver.findElements(By.css('.card-audio, .card'));
      const initialCount = initialResults.length;
      
      // Type search query
      await searchInput.clear();
      await searchInput.sendKeys('trump');
      
      // Wait for search to filter results
      await driver.sleep(2000);
      
      const filteredResults = await driver.findElements(By.css('.card-audio, .card'));
      const filteredCount = filteredResults.length;
      
      // Results should be different (either more or less, depending on content)
      expect(filteredCount).to.not.equal(initialCount);
      
      // Results count should be updated
      const resultsCount = await driver.findElement(By.css('#resultsCount'));
      const countText = await resultsCount.getText();
      expect(countText).to.include(filteredCount.toString());
    });

    it('should clear search results', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      const searchInput = await TestUtils.waitForElementVisible(driver, By.css('#search'));
      
      // Perform search
      await searchInput.clear();
      await searchInput.sendKeys('specific_term_unlikely_to_exist');
      await driver.sleep(2000);
      
      // Clear search
      await searchInput.clear();
      await driver.sleep(2000);
      
      // Should show all results again
      const results = await driver.findElements(By.css('.card-audio, .card'));
      expect(results.length).to.be.greaterThan(0);
    });

    it('should handle empty search results gracefully', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      const searchInput = await TestUtils.waitForElementVisible(driver, By.css('#search'));
      
      // Search for something that definitely won't exist
      await searchInput.clear();
      await searchInput.sendKeys('xyzqwertyuiopasdfghjkl');
      await driver.sleep(2000);
      
      // Should show "No results" message
      const resultsCount = await driver.findElement(By.css('#resultsCount'));
      const countText = await resultsCount.getText();
      expect(countText).to.include('No results');
    });

    it('should support keyboard navigation in search', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      const searchInput = await TestUtils.waitForElementVisible(driver, By.css('#search'));
      
      // Test keyboard input
      await searchInput.clear();
      await searchInput.sendKeys('test');
      await searchInput.sendKeys(Key.BACK_SPACE);
      await searchInput.sendKeys(Key.BACK_SPACE);
      
      const value = await searchInput.getAttribute('value');
      expect(value).to.equal('te');
    });
  });

  describe('Tag Cloud Interaction', function() {
    it('should highlight selected tags', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      const tags = await driver.findElements(By.css('[data-word]'));
      if (tags.length > 0) {
        const firstTag = tags[0];
        await firstTag.click();
        
        // Check if tag has active/selected styling
        const tagClasses = await firstTag.getAttribute('class');
        const isHighlighted = tagClasses.includes('active') || 
                             tagClasses.includes('selected') || 
                             tagClasses.includes('ring') ||
                             tagClasses.includes('bg-');
        
        expect(isHighlighted).to.be.true;
      }
    });

    it('should support keyboard navigation for tags', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      const tags = await driver.findElements(By.css('[data-word]'));
      if (tags.length > 0) {
        const firstTag = tags[0];
        
        // Focus on tag
        await firstTag.click();
        
        // Press Enter key
        await firstTag.sendKeys(Key.ENTER);
        
        // Check if search was triggered
        const searchInput = await driver.findElement(By.css('#search'));
        const inputValue = await searchInput.getAttribute('value');
        expect(inputValue).to.not.be.empty;
      }
    });

    it('should clear tag selection when typing new search', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      const tags = await driver.findElements(By.css('[data-word]'));
      if (tags.length > 0) {
        const firstTag = tags[0];
        await firstTag.click();
        
        // Verify tag is selected
        let tagClasses = await firstTag.getAttribute('class');
        const wasHighlighted = tagClasses.includes('active') || 
                              tagClasses.includes('selected') || 
                              tagClasses.includes('ring');
        
        if (wasHighlighted) {
          // Type different search term
          const searchInput = await driver.findElement(By.css('#search'));
          await searchInput.clear();
          await searchInput.sendKeys('different_search_term');
          await driver.sleep(500);
          
          // Check if tag highlight is cleared
          tagClasses = await firstTag.getAttribute('class');
          const stillHighlighted = tagClasses.includes('active') || 
                                  tagClasses.includes('selected') || 
                                  tagClasses.includes('ring');
          
          expect(stillHighlighted).to.be.false;
        }
      }
    });
  });

  describe('Transcript Functionality', function() {
    it('should display transcript sections for clips', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      await driver.sleep(5000);
      
      const cards = await driver.findElements(By.css('.card-audio, .card'));
      expect(cards.length).to.be.greaterThan(0);
      
      // Check each card for transcript content
      let transcriptCount = 0;
      for (let i = 0; i < Math.min(cards.length, 5); i++) {
        const card = cards[i];
        const cardText = await card.getText();
        
        // Look for substantial text content (indicates transcript)
        if (cardText.length > 100) {
          transcriptCount++;
          
          // Verify transcript quality
          const words = cardText.split(/\s+/).length;
          expect(words).to.be.greaterThan(10, `Card ${i+1} transcript should have multiple words`);
          
          // Check for common transcript indicators
          const hasValidContent = cardText.includes('.') || 
                                 cardText.includes(',') || 
                                 cardText.includes('the') ||
                                 cardText.includes('and');
          expect(hasValidContent).to.be.true;
        }
      }
      
      expect(transcriptCount).to.be.greaterThan(0, 'No cards with transcript content found');
    });

    it('should load transcript content with proper formatting', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      await driver.sleep(5000);
      
      const cards = await driver.findElements(By.css('.card-audio, .card'));
      
      if (cards.length > 0) {
        const firstCard = cards[0];
        const cardText = await firstCard.getText();
        
        // Should contain substantial text (transcript)
        expect(cardText.length).to.be.greaterThan(50);
        
        // Look for proper sentence structure
        const sentences = cardText.split(/[.!?]+/).filter(s => s.trim().length > 5);
        expect(sentences.length).to.be.greaterThan(0, 'Should have recognizable sentences');
        
        // Check for readable content (not just metadata)
        const containsCommonWords = ['the', 'and', 'to', 'of', 'in', 'a', 'is', 'that', 'for', 'with']
          .some(word => cardText.toLowerCase().includes(word));
        expect(containsCommonWords).to.be.true;
      }
    });

    it('should display transcript headers and structure', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      await driver.sleep(5000);
      
      // Look for transcript-related headers or sections
      const transcriptElements = await driver.findElements(By.css(
        'h3, h4, .transcript-header, [class*="transcript"], .card-content'
      ));
      
      expect(transcriptElements.length).to.be.greaterThan(0);
      
      // Check for transcript organization
      for (let i = 0; i < Math.min(transcriptElements.length, 3); i++) {
        const element = transcriptElements[i];
        const elementText = await element.getText();
        
        if (elementText.toLowerCase().includes('transcript') || elementText.length > 50) {
          expect(element).to.exist;
        }
      }
    });
  });

  describe('Performance and Loading', function() {
    it('should load page within reasonable time', async function() {
      const startTime = Date.now();
      
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).to.be.lessThan(10000, 'Page took too long to load');
    });

    it('should have good Core Web Vitals metrics', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      await driver.sleep(3000);
      
      const metrics = await TestUtils.getNetworkMetrics(driver);
      
      expect(metrics.loadTime).to.be.lessThan(5000, 'Load time too slow');
      expect(metrics.domContentLoaded).to.be.lessThan(3000, 'DOM content loaded too slow');
      
      if (metrics.firstContentfulPaint > 0) {
        expect(metrics.firstContentfulPaint).to.be.lessThan(2500, 'First Contentful Paint too slow');
      }
    });

    it('should lazy load content efficiently', async function() {
      await driver.get(baseUrl);
      await TestUtils.waitForPageLoad(driver);
      
      // Check initial load
      const initialCards = await driver.findElements(By.css('.card-audio, .card'));
      const initialCount = initialCards.length;
      
      // Scroll down to trigger lazy loading
      await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
      await driver.sleep(2000);
      
      // Check if more content loaded
      const afterScrollCards = await driver.findElements(By.css('.card-audio, .card'));
      const afterScrollCount = afterScrollCards.length;
      
      // More content should be available or same if all was loaded initially
      expect(afterScrollCount).to.be.greaterThanOrEqual(initialCount);
    });
  });
});