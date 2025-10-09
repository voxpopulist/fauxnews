#!/bin/bash

# Script to organize audio files into hierarchical folder structure
# Structure: samples/[first-letter]/[first-word]/filename.aiff
# Example: mcenany-01.aiff -> samples/m/mcenany/mcenany-01.aiff

set -euo pipefail

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

# Main function
main() {
    local repo_root
    repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    
    print_status "Starting audio file organization in: $repo_root"
    print_status "Target structure: samples/[first-letter]/[first-word]/filename.aiff"
    echo
    
    # Find all AIFF files in the repository
    local audio_files=()
    while IFS= read -r -d '' file; do
        audio_files+=("$file")
    done < <(find "$repo_root" -maxdepth 1 -name "*.aiff" -type f -print0)
    
    if [ ${#audio_files[@]} -eq 0 ]; then
        print_warning "No AIFF files found in the repository root"
        return 0
    fi
    
    print_status "Found ${#audio_files[@]} audio files to organize"
    echo
    
    # Track statistics
    local moved_count=0
    local skipped_count=0
    local error_count=0
    
    # Process each audio file
    for audio_file in "${audio_files[@]}"; do
        local filename
        filename="$(basename "$audio_file")"
        
        # Extract first word and first letter
        local first_word
        first_word="$(get_first_word "$filename")"
        
        local first_letter
        first_letter="$(get_first_letter "$first_word")"
        
        # Skip if we can't extract meaningful data
        if [ -z "$first_word" ] || [ -z "$first_letter" ]; then
            print_error "Could not extract first word from: $filename"
            ((error_count++))
            continue
        fi
        
        # Create target directory structure
        local target_dir="$repo_root/samples/$first_letter/$first_word"
        local target_file="$target_dir/$filename"
        
        # Check if file is already in correct location
        if [ "$audio_file" = "$target_file" ]; then
            print_status "✓ $filename (already in correct location: samples/$first_letter/$first_word/)"
            ((skipped_count++))
            continue
        fi
        
        # Create directories if they don't exist
        if ! mkdir -p "$target_dir"; then
            print_error "Failed to create directory: $target_dir"
            ((error_count++))
            continue
        fi
        
        # Check if target file already exists
        if [ -f "$target_file" ]; then
            print_warning "Target file already exists: $target_file"
            print_warning "Skipping: $filename"
            ((skipped_count++))
            continue
        fi
        
        # Move the file
        if mv "$audio_file" "$target_file"; then
            print_success "Moved: $filename → samples/$first_letter/$first_word/"
            ((moved_count++))
        else
            print_error "Failed to move: $filename"
            ((error_count++))
        fi
    done
    
    echo
    print_status "Organization complete!"
    print_status "Files moved: $moved_count"
    print_status "Files skipped: $skipped_count"
    print_status "Errors: $error_count"
    
    # Show the new directory structure
    echo
    print_status "New directory structure:"
    find "$repo_root/samples" -type d -name "[a-z]" 2>/dev/null | sort | while read -r dir; do
        if [ -d "$dir" ]; then
            echo "📁 samples/$(basename "$dir")/"
            find "$dir" -type d -mindepth 1 -maxdepth 1 | sort | while read -r subdir; do
                local count
                count=$(find "$subdir" -name "*.aiff" -type f | wc -l)
                echo "  📁 $(basename "$subdir")/ ($count files)"
            done
        fi
    done
}

# Help function
show_help() {
    cat << EOF
Audio File Organizer

This script organizes AIFF audio files into a hierarchical folder structure:
- Top level: samples/ directory
- First level: First letter of filename (a-z)
- Second level: First word of filename
- Files: Original filename preserved

Example:
  mcenany-01.aiff → samples/m/mcenany/mcenany-01.aiff
  miller-15.aiff  → samples/m/miller/miller-15.aiff
  watters-03.aiff → samples/w/watters/watters-03.aiff

Usage:
  $0 [OPTIONS]

Options:
  -h, --help     Show this help message
  -n, --dry-run  Show what would be moved without actually moving files

EOF
}

# Dry run function
dry_run() {
    local repo_root
    repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    
    print_status "DRY RUN: Showing what would be organized in: $repo_root"
    echo
    
    # Find all AIFF files in the repository
    local audio_files=()
    while IFS= read -r -d '' file; do
        audio_files+=("$file")
    done < <(find "$repo_root" -maxdepth 1 -name "*.aiff" -type f -print0)
    
    if [ ${#audio_files[@]} -eq 0 ]; then
        print_warning "No AIFF files found in the repository root"
        return 0
    fi
    
    print_status "Found ${#audio_files[@]} audio files"
    echo
    
    # Show what would happen to each file
    for audio_file in "${audio_files[@]}"; do
        local filename
        filename="$(basename "$audio_file")"
        
        local first_word
        first_word="$(get_first_word "$filename")"
        
        local first_letter
        first_letter="$(get_first_letter "$first_word")"
        
        local target_path="samples/$first_letter/$first_word/"
        
        if [ -z "$first_word" ] || [ -z "$first_letter" ]; then
            print_error "WOULD FAIL: $filename (cannot extract first word)"
        else
            echo "  $filename → $target_path"
        fi
    done
}

# Parse command line arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    -n|--dry-run)
        dry_run
        exit 0
        ;;
    "")
        main
        ;;
    *)
        print_error "Unknown option: $1"
        show_help
        exit 1
        ;;
esac