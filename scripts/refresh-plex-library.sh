#!/bin/bash

# Convenience script to manually refresh Plex libraries
# Usage: ./refresh-plex-library.sh [library_id]

set -e

# Load environment variables from .env file
if [ -f ".env" ]; then
    # Parse .env file and export variables, ignoring comments and empty lines
    export $(grep -v '^#' .env | grep -v '^$' | xargs)
fi

# Configuration
PLEX_PORT=${PLEX_EXTERNAL_PORT:-32400}
PLEX_TOKEN=$(grep -o 'PlexOnlineToken="[^"]*"' "${CONFIG_ROOT:-./config}"/plex/Library/Application\ Support/Plex\ Media\ Server/Preferences.xml | cut -d'"' -f2)
BASE_URL="http://localhost:${PLEX_PORT}"

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

# Check if Plex is running
check_plex() {
    if curl -s --head --fail "${BASE_URL}/" > /dev/null; then
        print_status "Plex Media Server is running"
        return 0
    else
        print_error "Plex Media Server is not accessible at ${BASE_URL}"
        return 1
    fi
}

# Get list of libraries
list_libraries() {
    print_status "Fetching Plex libraries..."
    
    if [ -z "$PLEX_TOKEN" ]; then
        print_error "Plex token not found in configuration"
        return 1
    fi
    
    response=$(curl -s -H "X-Plex-Token: ${PLEX_TOKEN}" "${BASE_URL}/library/sections")
    
    # Parse XML response to show libraries
    echo "Available Libraries:"
    echo "$response" | grep -o '<Directory[^>]*title="[^"]*"[^>]*key="[^"]*"' | \
    while read -r line; do
        title=$(echo "$line" | grep -o 'title="[^"]*"' | cut -d'"' -f2)
        key=$(echo "$line" | grep -o 'key="[^"]*"' | cut -d'"' -f2)
        type=$(echo "$line" | grep -o 'type="[^"]*"' | cut -d'"' -f2)
        echo "  $key: $title ($type)"
    done
}

# Refresh a specific library
refresh_library() {
    local library_id="$1"
    
    if [ -z "$library_id" ]; then
        print_error "No library ID provided"
        echo "Usage: $0 <library_id>"
        echo "Run without arguments to see available libraries"
        exit 1
    fi
    
    if [ -z "$PLEX_TOKEN" ]; then
        print_error "Plex token not found in configuration"
        exit 1
    fi
    
    print_status "Refreshing Plex library ID: $library_id"
    
    # Trigger library refresh
    response=$(curl -s -X PUT -H "X-Plex-Token: ${PLEX_TOKEN}" "${BASE_URL}/library/sections/${library_id}/refresh")
    
    if [ $? -eq 0 ]; then
        print_status "Library refresh triggered successfully for library ID: $library_id"
        print_info "Plex will now scan for new media files"
    else
        print_error "Failed to trigger library refresh"
        exit 1
    fi
}

# Main execution
main() {
    if ! check_plex; then
        exit 1
    fi
    
    if [ $# -eq 0 ]; then
        # No arguments - list available libraries
        list_libraries
    else
        # Refresh the provided library ID
        refresh_library "$1"
    fi
}

# Run main function with all arguments
main "$@"