#!/bin/bash

# Script to convert AIFF files to FLAC locally for space savings
# Preserves directory structure and removes original AIFFs after successful conversion

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

# Check if ffmpeg is available
check_ffmpeg() {
    if ! command -v ffmpeg &> /dev/null; then
        print_error "ffmpeg is not installed or not in PATH"
        print_error "Install with: brew install ffmpeg"
        exit 1
    fi
    print_status "ffmpeg found: $(ffmpeg -version | head -n1)"
}

# Convert a single AIFF file to FLAC
convert_file() {
    local aiff_file="$1"
    local flac_file="${aiff_file%.*}.flac"
    
    # Skip if FLAC already exists
    if [[ -f "$flac_file" ]]; then
        print_warning "FLAC already exists, skipping: $(basename "$flac_file")"
        return 0
    fi
    
    print_status "Converting: $(basename "$aiff_file") → $(basename "$flac_file")"
    
    # Convert with ffmpeg (FLAC compression level 8 for best compression)
    if ffmpeg -i "$aiff_file" -c:a flac -compression_level 8 "$flac_file" -y &>/dev/null; then
        # Verify the FLAC file was created and has reasonable size
        if [[ -f "$flac_file" && -s "$flac_file" ]]; then
            local aiff_size=$(stat -f%z "$aiff_file" 2>/dev/null || stat -c%s "$aiff_file" 2>/dev/null)
            local flac_size=$(stat -f%z "$flac_file" 2>/dev/null || stat -c%s "$flac_file" 2>/dev/null)
            local compression_ratio=$(( (aiff_size - flac_size) * 100 / aiff_size ))
            
            print_success "Converted: $(basename "$flac_file") (${compression_ratio}% smaller)"
            
            # Remove original AIFF file
            if rm "$aiff_file"; then
                print_status "Removed original: $(basename "$aiff_file")"
                return 0
            else
                print_error "Failed to remove original: $(basename "$aiff_file")"
                return 1
            fi
        else
            print_error "FLAC file was not created properly: $(basename "$flac_file")"
            return 1
        fi
    else
        print_error "ffmpeg conversion failed for: $(basename "$aiff_file")"
        return 1
    fi
}

# Show help
show_help() {
    cat << EOF
AIFF to FLAC Converter

This script converts all AIFF files in the samples/ directory to FLAC format
for space savings while preserving audio quality. Original AIFF files are
removed after successful conversion.

Usage:
  $0 [OPTIONS]

Options:
  -h, --help     Show this help message
  -n, --dry-run  Show what would be converted without actually converting
  --keep-aiff    Keep original AIFF files (don't delete them)

Examples:
  $0                    # Convert all AIFF files to FLAC
  $0 -n                # Preview what would be converted
  $0 --keep-aiff       # Convert but keep original AIFF files

EOF
}

# Dry run function
dry_run() {
    local repo_root
    repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
    
    print_status "DRY RUN: Showing what would be converted in: $repo_root/samples"
    echo
    
    local aiff_files=()
    while IFS= read -r -d '' file; do
        aiff_files+=("$file")
    done < <(find "$repo_root/samples" -name "*.aiff" -type f -print0 2>/dev/null)
    
    if [ ${#aiff_files[@]} -eq 0 ]; then
        print_warning "No AIFF files found in samples/"
        return 0
    fi
    
    print_status "Found ${#aiff_files[@]} AIFF files to convert:"
    echo
    
    local total_size=0
    for aiff_file in "${aiff_files[@]}"; do
        local flac_file="${aiff_file%.*}.flac"
        local rel_path="${aiff_file#$repo_root/}"
        local rel_flac="${flac_file#$repo_root/}"
        
        if [[ -f "$flac_file" ]]; then
            echo "  ✓ $rel_path → $rel_flac (FLAC exists)"
        else
            local size=$(stat -f%z "$aiff_file" 2>/dev/null || stat -c%s "$aiff_file" 2>/dev/null)
            local size_mb=$(( size / 1024 / 1024 ))
            total_size=$(( total_size + size ))
            echo "  → $rel_path → $rel_flac (${size_mb}MB)"
        fi
    done
    
    local total_mb=$(( total_size / 1024 / 1024 ))
    echo
    print_status "Total AIFF size: ${total_mb}MB"
    print_status "Expected FLAC savings: ~40-60% (estimated)"
}

# Main conversion function
main() {
    local repo_root
    repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
    local keep_aiff=false
    
    print_status "Starting AIFF to FLAC conversion in: $repo_root/samples"
    echo
    
    # Find all AIFF files in samples/
    local aiff_files=()
    while IFS= read -r -d '' file; do
        aiff_files+=("$file")
    done < <(find "$repo_root/samples" -name "*.aiff" -type f -print0 2>/dev/null)
    
    if [ ${#aiff_files[@]} -eq 0 ]; then
        print_warning "No AIFF files found in samples/"
        return 0
    fi
    
    print_status "Found ${#aiff_files[@]} AIFF files to convert"
    echo
    
    # Track statistics
    local converted_count=0
    local skipped_count=0
    local error_count=0
    local total_aiff_size=0
    local total_flac_size=0
    
    # Process each AIFF file
    for aiff_file in "${aiff_files[@]}"; do
        local flac_file="${aiff_file%.*}.flac"
        
        # Calculate original size
        local aiff_size=$(stat -f%z "$aiff_file" 2>/dev/null || stat -c%s "$aiff_file" 2>/dev/null)
        total_aiff_size=$(( total_aiff_size + aiff_size ))
        
        # Skip if FLAC already exists
        if [[ -f "$flac_file" ]]; then
            print_warning "FLAC already exists, skipping: $(basename "$flac_file")"
            ((skipped_count++))
            local flac_size=$(stat -f%z "$flac_file" 2>/dev/null || stat -c%s "$flac_file" 2>/dev/null)
            total_flac_size=$(( total_flac_size + flac_size ))
            continue
        fi
        
        if convert_file "$aiff_file"; then
            ((converted_count++))
            local flac_size=$(stat -f%z "$flac_file" 2>/dev/null || stat -c%s "$flac_file" 2>/dev/null)
            total_flac_size=$(( total_flac_size + flac_size ))
        else
            ((error_count++))
        fi
    done
    
    echo
    print_status "Conversion complete!"
    print_status "Files converted: $converted_count"
    print_status "Files skipped: $skipped_count"
    print_status "Errors: $error_count"
    
    # Show space savings
    if [[ $total_aiff_size -gt 0 && $total_flac_size -gt 0 ]]; then
        local aiff_mb=$(( total_aiff_size / 1024 / 1024 ))
        local flac_mb=$(( total_flac_size / 1024 / 1024 ))
        local savings_mb=$(( aiff_mb - flac_mb ))
        local savings_percent=$(( savings_mb * 100 / aiff_mb ))
        
        echo
        print_success "Space savings: ${savings_mb}MB (${savings_percent}% reduction)"
        print_success "Original: ${aiff_mb}MB → FLAC: ${flac_mb}MB"
    fi
}

# Parse command line arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    -n|--dry-run)
        check_ffmpeg
        dry_run
        exit 0
        ;;
    --keep-aiff)
        # TODO: Implement keep-aiff mode if needed
        print_error "--keep-aiff mode not implemented yet"
        exit 1
        ;;
    "")
        check_ffmpeg
        main
        ;;
    *)
        print_error "Unknown option: $1"
        show_help
        exit 1
        ;;
esac