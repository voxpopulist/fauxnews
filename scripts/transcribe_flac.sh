#!/bin/bash

# Script to transcribe FLAC files using Whisper
# Usage: ./transcribe_flac.sh

set -u  # Treat unset variables as an error

VERBOSE=${VERBOSE:-0}
if [ "$VERBOSE" = "1" ]; then
    set -x
fi

WHISPER_MODEL=${WHISPER_MODEL:-turbo}
WHISPER_LANGUAGE=${WHISPER_LANGUAGE:-English}
WHISPER_VERBOSE=${WHISPER_VERBOSE:-1}
WHISPER_EXTRA_ARGS=${WHISPER_EXTRA_ARGS:-}

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Get the project root directory (parent of scripts)
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
# Input directory path
INPUT_DIR="$PROJECT_ROOT/input"

echo "=== FLAC Transcription Script ==="
echo "Project root: $PROJECT_ROOT"
echo "Input directory: $INPUT_DIR"

# Ensure input directory exists so find does not fail on clean checkouts
if [ ! -d "$INPUT_DIR" ]; then
    echo "Input directory not found, creating: $INPUT_DIR"
    mkdir -p "$INPUT_DIR"
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
    
    whisper_cmd=(whisper "$flac_file" --model "$WHISPER_MODEL" --language "$WHISPER_LANGUAGE" --output_dir="$INPUT_DIR")
    if [ "$WHISPER_VERBOSE" = "1" ]; then
        whisper_cmd+=(--verbose True)
    else
        whisper_cmd+=(--verbose False)
    fi
    if [ -n "$WHISPER_EXTRA_ARGS" ]; then
        whisper_cmd+=($WHISPER_EXTRA_ARGS)
    fi

    echo "Running: ${whisper_cmd[*]}"

    if "${whisper_cmd[@]}"; then
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