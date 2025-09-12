#!/usr/bin/with-contenv bash
# 04-setup-permissions.sh - Set proper permissions and ownership
# This script ensures proper file permissions for container operation

echo "=== Setting up permissions ==="

# Check if already initialized to avoid unnecessary processing
if [ -f /config/.permissions-complete ]; then
    echo "Permissions already set, skipping..."
    exit 0
fi

# Set proper ownership and permissions for all config files
chown -R abc:abc /config 2>/dev/null || true
chmod 755 /config 2>/dev/null || true

# Set specific permissions for generated files
chmod 644 /config/*.xml /config/*.json /config/*.conf 2>/dev/null || true
chmod 700 /config/generated 2>/dev/null || true
chmod 600 /config/generated/.secrets 2>/dev/null || true

# Set permissions for log directories
chmod 755 /config/logs 2>/dev/null || true

echo "✓ File permissions and ownership configured"

# Mark permissions setup complete
touch /config/.permissions-complete

echo "=== Permissions setup complete ==="