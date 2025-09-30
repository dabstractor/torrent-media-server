#!/bin/sh
CONFIG_DIR="/app/config"
TEMPLATE_DIR="/templates"

echo "[INIT] Jellyseer custom entrypoint starting..."
echo "[DEBUG] Template directory contents:"
ls -la "$TEMPLATE_DIR" 2>/dev/null || echo "Template directory not found"
echo "[DEBUG] Config directory contents:"
ls -la "$CONFIG_DIR" 2>/dev/null || echo "Config directory empty"

# Create config directory if it doesn't exist
mkdir -p "$CONFIG_DIR"

# Check if this is a fresh installation (no settings.json exists)
if [ ! -f "$CONFIG_DIR/settings.json" ]; then
    echo "[INIT] First run detected - setting up initial configuration"

    # Apply configuration template with environment substitution
    if [ -f "$TEMPLATE_DIR/settings.json.template" ]; then
        echo "[DEBUG] Processing template file"

        # Substitute environment variables in settings template using envsubst
        envsubst < "$TEMPLATE_DIR/settings.json.template" > "$CONFIG_DIR/settings.json"

        # Validate JSON structure
        if ! cat "$CONFIG_DIR/settings.json" | jq . >/dev/null 2>&1; then
            echo "[ERROR] Generated settings.json is invalid JSON, using minimal config"
            echo '{}' > "$CONFIG_DIR/settings.json"
        fi

        chown 1000:1000 "$CONFIG_DIR/settings.json"
        chmod 644 "$CONFIG_DIR/settings.json"
        echo "[INIT] Configuration template applied successfully"
    else
        echo "[WARN] Template file not found: $TEMPLATE_DIR/settings.json.template"
        echo "[INIT] Creating minimal configuration"
        echo '{}' > "$CONFIG_DIR/settings.json"
        chown 1000:1000 "$CONFIG_DIR/settings.json"
    fi
else
    echo "[INIT] Existing installation detected, preserving existing configuration"
fi

# Ensure proper permissions on config directory
chown -R 1000:1000 "$CONFIG_DIR"

echo "[INIT] Starting Jellyseer..."
# Execute the original Jellyseer entrypoint and command
exec /sbin/tini -- pnpm start