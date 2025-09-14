#!/bin/bash

# Convenience script to process all recently downloaded files
# Usage: ./process-recent-downloads.sh

set -e

# Load environment variables from .env file
if [ -f ".env" ]; then
    # Parse .env file and export variables, ignoring comments and empty lines
    export $(grep -v '^#' .env | grep -v '^$' | xargs)
fi

# Configuration
WEB_UI_PORT=${WEB_UI_PORT}
BASE_URL="http://localhost:${WEB_UI_PORT}"
DOWNLOADS_DIR="${DOWNLOADS_ROOT:-./data/downloads}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[STATUS]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if web-ui is running
check_web_ui() {
    if curl -s --head --fail "${BASE_URL}/health" > /dev/null; then
        print_status "Web UI is running"
        return 0
    else
        print_error "Web UI is not accessible at ${BASE_URL}"
        return 1
    fi
}

# Process all media files in downloads directory
process_all_files() {
    print_status "Fetching list of available media files..."
    
    # Get list of files from the API
    response=$(curl -s "${BASE_URL}/api/test/plex-organization")
    
    if ! echo "$response" | grep -q '"success":true'; then
        print_error "Failed to fetch file list"
        error=$(echo "$response" | grep -o '"error":"[^"]*"' | sed 's/"error":"//; s/"$//')
        print_error "Error: $error"
        exit 1
    fi
    
    # Extract file list
    files=$(echo "$response" | grep -o '"availableFiles":\[[^]]*\]' | sed 's/"availableFiles"://; s/[][]//g; s/,/\\n/g; s/"//g' | sed '/^$/d')
    
    if [ -z "$files" ]; then
        print_warning "No media files found in downloads directory"
        return 0
    fi
    
    # Count files
    file_count=$(echo "$files" | wc -l)
    print_status "Found $file_count media files to process"
    
    # Process each file
    echo "$files" | while read -r filename; do
        if [ -n "$filename" ]; then
            print_info "Processing: $filename"
            
            # Trigger organization for this file
            process_response=$(curl -s -X POST "${BASE_URL}/api/test/plex-organization?file=${filename}")
            
            if echo "$process_response" | grep -q '"success":true'; then
                if echo "$process_response" | grep -q '"organizationSuccess":true'; then
                    print_status "  ✓ Successfully organized: $filename"
                else
                    print_warning "  ! Organization completed but may have issues: $filename"
                fi
            else
                print_error "  ✗ Failed to organize: $filename"
                error=$(echo "$process_response" | grep -o '"error":"[^"]*"' | sed 's/"error":"//; s/"$//')
                print_error "    Error: $error"
            fi
        fi
    done
    
    print_status "Completed processing all files"
}

# Main execution
main() {
    print_status "Starting bulk processing of recent downloads..."
    
    if ! check_web_ui; then
        exit 1
    fi
    
    process_all_files
    
    print_status "Bulk processing completed!"
    print_info "Use './scripts/refresh-plex-library.sh' to refresh Plex libraries if needed"
}

# Run main function
main
