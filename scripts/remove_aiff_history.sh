#!/bin/bash

# Script to remove AIFF files from git history
# This will permanently remove all .aiff files from all commits

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

show_help() {
    cat << EOF
AIFF History Cleaner

This script permanently removes all .aiff files from git history using git-filter-repo.
This operation is DESTRUCTIVE and cannot be undone easily.

IMPORTANT: This will rewrite git history and change all commit hashes.
You will need to force-push to update the remote repository.

Usage:
  $0 [OPTIONS]

Options:
  -h, --help     Show this help message
  -n, --dry-run  Show what would be removed without actually removing
  --force        Actually perform the removal (required for safety)

Steps this script performs:
1. Check for git-filter-repo installation
2. Create a backup of current repo state
3. Show current repository size
4. Remove all .aiff files from history
5. Show new repository size
6. Provide instructions for force-push

EOF
}

check_prerequisites() {
    # Check if git-filter-repo is installed
    if ! command -v git-filter-repo &> /dev/null; then
        print_error "git-filter-repo is not installed"
        print_status "Install with: brew install git-filter-repo"
        exit 1
    fi
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir &>/dev/null; then
        print_error "Not in a git repository"
        exit 1
    fi
    
    # Check if working directory is clean
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        print_error "Working directory is not clean. Please commit or stash changes first."
        git status --short
        exit 1
    fi
}

dry_run() {
    print_status "DRY RUN: Analyzing AIFF files in git history"
    echo
    
    # Show current repo size
    local repo_size
    repo_size=$(du -sh .git 2>/dev/null | cut -f1 || echo "unknown")
    print_status "Current repository size: $repo_size"
    
    # Find all AIFF files in history
    print_status "Searching for AIFF files in git history..."
    local aiff_files
    aiff_files=$(git log --all --name-only --pretty=format: | grep -i '\.aiff$' | sort -u || true)
    
    if [[ -z "$aiff_files" ]]; then
        print_success "No AIFF files found in git history!"
        return 0
    fi
    
    echo
    print_status "AIFF files found in history:"
    echo "$aiff_files" | while read -r file; do
        if [[ -n "$file" ]]; then
            echo "  - $file"
        fi
    done
    
    # Count commits that contain AIFF files
    local aiff_commits
    aiff_commits=$(git log --all --oneline --name-only | grep -B1 -i '\.aiff$' | grep '^[0-9a-f]' | wc -l || echo "0")
    
    echo
    print_status "Commits containing AIFF files: $aiff_commits"
    print_warning "All these files will be removed from ALL commits in history"
    print_warning "This operation will rewrite git history and change commit hashes"
}

create_backup() {
    local backup_name="backup-before-aiff-removal-$(date +%Y%m%d-%H%M%S)"
    print_status "Creating backup branch: $backup_name"
    
    if git branch "$backup_name"; then
        print_success "Backup created: $backup_name"
        print_status "You can restore with: git checkout $backup_name"
    else
        print_error "Failed to create backup branch"
        exit 1
    fi
}

remove_aiff_files() {
    print_status "Removing AIFF files from git history..."
    print_warning "This operation is DESTRUCTIVE and will rewrite history"
    
    # Store remotes for later restoration
    local remotes_file=".git/filter-repo-remotes-backup"
    git remote -v > "$remotes_file" 2>/dev/null || true
    
    # Run git-filter-repo to remove all .aiff files
    if git filter-repo --path-glob '*.aiff' --invert-paths --force; then
        print_success "Successfully removed AIFF files from history"
        
        # Show new repo size
        local new_size
        new_size=$(du -sh .git 2>/dev/null | cut -f1 || echo "unknown")
        print_success "New repository size: $new_size"
        
        # Restore remotes if backup exists
        if [[ -f "$remotes_file" ]]; then
            print_status "Restoring git remotes..."
            while IFS=$'\t' read -r name url; do
                if [[ -n "$name" && -n "$url" && "$name" != "(fetch)" && "$name" != "(push)" ]]; then
                    git remote add "$name" "$url" 2>/dev/null || true
                fi
            done < <(cat "$remotes_file" | sed 's/ /\t/' | cut -f1,2)
            rm -f "$remotes_file"
        fi
        
        print_success "AIFF files have been removed from git history"
        echo
        print_warning "IMPORTANT: Git history has been rewritten!"
        print_warning "All commit hashes have changed."
        print_warning "You MUST force-push to update the remote repository:"
        echo
        print_status "  git push --force-with-lease origin main"
        echo
        print_warning "WARNING: This will overwrite the remote history."
        print_warning "Make sure all collaborators are aware of this change."
        
    else
        print_error "Failed to remove AIFF files from history"
        exit 1
    fi
}

main() {
    check_prerequisites
    
    print_status "AIFF History Removal Tool"
    print_warning "This tool will permanently remove all .aiff files from git history"
    echo
    
    create_backup
    remove_aiff_files
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
    --force)
        main
        ;;
    "")
        print_error "This operation is destructive. Use --force to proceed."
        print_status "Run with --dry-run to see what would be removed first."
        print_status "Use --help for more information."
        exit 1
        ;;
    *)
        print_error "Unknown option: $1"
        show_help
        exit 1
        ;;
esac