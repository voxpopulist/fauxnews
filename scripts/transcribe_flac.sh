#!/bin/bash

# Script to transcribe FLAC files using OpenAI's Audio Transcriptions API
# Usage: ./transcribe_flac.sh [optional_input_dir]

set -u  # Treat unset variables as an error

VERBOSE=${VERBOSE:-0}
if [ "$VERBOSE" = "1" ]; then
    set -x
fi

OPENAI_API_URL=${OPENAI_API_URL:-https://api.openai.com/v1/audio/transcriptions}
OPENAI_MODEL=${OPENAI_MODEL:-whisper-1}
OPENAI_API_KEY=${OPENAI_API_KEY:-}
OPENAI_TIMEOUT=${OPENAI_TIMEOUT:-120}
RETRY_MAX=${RETRY_MAX:-3}
RETRY_DELAY=${RETRY_DELAY:-3}

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Get the project root directory (parent of scripts)
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
# Input directory path (allow override via first arg)
INPUT_DIR="${1:-$PROJECT_ROOT/input}"
# Optional separate output directory (defaults to INPUT_DIR)
OUTPUT_DIR="${OUTPUT_DIR:-$INPUT_DIR}"

echo "=== FLAC Transcription Script ==="

# Parallel/concurrent transcription support
CONCURRENCY=${CONCURRENCY:-4}
MAX_FILES=${MAX_FILES:-0}

echo "Using concurrency: $CONCURRENCY"

SUCCESS_COUNT=0
FAIL_COUNT=0
TMPDIR=$(mktemp -d)
SUMMARY_FILE="$TMPDIR/summary.txt"
touch "$SUMMARY_FILE"

# Function to transcribe a single file (with retries)
transcribe_one() {
    flac_file="$1"
    OUTPUT_DIR="$2"
    base_name="$(basename "$flac_file" .flac)"
    out_vtt="$OUTPUT_DIR/${base_name}.vtt"
    attempt=1
    while [ $attempt -le $RETRY_MAX ]; do
        echo "Attempt $attempt/$RETRY_MAX: Transcribing $(basename "$flac_file") via OpenAI → VTT…"
        if curl -sS --fail --max-time "$OPENAI_TIMEOUT" \
            -H "Authorization: Bearer $OPENAI_API_KEY" \
            -H "Content-Type: multipart/form-data" \
            -F "file=@$flac_file" \
            -F "model=$OPENAI_MODEL" \
            -F "response_format=vtt" \
            "$OPENAI_API_URL" > "$out_vtt.tmp"; then
            mv "$out_vtt.tmp" "$out_vtt"
            echo "SUCCESS $flac_file $out_vtt" >> "$SUMMARY_FILE"
            echo "✓ Successfully transcribed: $(basename "$flac_file") → $(basename "$out_vtt")"
            return 0
        else
            echo "OpenAI API (VTT) failed for $base_name (attempt $attempt)." >&2
            rm -f "$out_vtt.tmp"
            ((attempt++))
            sleep "$RETRY_DELAY"
        fi
    done
    echo "FAIL $flac_file" >> "$SUMMARY_FILE"
    echo "✗ Failed to transcribe: $(basename "$flac_file") after $RETRY_MAX attempts"
    return 1
}

# Limit to MAX_FILES if set
if [ "$MAX_FILES" -gt 0 ]; then
    FLAC_FILES=("${FLAC_FILES[@]:0:$MAX_FILES}")
fi

# Find all FLAC files in the input directory (including subdirectories)
FLAC_FILES=()
while IFS= read -r -d $'\0' file; do
    FLAC_FILES+=("$file")
done < <(find "$INPUT_DIR" -name "*.flac" -type f -print0)

if [ "${#FLAC_FILES[@]}" -eq 0 ]; then
    echo "No FLAC files found in $INPUT_DIR"
fi

echo "Found ${#FLAC_FILES[@]} FLAC file(s) to process:"
for file in "${FLAC_FILES[@]}"; do
    echo "  - $(basename "$file")"
done

# Export vars/functions for xargs subshells
export OPENAI_API_URL OPENAI_MODEL OPENAI_API_KEY OPENAI_TIMEOUT RETRY_MAX RETRY_DELAY OUTPUT_DIR SUMMARY_FILE
export -f transcribe_one

printf "%s\n" "${FLAC_FILES[@]}" | xargs -P "$CONCURRENCY" -n 1 -I {} bash -c 'transcribe_one "$@"' _ {} "$OUTPUT_DIR"

# Summarize results
SUCCESS_COUNT=$(grep -c '^SUCCESS ' "$SUMMARY_FILE" || true)
FAIL_COUNT=$(grep -c '^FAIL ' "$SUMMARY_FILE" || true)

echo ""
echo "=== Transcription Summary ==="
echo "Successfully processed: $SUCCESS_COUNT files"
echo "Failed to process: $FAIL_COUNT files"
echo "Total files: ${#FLAC_FILES[@]}"