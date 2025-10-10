#!/bin/bash

# Script to organize files into hierarchical folder structure with subfolders
# Structure: samples/[first-letter]/[first-word]/audio/filename.flac
#           samples/[first-letter]/[first-word]/text/filename.json, etc.
# Example: mcenany-01.flac -> samples/m/mcenany/audio/mcenany-01.flac
#          mcenany-01.json -> samples/m/mcenany/text/mcenany-01.json

set -uo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Function to extract first word from filename
get_first_word() {
    local filename="$1"
    # Remove extension and get first word (split on dash, underscore, or space)
    echo "$filename" | sed 's/\.[^.]*$//' | sed 's/[-_ ].*//' | tr '[:upper:]' '[:lower:]'
}

# Function to get first letter
get_first_letter() {
    local word="$1"
    echo "${word:0:1}" | tr '[:upper:]' '[:lower:]'
}

# Function to check if file is tracked by git
is_git_tracked() {
    local file="$1"
    git ls-files --error-unmatch "$file" >/dev/null 2>&1
}

# Function to organize a single file
organize_file() {
    local file="$1"
    local filename
    filename="$(basename "$file")"
    
    # Extract first word and first letter
    local first_word
    first_word="$(get_first_word "$filename")"
    
    local first_letter
    first_letter="$(get_first_letter "$first_word")"
    
    # Skip if we can't extract meaningful data
    if [ -z "$first_word" ] || [ -z "$first_letter" ]; then
        print_error "Could not extract first word from: $filename"
        return 1
    fi

    # Determine subfolder based on file extension
    local extension
    extension="${filename##*.}"
    local subfolder
    case "$extension" in
        flac|wav)
            subfolder="audio"
            ;;
        json|srt|tsv|txt|vtt)
            subfolder="text"
            ;;
        *)
            print_warning "Unknown file type: $filename"
            return 1
            ;;
    esac
    
    # Create target directory structure with subfolder
    local target_samples_dir="$(dirname "$(dirname "$0")")/samples"
    local target_dir="$target_samples_dir/$first_letter/$first_word/$subfolder"
    local target_file="$target_dir/$filename"

    # Create directories if they don't exist
    if ! mkdir -p "$target_dir"; then
        print_error "Failed to create directory: $target_dir"
        return 1
    fi
    
    # Check if target file already exists
    if [ -f "$target_file" ]; then
        print_warning "Target file already exists: $target_file"
        print_warning "Skipping: $filename"
        return 2  # Skipped
    fi
    
    # Move the file using appropriate method
    local move_success=false
    
    if [ "$subfolder" = "audio" ] && is_git_tracked "$file"; then
        # Use git mv for tracked audio files
        if git mv "$file" "$target_file"; then
            print_success "Git moved: $filename → samples/$first_letter/$first_word/$subfolder/"
            move_success=true
        else
            print_error "Failed to git move: $filename"
        fi
    else
        # Use regular mv for text files and untracked audio files
        if mv "$file" "$target_file"; then
            print_success "Moved: $filename → samples/$first_letter/$first_word/$subfolder/"
            move_success=true
        else
            print_error "Failed to move: $filename"
        fi
    fi
    
    if [ "$move_success" = true ]; then
        return 0  # Success
    else
        return 1
    fi
}

# Main function
main() {
    # Default to current directory if no argument provided
    local search_folder="${1:-.}"
    
    print_status "Starting file organization in: $search_folder"
    print_status "Target structure: samples/[letter]/[word]/audio/ and samples/[letter]/[word]/text/"
    echo

    # Get all audio and text files in the specified folder
    local files=()
    while IFS= read -r -d '' file; do
        files+=("$file")
    done < <(find "$search_folder" -maxdepth 1 -type f \( -iname '*.flac' -o -iname '*.wav' -o -iname '*.json' -o -iname '*.srt' -o -iname '*.tsv' -o -iname '*.txt' -o -iname '*.vtt' \) -print0)

    if [ ${#files[@]} -eq 0 ]; then
        print_warning "No audio or text files found in the specified folder: $search_folder"
        return 0
    fi
    
    print_status "Found ${#files[@]} files to organize"
    echo
    
    # Track statistics
    local moved_count=0
    local skipped_count=0
    local error_count=0

    # Process each file
    for file in "${files[@]}"; do
        organize_file "$file"
        local status=$?
        case $status in
            0) ((moved_count++)) ;;
            2) ((skipped_count++)) ;;
            *) ((error_count++)) ;;
        esac
    done
    
    echo
    print_status "Organization complete!"
    print_status "Files moved: $moved_count"
    print_status "Files skipped: $skipped_count"
    print_status "Errors: $error_count"

    if [ $error_count -gt 0 ]; then
        return 1
    fi
}

# Help function
show_help() {
    cat << EOF
File Organizer

This script organizes audio and text files into a hierarchical folder structure:
- Top level: samples/ directory
- First level: First letter of filename (a-z)
- Second level: First word of filename
- Files: Original filename preserved

Example:
  mcenany-01.flac → samples/m/mcenany/audio/mcenany-01.flac
  miller-15.flac  → samples/m/miller/audio/miller-15.flac
  watters-03.flac → samples/w/watters/audio/watters-03.flac

Usage:
    $0 [SEARCH_FOLDER]

Options:
  -h, --help    Show this help message

EOF
}

# Parse command line arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    *)
        main "${1:-.}"
        ;;
esac
