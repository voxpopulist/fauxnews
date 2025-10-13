#!/usr/bin/env bash

# Transcribe FLAC files using local OpenAI Whisper CLI (CPU) to VTT files
# Usage: ./scripts/transcribe_flac.sh [input_dir]

set -euo pipefail

VERBOSE=${VERBOSE:-0}
[ "$VERBOSE" = "1" ] && set -x

# Model and runtime options
WHISPER_MODEL=${WHISPER_MODEL:-small}
WHISPER_DEVICE=${WHISPER_DEVICE:-cpu}
WHISPER_THREADS=${WHISPER_THREADS:-2}
CONCURRENCY=${CONCURRENCY:-2}
MAX_FILES=${MAX_FILES:-0}

# Resolve paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
INPUT_DIR="${1:-$PROJECT_ROOT/samples}"

echo "=== Local Whisper Transcription ==="
echo "Model: $WHISPER_MODEL | Device: $WHISPER_DEVICE | Threads: $WHISPER_THREADS | Concurrency: $CONCURRENCY"
echo "Input: $INPUT_DIR"

# Require whisper CLI
if ! command -v whisper >/dev/null 2>&1; then
    echo "whisper CLI not found. Ensure 'openai-whisper' is installed (pip install openai-whisper)." >&2
    exit 1
fi

# Build file list
mapfile -d '' FLAC_FILES < <(find "$INPUT_DIR" -type f -name '*.flac' -print0)

if [ ${#FLAC_FILES[@]} -eq 0 ]; then
    echo "No FLAC files found in $INPUT_DIR"
    exit 0
fi

if [ "$MAX_FILES" -gt 0 ] && [ ${#FLAC_FILES[@]} -gt "$MAX_FILES" ]; then
    FLAC_FILES=("${FLAC_FILES[@]:0:$MAX_FILES}")
fi

echo "Found ${#FLAC_FILES[@]} FLAC file(s) to process"

SUCCESS=0
FAIL=0
TMPDIR=$(mktemp -d)
SUMMARY_FILE="$TMPDIR/summary.txt"
touch "$SUMMARY_FILE"

transcribe_one() {
    local flac_file="$1"
    local base_name
    base_name="$(basename "${flac_file}" .flac)"
    local audio_dir="$(dirname "$flac_file")"
    local audio_dir_basename="$(basename "$audio_dir")"
    local out_dir
    if [ "$audio_dir_basename" = "audio" ]; then
        out_dir="$(dirname "$audio_dir")/text"
    else
        out_dir="$audio_dir/text"
    fi
    mkdir -p "$out_dir"

    echo "→ Transcribing $(basename "$flac_file") → $out_dir/${base_name}.vtt"
    if whisper "$flac_file" \
            --model "$WHISPER_MODEL" \
            --device "$WHISPER_DEVICE" \
            --fp16 False \
            --threads "$WHISPER_THREADS" \
            --output_format vtt \
            --output_dir "$out_dir" \
            --language en \
            --task transcribe \
            --verbose False; then
        echo "SUCCESS $flac_file $out_dir/${base_name}.vtt" >> "$SUMMARY_FILE"
    else
        echo "FAIL $flac_file" >> "$SUMMARY_FILE"
    fi
}

export WHISPER_MODEL WHISPER_DEVICE WHISPER_THREADS SUMMARY_FILE
export -f transcribe_one

printf '%s\n' "${FLAC_FILES[@]}" | xargs -P "$CONCURRENCY" -n 1 -I {} bash -lc 'transcribe_one "$@"' _ {}

SUCCESS=$(grep -c '^SUCCESS ' "$SUMMARY_FILE" || true)
FAIL=$(grep -c '^FAIL ' "$SUMMARY_FILE" || true)

echo
echo "=== Transcription Summary ==="
echo "Successfully processed: $SUCCESS files"
echo "Failed to process: $FAIL files"
echo "Total files: ${#FLAC_FILES[@]}"