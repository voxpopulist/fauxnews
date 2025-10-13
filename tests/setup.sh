#!/bin/bash

# Setup script for E2E test environment

echo "🧪 Setting up Faux News E2E Test Environment..."

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ is required (current: $(node -v))"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"

# Create directories
echo "📁 Creating test directories..."
mkdir -p screenshots reports

# Check browser availability
echo "🌐 Checking browser availability..."

# Chrome
if command -v google-chrome &> /dev/null || command -v chromium-browser &> /dev/null || command -v "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" &> /dev/null; then
    echo "✅ Chrome detected"
    CHROME_AVAILABLE=true
else
    echo "⚠️  Chrome not found"
    CHROME_AVAILABLE=false
fi

# Firefox
if command -v firefox &> /dev/null || command -v "/Applications/Firefox.app/Contents/MacOS/firefox" &> /dev/null; then
    echo "✅ Firefox detected"
    FIREFOX_AVAILABLE=true
else
    echo "⚠️  Firefox not found"
    FIREFOX_AVAILABLE=false
fi

# Edge (on macOS and Windows)
if command -v msedge &> /dev/null || command -v "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" &> /dev/null; then
    echo "✅ Edge detected"
    EDGE_AVAILABLE=true
else
    echo "⚠️  Edge not found"
    EDGE_AVAILABLE=false
fi

# Safari (macOS only)
if [[ "$OSTYPE" == "darwin"* ]]; then
    if command -v "/Applications/Safari.app/Contents/MacOS/Safari" &> /dev/null; then
        echo "✅ Safari detected"
        SAFARI_AVAILABLE=true
    else
        echo "⚠️  Safari not found"
        SAFARI_AVAILABLE=false
    fi
else
    echo "ℹ️  Safari not available (macOS only)"
    SAFARI_AVAILABLE=false
fi

# Check if at least one browser is available
if [[ "$CHROME_AVAILABLE" == false && "$FIREFOX_AVAILABLE" == false && "$EDGE_AVAILABLE" == false && "$SAFARI_AVAILABLE" == false ]]; then
    echo "❌ No supported browsers found. Please install Chrome, Firefox, or Edge"
    exit 1
fi

# Run a quick smoke test
echo "🚀 Running quick smoke test..."
npm run test:smoke -- --timeout 30000

if [ $? -eq 0 ]; then
    echo "✅ Smoke test passed!"
else
    echo "⚠️  Smoke test failed, but setup is complete"
    echo "   This might be due to network issues or site availability"
fi

# Display usage information
echo ""
echo "🎉 Setup complete!"
echo ""
echo "Available test commands:"
echo "  npm test                 # Run smoke tests"
echo "  npm run test:functional  # Run functional tests"
echo "  npm run test:mobile      # Run mobile tests"
echo "  npm run test:accessibility # Run accessibility tests"
echo "  npm run test:performance # Run performance tests"
echo "  npm run test:headless    # Run in headless mode"
echo ""
echo "Custom test runner:"
echo "  node run-tests.js --suite smoke --browser chrome --headless"
echo "  node run-tests.js --suite functional --url http://localhost:4321"
echo ""
echo "Available browsers for testing:"
if [ "$CHROME_AVAILABLE" == true ]; then echo "  ✅ Chrome"; fi
if [ "$FIREFOX_AVAILABLE" == true ]; then echo "  ✅ Firefox"; fi
if [ "$EDGE_AVAILABLE" == true ]; then echo "  ✅ Edge"; fi
if [ "$SAFARI_AVAILABLE" == true ]; then echo "  ✅ Safari"; fi
echo ""
echo "For more information, see README.md"