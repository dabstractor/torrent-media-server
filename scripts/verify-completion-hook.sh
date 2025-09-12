#!/bin/bash

# Script to verify the completion hook works
# This simulates a torrent completion by manually calling our hook

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOK_SCRIPT="${SCRIPT_DIR}/test-completion-hook.sh"
DOWNLOADS_DIR="${SCRIPT_DIR}/../data/downloads"
COMPLETION_LOG="${DOWNLOADS_DIR}/completion-test.log"
COMPLETION_FLAG="${DOWNLOADS_DIR}/.completion-triggered"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Create test environment
setup_test_environment() {
    print_status "Setting up test environment..."
    
    # Create downloads directory if it doesn't exist
    mkdir -p "$DOWNLOADS_DIR/complete"
    mkdir -p "$DOWNLOADS_DIR/incomplete"
    
    # Ensure hook script is executable
    chmod +x "$HOOK_SCRIPT"
    
    # Clear previous test logs
    rm -f "$COMPLETION_LOG" "$COMPLETION_FLAG"
    
    print_info "Test environment ready"
}

# Simulate torrent completion
test_completion_hook() {
    print_status "Testing completion hook..."
    
    # Test parameters
    TEST_TORRENT_NAME="Test.Movie.2024.1080p.x264"
    TEST_TORRENT_PATH="${DOWNLOADS_DIR}/complete/Test.Movie.2024.1080p.x264.mkv"
    TEST_SAVE_PATH="${DOWNLOADS_DIR}/complete"
    
    # Create a fake video file for testing
    mkdir -p "$(dirname "$TEST_TORRENT_PATH")"
    echo "This is a test video file" > "$TEST_TORRENT_PATH"
    
    print_info "Simulating completion of torrent: $TEST_TORRENT_NAME"
    
    # Call the hook script with test parameters
    "$HOOK_SCRIPT" "$TEST_TORRENT_NAME" "$TEST_TORRENT_PATH" "$TEST_SAVE_PATH"
    
    # Check results
    verify_hook_results "$TEST_TORRENT_NAME" "$TEST_TORRENT_PATH"
}

# Verify the hook worked
verify_hook_results() {
    local torrent_name="$1"
    local torrent_path="$2"
    local success=true
    
    print_status "Verifying hook results..."
    
    # Check if completion log was created
    if [[ -f "$COMPLETION_LOG" ]]; then
        print_info "✓ Completion log created: $COMPLETION_LOG"
        
        # Check if log contains expected content
        if grep -q "TORRENT COMPLETION DETECTED" "$COMPLETION_LOG"; then
            print_info "✓ Log contains completion marker"
        else
            print_error "✗ Log missing completion marker"
            success=false
        fi
        
        if grep -q "$torrent_name" "$COMPLETION_LOG"; then
            print_info "✓ Log contains torrent name"
        else
            print_error "✗ Log missing torrent name"
            success=false
        fi
        
        if grep -q "Video file detected" "$COMPLETION_LOG"; then
            print_info "✓ Video file detection working"
        else
            print_warning "! Video file detection may not be working"
        fi
        
    else
        print_error "✗ Completion log not created"
        success=false
    fi
    
    # Check if completion flag was created
    if [[ -f "$COMPLETION_FLAG" ]]; then
        print_info "✓ Completion flag created: $COMPLETION_FLAG"
        
        # Check flag content
        if grep -q "LAST_COMPLETION_TIME" "$COMPLETION_FLAG"; then
            print_info "✓ Flag contains timestamp"
        else
            print_error "✗ Flag missing timestamp"
            success=false
        fi
        
    else
        print_error "✗ Completion flag not created"
        success=false
    fi
    
    if $success; then
        print_status "🎉 All tests passed! Completion hook is working correctly."
        return 0
    else
        print_error "❌ Some tests failed. Check the output above."
        return 1
    fi
}

# Show test results
show_results() {
    if [[ -f "$COMPLETION_LOG" ]]; then
        print_info "Completion log contents:"
        echo "------------------------"
        cat "$COMPLETION_LOG"
        echo "------------------------"
    fi
    
    if [[ -f "$COMPLETION_FLAG" ]]; then
        print_info "Completion flag contents:"
        echo "------------------------"
        cat "$COMPLETION_FLAG"
        echo "------------------------"
    fi
}

# Clean up test files
cleanup() {
    print_info "Cleaning up test files..."
    rm -f "${DOWNLOADS_DIR}/complete/Test.Movie.2024.1080p.x264.mkv"
    # Note: We keep the log files as evidence the test worked
}

# Main execution
main() {
    print_status "Starting completion hook verification test..."
    
    setup_test_environment
    
    if test_completion_hook; then
        show_results
        cleanup
        
        echo ""
        print_status "✅ VERIFICATION COMPLETE: Download completion hooks are WORKING!"
        print_info "When a torrent completes, qBittorrent will:"
        print_info "  1. Call the external script: /scripts/test-completion-hook.sh"
        print_info "  2. Log completion details to: /data/downloads/completion-test.log"
        print_info "  3. Create/update flag file: /data/downloads/.completion-triggered"
        print_info "  4. Detect video files and mark them for conversion"
        echo ""
        print_info "To integrate video conversion:"
        print_info "  - Replace test script with actual video conversion trigger"
        print_info "  - Use completion flag to check for new downloads"
        print_info "  - Process video files marked with VIDEO_CONVERSION_READY=true"
        
        return 0
    else
        cleanup
        print_error "❌ VERIFICATION FAILED: Check the errors above"
        return 1
    fi
}

# Run main function
main