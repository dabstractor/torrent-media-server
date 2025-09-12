#!/bin/bash

# Convenience script to manually trigger Plex organization for downloaded files
# Usage: ./trigger-plex-organization.sh [filename]

set -e

# Configuration
WEB_UI_PORT=${WEB_UI_PORT:-8787}
BASE_URL="http://localhost:${WEB_UI_PORT}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[STATUS]${NC} $1"
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

# List available files
list_files() {
    print_status "Fetching available media files..."
    response=$(curl -s "${BASE_URL}/api/test/plex-organization")
    
    if echo "$response" | grep -q '"success":true'; then
        echo "Available files for processing:"
        echo "$response" | grep -o '"availableFiles":\[[^]]*\]' | sed 's/"availableFiles"://; s/[][]//g; s/,/\\n/g; s/"//g' | sed '/^$/d'
    else
        print_error "Failed to fetch file list"
        echo "$response" | grep -o '"error":"[^"]*"' | sed 's/"error":"//; s/"$//'
    fi
}

# Trigger organization for a specific file
trigger_organization() {
    local filename="$1"
    
    if [ -z "$filename" ]; then
        print_error "No filename provided"
        echo "Usage: $0 <filename>"
        echo "Run without arguments to see available files"
        exit 1
    fi
    
    print_status "Triggering Plex organization for: $filename"
    
    response=$(curl -s -X POST "${BASE_URL}/api/test/plex-organization?file=${filename}")
    
    if echo "$response" | grep -q '"success":true'; then
        print_status "Organization triggered successfully!"
        
        # Extract and display results
        if echo "$response" | grep -q '"organizationSuccess"'; then
            success=$(echo "$response" | grep -o '"organizationSuccess":[^,}]*' | cut -d: -f2)
            if [ "$success" = "true" ]; then
                print_status "File organization completed successfully"
            else
                print_warning "File organization may have partial success"
            fi
        fi
        
        # Show file info
        echo "File Information:"
        echo "$response" | grep -o '"fileInfo":{[^}]*}' | sed 's/"fileInfo"://; s/[{}]//g; s/,/\\n/g; s/"//g'
        
    else
        print_error "Failed to trigger organization"
        if echo "$response" | grep -q '"error"'; then
            error=$(echo "$response" | grep -o '"error":"[^"]*"' | sed 's/"error":"//; s/"$//')
            echo "Error: $error"
        fi
        exit 1
    fi
}

# Main execution
main() {
    if ! check_web_ui; then
        exit 1
    fi
    
    if [ $# -eq 0 ]; then
        # No arguments - list available files
        list_files
    else
        # Process the provided filename
        trigger_organization "$1"
    fi
}

# Run main function with all arguments
main "$@"