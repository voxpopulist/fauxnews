# 🚨 CRITICAL TESTS - Tag Cloud, Clips, Audio, Transcripts

## Quick Test Commands

```bash
# Setup (run once)
cd tests
./setup.sh

# Run the critical tests that check everything you need
npm run test:critical

# Test specific browsers
npm run test:chrome    # Chrome desktop
npm run test:firefox   # Firefox desktop  
npm run test:safari    # Mobile Safari simulation

# Run in headless mode (faster, for CI)
npm run test:headless
```

## What These Tests Verify

### ✅ Tag Cloud Tests
- **Existence**: Tag cloud has 5+ tags
- **Content**: Each tag has text and data-word attribute
- **Functionality**: Clicking tags updates search
- **Mobile**: Touch interaction works on mobile Safari

### ✅ Clips Tests  
- **Quantity**: 3+ audio clips are present
- **Content**: Each clip has substantial transcript text (50+ chars)
- **Audio Elements**: Each clip has audio player component
- **Format**: Audio sources are MP3 (Safari compatible)

### ✅ Audio Playback Tests
- **Players**: Audio elements exist with valid sources
- **Buttons**: Play buttons are present and clickable
- **Touch**: Button size adequate for mobile (40px+)
- **Loading**: Audio ready state indicates loadable content
- **Safari**: MP3 format ensures Safari compatibility

### ✅ Transcript Tests
- **Presence**: Clips have transcript content (100+ chars)
- **Quality**: Text contains common words and punctuation
- **Structure**: Readable sentences with proper formatting
- **Mobile**: Text displays properly on mobile viewports

## Test Results Format

```
✅ Chrome: Tag cloud test passed - 12 tags found
✅ Chrome: Clips test passed - 8 valid clips found  
✅ Chrome: Audio players test passed - 8 valid audio, 8 play buttons
✅ Chrome: Transcripts test passed - 8 cards with transcripts, 2847 total words

✅ Firefox: Tag cloud test passed - 12 tags found
✅ Firefox: Clips test passed - 8 valid clips found
✅ Firefox: Audio players test passed - 8 valid audio, 8 play buttons  
✅ Firefox: Transcripts test passed - 8 cards with transcripts, 2847 total words

✅ Mobile Safari: Tag cloud test passed - 12 tags found
✅ Mobile Safari: Clips test passed - 8 valid clips found
✅ Mobile Safari: Audio players test passed - 8 valid audio, 8 play buttons
✅ Mobile Safari: Transcripts test passed - 8 cards with transcripts, 2847 total words
```

## Troubleshooting

### No Clips Found
```bash
# Check if site is loading properly
TEST_URL=https://www.voxpopulist.com npm run test:critical

# Test against local development
TEST_URL=http://localhost:4321 npm run test:critical
```

### Mobile Safari Issues
```bash
# Run mobile-specific tests with extra debugging
npm run test:mobile

# Take screenshots on failure (saved to screenshots/)
HEADLESS=false npm run test:safari
```

### Audio Not Playing
- Tests verify MP3 format (Safari compatible)
- Checks audio ready state
- Validates play button interaction
- Mobile Safari autoplay restrictions handled

## Files Created/Updated

1. **`tests/critical/core-features.test.js`** - Main test file
2. **Enhanced smoke tests** - Tag cloud, clips, transcript verification  
3. **Enhanced functional tests** - Audio playback testing
4. **Enhanced mobile tests** - Safari-specific checks
5. **Updated package.json** - New test:critical command

## Run Individual Test Categories

```bash
# Just the critical cross-browser tests
node run-tests.js --suite critical --browser chrome
node run-tests.js --suite critical --browser firefox  
node run-tests.js --suite critical --browser chrome --mobile

# With screenshots (disable headless)
HEADLESS=false npm run test:critical

# Verbose output
node run-tests.js --suite critical --verbose
```

This test suite specifically addresses your requirements:
- ✅ Tag cloud exists and works
- ✅ Clips are present and loadable  
- ✅ Audio players function correctly
- ✅ Transcripts display properly
- ✅ All work on mobile Safari, Firefox, and Chrome