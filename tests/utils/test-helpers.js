import { Builder, By, until, Key } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import firefox from 'selenium-webdriver/firefox.js';
import safari from 'selenium-webdriver/safari.js';
import edge from 'selenium-webdriver/edge.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

export class TestConfig {
  static PRODUCTION_URL = 'https://www.voxpopulist.com';
  static LOCAL_URL = 'http://localhost:4321';
  static STAGING_URL = process.env.STAGING_URL || '';
  
  static DEFAULT_TIMEOUT = 10000;
  static LONG_TIMEOUT = 30000;
  static AUDIO_TIMEOUT = 60000;
  
  static DESKTOP_RESOLUTIONS = [
    { width: 1920, height: 1080, name: 'Full HD' },
    { width: 1440, height: 900, name: 'MacBook Pro' },
    { width: 1366, height: 768, name: 'Common Laptop' },
    { width: 2560, height: 1440, name: '2K Display' },
  ];
  
  static TABLET_RESOLUTIONS = [
    { width: 768, height: 1024, name: 'iPad Portrait' },
    { width: 1024, height: 768, name: 'iPad Landscape' },
    { width: 820, height: 1180, name: 'iPad Air' },
  ];
  
  static MOBILE_RESOLUTIONS = [
    { width: 375, height: 667, name: 'iPhone SE' },
    { width: 414, height: 896, name: 'iPhone 11 Pro Max' },
    { width: 390, height: 844, name: 'iPhone 12/13' },
    { width: 360, height: 640, name: 'Galaxy S5' },
    { width: 412, height: 915, name: 'Pixel 5' },
  ];

  static MOBILE_DEVICES = {
    'iPhone 12': {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
      viewport: { width: 390, height: 844 }
    },
    'iPhone SE': {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
      viewport: { width: 375, height: 667 }
    },
    'Galaxy S20': {
      userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
      viewport: { width: 360, height: 800 }
    },
    'iPad': {
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
      viewport: { width: 768, height: 1024 }
    }
  };
}

export class WebDriverFactory {
  static async createDriver(browserName = 'chrome', options = {}) {
    const {
      headless = process.env.HEADLESS === 'true',
      mobileDevice = null,
      resolution = null,
      userAgent = null
    } = options;

    let driver;
    
    switch (browserName.toLowerCase()) {
      case 'chrome':
        driver = await this.createChromeDriver(headless, mobileDevice, resolution, userAgent);
        break;
      case 'firefox':
        driver = await this.createFirefoxDriver(headless, resolution);
        break;
      case 'safari':
        driver = await this.createSafariDriver(resolution);
        break;
      case 'edge':
        driver = await this.createEdgeDriver(headless, resolution);
        break;
      default:
        throw new Error(`Unsupported browser: ${browserName}`);
    }

    // Set implicit wait
    await driver.manage().setTimeouts({ implicit: TestConfig.DEFAULT_TIMEOUT });
    
    return driver;
  }

  static async createChromeDriver(headless = false, mobileDevice = null, resolution = null, userAgent = null) {
    const options = new chrome.Options();
    
    if (headless) {
      options.addArguments('--headless=new');
    }
    
    // Standard Chrome arguments for testing
    options.addArguments(
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--autoplay-policy=no-user-gesture-required',
      '--disable-background-media-suspend'
    );

    // Mobile emulation (use device metrics + UA for broader compatibility)
    if (mobileDevice && TestConfig.MOBILE_DEVICES[mobileDevice]) {
      const device = TestConfig.MOBILE_DEVICES[mobileDevice];
      options.setMobileEmulation({
        deviceMetrics: { width: device.viewport.width, height: device.viewport.height, pixelRatio: 3 },
        userAgent: userAgent || device.userAgent
      });
    }

    // Custom user agent
    if (userAgent) {
      options.addArguments(`--user-agent=${userAgent}`);
    }

    // Performance and privacy settings
    const prefs = {
      'profile.default_content_setting_values.notifications': 2,
      'profile.default_content_settings.popups': 0,
      'profile.managed_default_content_settings.images': 2 // Keep images disabled per preference
    };
    options.setUserPreferences(prefs);

    const driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    // Set window size if specified
    if (resolution) {
      await driver.manage().window().setRect({
        width: resolution.width,
        height: resolution.height
      });
    } else {
      await driver.manage().window().maximize();
    }

    return driver;
  }

  static async createFirefoxDriver(headless = false, resolution = null) {
    const options = new firefox.Options();
    
    if (headless) {
      options.addArguments('--headless');
    }
    
    options.addArguments('--no-sandbox', '--disable-gpu');
    
    // Audio autoplay preferences
    options.setPreference('media.autoplay.default', 0);
    options.setPreference('media.autoplay.blocking_policy', 0);
    options.setPreference('permissions.default.image', 2); // Disable images

    const driver = await new Builder()
      .forBrowser('firefox')
      .setFirefoxOptions(options)
      .build();

    if (resolution) {
      await driver.manage().window().setRect({
        width: resolution.width,
        height: resolution.height
      });
    } else {
      await driver.manage().window().maximize();
    }

    return driver;
  }

