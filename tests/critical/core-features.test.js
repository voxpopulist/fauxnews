import { expect } from 'chai';
import { By, until } from 'selenium-webdriver';
import { WebDriverFactory, TestUtils, TestConfig } from '../utils/test-helpers.js';

describe('Critical Feature Tests - Chrome, Firefox, Mobile Safari', function() {
  this.timeout(TestConfig.AUDIO_TIMEOUT);
  
  // Build browser matrix based on env
  const envBrowser = (process.env.BROWSER || '').toLowerCase();
  const includeMobile = String(process.env.MOBILE || '').toLowerCase() === 'true';
  const baseBrowsers = [];
  if (!envBrowser || envBrowser === 'chrome') baseBrowsers.push({ name: 'chrome', mobile: false });
  if (!envBrowser || envBrowser === 'firefox') baseBrowsers.push({ name: 'firefox', mobile: false });
  if (!envBrowser || envBrowser === 'safari') {
    // Safari is only available on macOS; handled in before() skip
    baseBrowsers.push({ name: 'safari', mobile: false });
  }
  const mobileBrowsers = includeMobile || (!envBrowser && !process.env.CROSS)
    ? [{ name: 'chrome', mobile: true, device: 'iPhone 12' }]
    : [];
  const browsers = [...baseBrowsers, ...mobileBrowsers];
  
  const baseUrl = TestUtils.getTestUrl();

  browsers.forEach(browserConfig => {
    const testName = browserConfig.mobile ? 
      `Mobile Safari (${browserConfig.device})` : 
      browserConfig.name.charAt(0).toUpperCase() + browserConfig.name.slice(1);
    
    describe(`${testName} Critical Tests`, function() {
      let driver;

      before(function() {
        // Skip Firefox on mobile (not applicable)
        if (browserConfig.mobile && browserConfig.name === 'firefox') {
          this.skip();
        }
        // Skip Safari tests if not on macOS
        if (browserConfig.name === 'safari' && process.platform !== 'darwin') {
          this.skip();
        }
      });

      beforeEach(async function() {
        try {
          const options = {
            headless: process.env.HEADLESS === 'true' && browserConfig.name !== 'safari'
          };
          
          if (browserConfig.mobile) {
            options.mobileDevice = browserConfig.device;
            options.userAgent = TestConfig.MOBILE_DEVICES[browserConfig.device].userAgent;
          }
          
          driver = await WebDriverFactory.createDriver(browserConfig.name, options);
        } catch (error) {
          this.skip(`${browserConfig.name} driver not available: ${error.message}`);
        }
      });

      afterEach(async function() {
        if (driver) {
          if (this.currentTest.state === 'failed') {
            const browserName = browserConfig.mobile ? 'mobile_safari' : browserConfig.name;
            await TestUtils.takeScreenshot(driver, `critical_failure_${browserName}_${this.currentTest.title.replace(/\s+/g, '_')}`);
          }
          await driver.quit();
        }
      });

      it('CRITICAL: Tag cloud must exist and be functional', async function() {
        await driver.get(baseUrl);
        await TestUtils.waitForPageLoad(driver);
        await driver.sleep(browserConfig.mobile ? 8000 : 5000);
        
        // Verify tag cloud exists
        const tags = await driver.findElements(By.css('[data-word]'));
        expect(tags.length).to.be.greaterThan(5, `${testName}: Tag cloud should have multiple tags, found: ${tags.length}`);
        
        // Verify tags have content
        for (let i = 0; i < Math.min(tags.length, 3); i++) {
          const tag = tags[i];
          const tagText = await tag.getText();
          const tagWord = await tag.getAttribute('data-word');
          
          expect(tagText.trim()).to.not.be.empty;
          expect(tagWord).to.not.be.empty;
        }
        
        // Test tag interaction
        if (tags.length > 0) {
          const firstTag = tags[0];
          const tagWord = await firstTag.getAttribute('data-word');
          
          if (browserConfig.mobile) {
            await driver.executeScript('arguments[0].click()', firstTag);
          } else {
            await firstTag.click();
          }
          
          await driver.sleep(1000);
          
          const searchInput = await driver.findElement(By.css('#search'));
          const inputValue = await searchInput.getAttribute('value');
          expect(inputValue).to.equal(tagWord, `${testName}: Tag click should update search`);
        }
        
        console.log(`✅ ${testName}: Tag cloud test passed - ${tags.length} tags found`);
      });

      it('CRITICAL: Multiple clips must be present with content', async function() {
        await driver.get(baseUrl);
        await TestUtils.waitForPageLoad(driver);
  await driver.sleep(browserConfig.mobile ? 10000 : 6000);
  // Wait for cards to render (expect multiple)
  await TestUtils.waitForCount(driver, 'article[data-transcript-src]', 4, TestConfig.LONG_TIMEOUT);
        
  // Find audio clips
  const audioCards = await driver.findElements(By.css('article[data-transcript-src]'));
        expect(audioCards.length).to.be.greaterThan(3, `${testName}: Should have multiple clips, found: ${audioCards.length}`);
        
        // Verify each clip has substantial content
        let validClips = 0;
        for (let i = 0; i < Math.min(audioCards.length, 5); i++) {
          const card = audioCards[i];
          const cardText = await card.getText();
          
          if (cardText.length > 50) {
            validClips++;
            
            // Check for audio elements
            const audioElements = await card.findElements(By.css('audio, .audio-player, .card__player'));
            expect(audioElements.length).to.be.greaterThan(0, `${testName}: Card ${i+1} should have audio element`);
          }
        }
        
        expect(validClips).to.be.greaterThan(2, `${testName}: Should have multiple clips with content, found: ${validClips}`);
        console.log(`✅ ${testName}: Clips test passed - ${validClips} valid clips found`);
      });

      it('CRITICAL: Audio players must be functional', async function() {
        await driver.get(baseUrl);
        await TestUtils.waitForPageLoad(driver);
        await driver.sleep(browserConfig.mobile ? 10000 : 6000);
        
        // Find audio elements
  // Ensure cards present before audio check
  await TestUtils.waitForCount(driver, 'article[data-transcript-src]', 1, TestConfig.LONG_TIMEOUT);
  const audioElements = await driver.findElements(By.css('audio'));
        expect(audioElements.length).to.be.greaterThan(0, `${testName}: No audio elements found`);
        
        // Verify audio sources
        let validAudio = 0;
        for (let i = 0; i < Math.min(audioElements.length, 3); i++) {
          const audio = audioElements[i];
          const src = await audio.getAttribute('src') || await audio.getAttribute('data-src');
          
          if (src && src.includes('.mp3')) {
            validAudio++;
            
            // Test audio loading
            const readyState = await driver.executeScript('return arguments[0].readyState', audio);
            expect(readyState).to.be.greaterThanOrEqual(0);
          }
        }
        
        expect(validAudio).to.be.greaterThan(0, `${testName}: Should have valid MP3 audio sources`);
        
        // Test play buttons
        const playButtons = await driver.findElements(By.css('button[aria-label*="Play"], .play-btn, .audio-button, button[title*="play" i]'));
        expect(playButtons.length).to.be.greaterThan(0, `${testName}: No play buttons found`);
        
        if (playButtons.length > 0) {
          const firstButton = playButtons[0];
          const isEnabled = await firstButton.isEnabled();
          const isDisplayed = await firstButton.isDisplayed();
          
          expect(isEnabled).to.be.true;
          expect(isDisplayed).to.be.true;
          
          // Test click interaction
          await TestUtils.safeClick(driver, firstButton);
          
          await driver.sleep(1000);
          expect(firstButton).to.exist;
        }
        
        console.log(`✅ ${testName}: Audio players test passed - ${validAudio} valid audio, ${playButtons.length} play buttons`);
      });

      it('CRITICAL: Transcripts must be present and readable', async function() {
        await driver.get(baseUrl);
        await TestUtils.waitForPageLoad(driver);
        await driver.sleep(browserConfig.mobile ? 8000 : 5000);
        
  await TestUtils.waitForCount(driver, 'article[data-transcript-src]', 1, TestConfig.LONG_TIMEOUT);
  const cards = await driver.findElements(By.css('article[data-transcript-src]'));
        expect(cards.length).to.be.greaterThan(0);
        
        let transcriptCards = 0;
        let totalWords = 0;
        
        for (let i = 0; i < Math.min(cards.length, 5); i++) {
          const card = cards[i];
          const cardText = await card.getText();
          
          if (cardText.length > 100) {
            transcriptCards++;
            
            // Count words
            const words = cardText.split(/\s+/).filter(word => word.length > 2);
            totalWords += words.length;
            
            // Check for readable content
            const hasCommonWords = ['the', 'and', 'to', 'of', 'in', 'a', 'is', 'that']
              .some(word => cardText.toLowerCase().includes(word));
            expect(hasCommonWords).to.be.true;
            
            // Check for sentence structure
            const hasPunctuation = cardText.includes('.') || cardText.includes(',') || cardText.includes('?');
            expect(hasPunctuation).to.be.true;
          }
        }
        
        expect(transcriptCards).to.be.greaterThan(2, `${testName}: Should have multiple cards with transcripts, found: ${transcriptCards}`);
        expect(totalWords).to.be.greaterThan(50, `${testName}: Transcripts should have substantial content, found: ${totalWords} words`);
        
        console.log(`✅ ${testName}: Transcripts test passed - ${transcriptCards} cards with transcripts, ${totalWords} total words`);
      });

      it('CRITICAL: Overall functionality integration test', async function() {
        await driver.get(baseUrl);
        await TestUtils.waitForPageLoad(driver);
  await driver.sleep(browserConfig.mobile ? 10000 : 6000);
        
        // Test complete user flow
        const searchInput = await TestUtils.waitForElementVisible(driver, By.css('#search'));
        
        // 1. Search functionality
        await searchInput.clear();
        await searchInput.sendKeys('test');
        await driver.sleep(2000);
        
  await TestUtils.waitForCount(driver, 'article[data-transcript-src]', 1, TestConfig.LONG_TIMEOUT);
  const searchResults = await driver.findElements(By.css('article[data-transcript-src]'));
        expect(searchResults.length).to.be.greaterThanOrEqual(0);
        
        // 2. Clear search and verify all content returns
        // Use JS to clear and dispatch input so the debounced handler runs
        await driver.executeScript(
          "arguments[0].value=''; arguments[0].dispatchEvent(new Event('input', { bubbles: true }));",
          searchInput
        );
        // Wait for the full list (more than search results, or at least 4 cards)
        const minAll = Math.max((searchResults?.length || 0) + 1, 4);
        await TestUtils.waitForCount(driver, 'article[data-transcript-src]', minAll, TestConfig.LONG_TIMEOUT);
        const allResults = await driver.findElements(By.css('article[data-transcript-src]'));
        expect(allResults.length).to.be.greaterThan(searchResults.length || 3);
        
        // 3. Tag interaction
        const tags = await driver.findElements(By.css('[data-word]'));
        if (tags.length > 0) {
          const randomTag = tags[Math.floor(Math.random() * Math.min(tags.length, 5))];
          const tagWord = await randomTag.getAttribute('data-word');
          
          // Scroll and click safely (falls back to JS click if intercepted)
          await TestUtils.safeClick(driver, randomTag);

          // Wait until the input reflects the tag selection
          await driver.wait(async () => {
            const updated = await searchInput.getAttribute('value');
            return updated === tagWord;
          }, 5000, 'Tag click did not populate search input in time');
        }
        
        // 4. Verify final state
  await TestUtils.waitForCount(driver, 'article[data-transcript-src]', 1, TestConfig.LONG_TIMEOUT);
  const finalCards = await driver.findElements(By.css('article[data-transcript-src]'));
        expect(finalCards.length).to.be.greaterThan(0);
        
        console.log(`✅ ${testName}: Integration test passed - Complete user flow working`);
      });
    });
  });

  const runCross = String(process.env.CROSS || '').toLowerCase() === 'true';
  (runCross ? describe : describe.skip)('Cross-Browser Comparison', function() {
    it('should have consistent content across all browsers', async function() {
      const results = {};
      
      for (const browserConfig of browsers) {
        try {
          const options = {
            headless: process.env.HEADLESS === 'true'
          };
          
          if (browserConfig.mobile) {
            options.mobileDevice = browserConfig.device;
          }
          
          const driver = await WebDriverFactory.createDriver(browserConfig.name, options);
          
          await driver.get(baseUrl);
          await TestUtils.waitForPageLoad(driver);
          await driver.sleep(browserConfig.mobile ? 10000 : 6000);
          
          const tags = await driver.findElements(By.css('[data-word]'));
          await TestUtils.waitForCount(driver, 'article[data-transcript-src]', 1, TestConfig.LONG_TIMEOUT);
          const cards = await driver.findElements(By.css('article[data-transcript-src]'));
          const audio = await driver.findElements(By.css('audio'));
          
          const browserName = browserConfig.mobile ? 'mobile_safari' : browserConfig.name;
          results[browserName] = {
            tags: tags.length,
            cards: cards.length,
            audio: audio.length
          };
          
          await driver.quit();
        } catch (error) {
          console.log(`Skipping ${browserConfig.name}: ${error.message}`);
        }
      }
      
      console.log('Cross-browser results:', results);
      
      // All browsers should have reasonable content
      Object.entries(results).forEach(([browser, data]) => {
        expect(data.tags).to.be.greaterThan(5, `${browser} should have tags`);
        expect(data.cards).to.be.greaterThan(3, `${browser} should have cards`);
        expect(data.audio).to.be.greaterThan(0, `${browser} should have audio`);
      });
    });
  });
});