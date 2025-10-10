#!/bin/bash

# Script to transcribe FLAC files using Whisper
# Usage: ./transcribe_flac.sh

set -e  # Exit on any error

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Get the project root directory (parent of scripts)
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
# Input directory path
INPUT_DIR="$PROJECT_ROOT/input"

echo "=== FLAC Transcription Script ==="
echo "Project root: $PROJECT_ROOT"
echo "Input directory: $INPUT_DIR"

# Check if input directory exists
if [ ! -d "$INPUT_DIR" ]; then
    echo "Error: Input directory does not exist: $INPUT_DIR"
    exit 1
fi

# Check if whisper is installed
if ! command -v whisper &> /dev/null; then
    echo "Error: whisper command not found. Please install it with:"
    echo "pip install -U openai-whisper"
    exit 1
fi

# Find all FLAC files in the input directory (including subdirectories)
echo "Searching for FLAC files in: $INPUT_DIR"
FLAC_FILES=($(find "$INPUT_DIR" -name "*.flac" -type f))

if [ ${#FLAC_FILES[@]} -eq 0 ]; then
    echo "No FLAC files found in $INPUT_DIR"
    exit 0
fi

echo "Found ${#FLAC_FILES[@]} FLAC file(s) to process:"
for file in "${FLAC_FILES[@]}"; do
    echo "  - $(basename "$file")"
done

echo ""
echo "Starting transcription process..."

# Process each FLAC file
SUCCESS_COUNT=0
FAIL_COUNT=0

for flac_file in "${FLAC_FILES[@]}"; do
    echo ""
    echo "Processing: $(basename "$flac_file")"
    echo "----------------------------------------"
    
    if whisper "$flac_file" --model turbo --language English --output_dir="$INPUT_DIR"; then
        echo "✓ Successfully transcribed: $(basename "$flac_file")"
        ((SUCCESS_COUNT++))
    else
        echo "✗ Failed to transcribe: $(basename "$flac_file")"
        ((FAIL_COUNT++))
    fi
done

echo ""
echo "=== Transcription Summary ==="
echo "Successfully processed: $SUCCESS_COUNT files"
echo "Failed to process: $FAIL_COUNT files"
echo "Total files: ${#FLAC_FILES[@]}"

if [ $FAIL_COUNT -eq 0 ]; then
    echo "All files processed successfully!"
else
    echo "Some files failed to process. Check the output above for details."
    exit 1
fi