  static async createSafariDriver(resolution = null) {
    if (process.platform !== 'darwin') {
      throw new Error('Safari is only available on macOS');
    }

    const driver = await new Builder()
      .forBrowser('safari')
      .build();

    if (resolution) {
      await driver.manage().window().setRect({
        width: resolution.width,
        height: resolution.height
      });
    } else {
      await driver.manage().window().maximize();
    }

    return driver;
  }

  static async createEdgeDriver(headless = false, resolution = null) {
    const options = new edge.Options();
    
    if (headless) {
      options.addArguments('--headless=new');
    }
    
    options.addArguments(
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-extensions'
    );

    const driver = await new Builder()
      .forBrowser('MicrosoftEdge')
      .setEdgeOptions(options)
      .build();

    if (resolution) {
      await driver.manage().window().setRect({
        width: resolution.width,
        height: resolution.height
      });
    } else {
      await driver.manage().window().maximize();
    }

    return driver;
  }
}

export class TestUtils {
  static async waitForCount(driver, selector, min = 1, timeout = TestConfig.LONG_TIMEOUT) {
    await driver.wait(async () => {
      const count = await driver.executeScript(
        'return document.querySelectorAll(arguments[0]).length;', selector
      );
      return count >= min;
    }, timeout, `Timed out waiting for ${min}+ elements matching ${selector}`);
  }

  static async safeClick(driver, element) {
    try {
      await this.scrollToElement(driver, element);
      await element.click();
    } catch (e) {
      // Fallback to JS click
      await driver.executeScript('arguments[0].click()', element);
    }
  }
  static async takeScreenshot(driver, filename, screenshotsDir = null) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const dir = screenshotsDir || path.join(__dirname, 'screenshots');
      await fs.ensureDir(dir);
      
      const screenshot = await driver.takeScreenshot();
      const filepath = path.join(dir, `${filename}_${timestamp}.png`);
      await fs.writeFile(filepath, screenshot, 'base64');
      
      console.log(`Screenshot saved: ${filepath}`);
      return filepath;
    } catch (error) {
      console.error('Failed to take screenshot:', error);
    }
  }

  static async waitForElement(driver, locator, timeout = TestConfig.DEFAULT_TIMEOUT) {
    return await driver.wait(until.elementLocated(locator), timeout);
  }

  static async waitForElementVisible(driver, locator, timeout = TestConfig.DEFAULT_TIMEOUT) {
    const element = await this.waitForElement(driver, locator, timeout);
    await driver.wait(until.elementIsVisible(element), timeout);
    return element;
  }

  static async waitForElementClickable(driver, locator, timeout = TestConfig.DEFAULT_TIMEOUT) {
    const element = await this.waitForElement(driver, locator, timeout);
    await driver.wait(until.elementIsEnabled(element), timeout);
    return element;
  }

  static async scrollToElement(driver, element) {
    await driver.executeScript('arguments[0].scrollIntoView({behavior: "smooth", block: "center"});', element);
    await driver.sleep(500); // Wait for scroll animation
  }

  static async waitForPageLoad(driver, timeout = TestConfig.LONG_TIMEOUT) {
    await driver.wait(async () => {
      const readyState = await driver.executeScript('return document.readyState');
      return readyState === 'complete';
    }, timeout);
  }

  static async waitForAjax(driver, timeout = TestConfig.DEFAULT_TIMEOUT) {
    await driver.wait(async () => {
      const activeRequests = await driver.executeScript(`
        return window.jQuery ? jQuery.active : 0;
      `);
      return activeRequests === 0;
    }, timeout);
  }

  static async getNetworkMetrics(driver) {
    return await driver.executeScript(`
      return {
        loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
        domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
        firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
      };
    `);
  }

  static async checkConsoleErrors(driver) {
    const logs = await driver.manage().logs().get('browser');
    const errors = logs.filter(log => log.level.name === 'SEVERE');
    return errors;
  }

  static async checkAccessibility(driver, element = null) {
    // Inject axe-core if not already present
    await driver.executeScript(`
      if (typeof axe === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/axe-core@4.8.2/axe.min.js';
        document.head.appendChild(script);
        return new Promise(resolve => {
          script.onload = resolve;
        });
      }
    `);

    // Wait for axe to load
    await driver.wait(async () => {
      return await driver.executeScript('return typeof axe !== "undefined"');
    }, 5000);

    // Run accessibility scan
    const results = await driver.executeScript(`
      return new Promise((resolve) => {
        axe.run(arguments[0] || document, (err, results) => {
          resolve(results);
        });
      });
    `, element);

    return results;
  }

  static getTestUrl(path = '', baseUrl = null) {
    const base = baseUrl || process.env.TEST_URL || TestConfig.PRODUCTION_URL;
    return path ? `${base}${path.startsWith('/') ? '' : '/'}${path}` : base;
  }

  static async retryOperation(operation, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

export default {
  TestConfig,
  WebDriverFactory,
  TestUtils
};