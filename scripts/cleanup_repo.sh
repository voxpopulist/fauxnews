#!/bin/bash

# Repository cleanup script to reduce size after git-filter-repo operations
# This script safely prunes and compacts the repository

set -euo pipefail

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

get_repo_size() {
    local size_bytes
    if command -v gdu &>/dev/null; then
        size_bytes=$(gdu -sb .git 2>/dev/null | cut -f1 || echo "0")
    else
        size_bytes=$(du -sb .git 2>/dev/null | cut -f1 || echo "0")
    fi
    
    if [[ "$size_bytes" -gt 0 ]]; then
        # Convert bytes to human readable
        if [[ "$size_bytes" -gt 1073741824 ]]; then
            echo "$(( size_bytes / 1073741824 ))GB"
        elif [[ "$size_bytes" -gt 1048576 ]]; then
            echo "$(( size_bytes / 1048576 ))MB"
        elif [[ "$size_bytes" -gt 1024 ]]; then
            echo "$(( size_bytes / 1024 ))KB"
        else
            echo "${size_bytes}B"
        fi
    else
        echo "unknown"
    fi
}

show_help() {
    cat << EOF
Repository Cleanup Tool

This script cleans up and compacts a git repository to reduce its size,
especially useful after operations like git-filter-repo.

Usage:
  $0 [OPTIONS]

Options:
  -h, --help     Show this help message
  -v, --verbose  Show detailed output during cleanup
  --info         Show repository information only

Steps performed:
1. Check repository status
2. Show current size
3. Clean reflog entries
4. Remove unreachable objects  
5. Repack and compress objects
6. Show final size and savings

EOF
}

show_repo_info() {
    print_status "Repository Information:"
    echo
    
    # Current size
    local current_size
    current_size=$(get_repo_size)
    print_status "Current .git size: $current_size"
    
    # Object count
    if git count-objects -v &>/dev/null; then
        local objects_info
        objects_info=$(git count-objects -v)
        
        local loose_objects
        loose_objects=$(echo "$objects_info" | grep "^count " | cut -d' ' -f2 || echo "0")
        
        local packed_objects  
        packed_objects=$(echo "$objects_info" | grep "^in-pack " | cut -d' ' -f2 || echo "0")
        
        local packs
        packs=$(echo "$objects_info" | grep "^packs " | cut -d' ' -f2 || echo "0")
        
        print_status "Loose objects: $loose_objects"
        print_status "Packed objects: $packed_objects"
        print_status "Pack files: $packs"
    fi
    
    # Branch info
    local branches
    branches=$(git branch -a | wc -l | tr -d ' ')
    print_status "Branches: $branches"
    
    # Recent commits
    print_status "Recent commits:"
    git log --oneline -5 | sed 's/^/  /'
}

cleanup_repo() {
    local verbose=false
    if [[ "${1:-}" == "--verbose" ]]; then
        verbose=true
    fi
    
    print_status "Starting repository cleanup..."
    echo
    
    # Show initial size
    local initial_size
    initial_size=$(get_repo_size)
    print_status "Initial repository size: $initial_size"
    echo
    
    # Step 1: Clean reflog
    print_status "Step 1: Cleaning reflog entries..."
    if [[ "$verbose" == true ]]; then
        git reflog expire --expire=now --all
    else
        git reflog expire --expire=now --all &>/dev/null
    fi
    print_success "Reflog cleaned"
    
    # Step 2: Remove unreachable objects
    print_status "Step 2: Removing unreachable objects..."
    if [[ "$verbose" == true ]]; then
        git gc --prune=now
    else
        git gc --prune=now &>/dev/null
    fi
    print_success "Unreachable objects removed"
    
    # Step 3: Repack (non-aggressive for speed)
    print_status "Step 3: Repacking repository..."
    if [[ "$verbose" == true ]]; then
        git repack -a -d
    else
        git repack -a -d &>/dev/null
    fi
    print_success "Repository repacked"
    
    # Show final size
    echo
    local final_size
    final_size=$(get_repo_size)
    print_status "Final repository size: $final_size"
    
    if [[ "$initial_size" != "$final_size" && "$initial_size" != "unknown" && "$final_size" != "unknown" ]]; then
        print_success "Repository cleanup completed!"
        print_success "Size change: $initial_size → $final_size"
    else
        print_success "Repository cleanup completed!"
    fi
}

main() {
    # Check if we're in a git repository
    if ! git rev-parse --git-dir &>/dev/null; then
        print_error "Not in a git repository"
        exit 1
    fi
    
    print_status "Repository Cleanup Tool"
    echo
    
    cleanup_repo
}

# Parse command line arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    --info)
        show_repo_info
        exit 0
        ;;
    -v|--verbose)
        main --verbose
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