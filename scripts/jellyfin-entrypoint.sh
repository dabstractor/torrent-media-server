#!/bin/bash
set -e

CONFIG_DIR="/config"
TEMPLATE_DIR="/templates"

echo "[INIT] Jellyfin custom entrypoint starting..."

# Ensure config directory exists
mkdir -p "$CONFIG_DIR"

# Set proper permissions
chown -R 1000:1000 "$CONFIG_DIR"

# Function to apply template configuration
apply_template() {
    if [ -f "$TEMPLATE_DIR/system.xml.template" ]; then
        echo "[INIT] Applying system configuration template"

        # Try envsubst first, fallback to direct copy if it fails
        if envsubst < "$TEMPLATE_DIR/system.xml.template" > "$CONFIG_DIR/system.xml.tmp" 2>/dev/null; then
            # Verify the XML was generated correctly and is valid
            if [ -s "$CONFIG_DIR/system.xml.tmp" ] && grep -q "<?xml" "$CONFIG_DIR/system.xml.tmp"; then
                mv "$CONFIG_DIR/system.xml.tmp" "$CONFIG_DIR/system.xml"
                echo "[INIT] Successfully applied template with variable substitution"
            else
                echo "[INIT] WARNING: Generated system.xml is empty or invalid, using template directly"
                cp "$TEMPLATE_DIR/system.xml.template" "$CONFIG_DIR/system.xml"
                rm -f "$CONFIG_DIR/system.xml.tmp"
            fi
        else
            echo "[INIT] WARNING: envsubst failed, using template directly"
            cp "$TEMPLATE_DIR/system.xml.template" "$CONFIG_DIR/system.xml"
            rm -f "$CONFIG_DIR/system.xml.tmp"
        fi

        chown 1000:1000 "$CONFIG_DIR/system.xml"
    else
        echo "[INIT] WARNING: Template not found at $TEMPLATE_DIR/system.xml.template"
    fi
}

# Check if this is first run (no existing configuration)
if [ ! -f "$CONFIG_DIR/system.xml" ]; then
    echo "[INIT] First run detected - allowing Jellyfin to initialize naturally"

    # Create a background script to apply configuration after startup
    cat > /tmp/jellyfin-config.sh << 'EOF'
#!/bin/bash
sleep 60  # Wait for Jellyfin to fully initialize

# Check if Jellyfin is responding and system.xml still doesn't exist
if [ ! -f /config/system.xml ]; then
    if curl -s http://localhost:8096/health > /dev/null 2>&1; then
        echo "[CONFIG] Jellyfin is ready, applying configuration..."

        # Apply the template configuration
        if [ -f /templates/system.xml.template ]; then
            if envsubst < /templates/system.xml.template > /config/system.xml.tmp 2>/dev/null; then
                if [ -s /config/system.xml.tmp ] && grep -q "<?xml" /config/system.xml.tmp; then
                    mv /config/system.xml.tmp /config/system.xml
                    echo "[CONFIG] Template applied successfully"
                else
                    cp /templates/system.xml.template /config/system.xml
                    rm -f /config/system.xml.tmp
                fi
            else
                cp /templates/system.xml.template /config/system.xml
            fi
            chown 1000:1000 /config/system.xml

            # Restart Jellyfin to apply the configuration
            echo "[CONFIG] Restarting Jellyfin to apply configuration..."
            pkill -f jellyfin || true
        fi
    fi
fi
EOF

    chmod +x /tmp/jellyfin-config.sh

    # Start the configuration script in background
    /tmp/jellyfin-config.sh &

    echo "[INIT] Starting Jellyfin with natural initialization..."
else
    echo "[INIT] Existing configuration found - starting normally"
fi

# Start Jellyfin normally
echo "[INIT] Starting Jellyfin..."
exec /init