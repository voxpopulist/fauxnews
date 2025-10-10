#!/bin/bash

# Script to convert FLAC files to MP3 for web playback
# This should be run after the organize_files.sh script

set -uo pipefail

VERBOSE=${VERBOSE:-0}
if [ "$VERBOSE" = "1" ]; then
    set -x
fi

FFMPEG_LOGLEVEL=${FFMPEG_LOGLEVEL:-info}
FFMPEG_HIDE_BANNER=${FFMPEG_HIDE_BANNER:-0}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SAMPLES_DIR="$PROJECT_ROOT/samples"

print_status "Converting FLAC files to MP3 for web playback..."
print_status "Samples directory: $SAMPLES_DIR"

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    print_error "ffmpeg is required but not installed. Please install it first."
    exit 1
fi

if [ ! -d "$SAMPLES_DIR" ]; then
    print_error "Samples directory does not exist: $SAMPLES_DIR"
    exit 1
fi

# Find all FLAC files in the samples directory
FLAC_FILES=($(find "$SAMPLES_DIR" -name "*.flac" -type f))

if [ ${#FLAC_FILES[@]} -eq 0 ]; then
    print_warning "No FLAC files found in $SAMPLES_DIR"
    exit 0
fi

print_status "Found ${#FLAC_FILES[@]} FLAC files to convert"

SUCCESS_COUNT=0
SKIP_COUNT=0
ERROR_COUNT=0

for flac_file in "${FLAC_FILES[@]}"; do
    # Generate MP3 filename
    mp3_file="${flac_file%.flac}.mp3"
    
    # Check if MP3 already exists
    if [ -f "$mp3_file" ]; then
        print_status "Skipping $(basename "$flac_file") - MP3 already exists"
        ((SKIP_COUNT++))
        continue
    fi
    
    print_status "Converting $(basename "$flac_file")..."

    ffmpeg_cmd=(ffmpeg -loglevel "$FFMPEG_LOGLEVEL")
    if [ "$FFMPEG_HIDE_BANNER" = "1" ]; then
        ffmpeg_cmd+=(-hide_banner)
    fi
    ffmpeg_cmd+=(-i "$flac_file" -codec:a libmp3lame -b:a 64k -ac 1 -ar 22050 -y "$mp3_file")

    print_status "Running: ${ffmpeg_cmd[*]}"

    if "${ffmpeg_cmd[@]}"; then
        print_success "Converted: $(basename "$flac_file") → $(basename "$mp3_file")"
        ((SUCCESS_COUNT++))
    else
        print_error "Failed to convert: $(basename "$flac_file")"
        ((ERROR_COUNT++))
    fi
done

echo
print_status "Conversion Summary:"
print_status "Successfully converted: $SUCCESS_COUNT files"
print_status "Skipped (already exist): $SKIP_COUNT files"
print_status "Errors: $ERROR_COUNT files"

if [ $ERROR_COUNT -eq 0 ]; then
    print_success "All conversions completed successfully!"
else
    print_warning "Some files failed to convert. Check the output above for details."
    exit 1
fi