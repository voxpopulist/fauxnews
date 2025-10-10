#!/bin/bash

# Development script to build the Astro site with MP3 generation
# This mimics what happens in GitHub Actions

set -e

echo "🎵 Building Clipservatives Audio Showcase Site"
echo "=============================================="

# Get to project root
cd "$(dirname "$(dirname "${BASH_SOURCE[0]}")")"

echo "📁 Project root: $(pwd)"

# Generate MP3s for web playback
echo "🔄 Converting FLAC to MP3..."
./scripts/convert_to_mp3.sh

# Copy MP3s to Astro public directory
echo "📋 Copying MP3s to Astro public directory..."
mkdir -p docs/public
rsync -av --include='*/' --include='*.mp3' --exclude='*' samples/ docs/public/samples/

# Build Astro site
echo "🏗️  Building Astro site..."
cd docs
npm install
npm run build

echo "✅ Build complete!"
echo "🌐 Preview at: http://localhost:4321/clipservatives"
echo "🚀 To start preview server: cd docs && npm run preview"