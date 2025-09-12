#!/usr/bin/with-contenv bash
# 01-init-directories.sh - Create required directories for configuration
# This script runs before service starts to ensure directory structure exists

echo "=== Initializing directory structure ==="

# Check if already initialized to avoid unnecessary processing
if [ -f /config/.init-directories-complete ]; then
    echo "Directory initialization already complete, skipping..."
    exit 0
fi

# Create required directories
mkdir -p /config/logs
mkdir -p /config/generated
mkdir -p /data/downloads/{complete,incomplete,watch}
mkdir -p /data/media/{movies,tv}

# Set proper ownership and permissions
chown -R abc:abc /config /data 2>/dev/null || true
chmod 755 /config /data 2>/dev/null || true
chmod 644 /config/*.xml 2>/dev/null || true

echo "Directory structure initialized successfully"

# Mark directory initialization complete
touch /config/.init-directories-complete

echo "=== Directory initialization complete ==="