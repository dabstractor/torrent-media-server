#!/bin/sh
CONFIG_DIR="/app/config"
TEMPLATE_DIR="/templates"
DB_DIR="$CONFIG_DIR/db"

echo "[INIT] Overseerr custom entrypoint starting..."
echo "[DEBUG] Template directory contents:"
ls -la "$TEMPLATE_DIR"
echo "[DEBUG] Config directory contents:"
ls -la "$CONFIG_DIR"

# Function to generate a random string
generate_random_string() {
    cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w ${1:-32} | head -n 1
}

# Function to generate VAPID keys
generate_vapid_keys() {
    # Use node to generate VAPID keys
    node -e "
        const webpush = require('web-push');
        const vapidKeys = webpush.generateVAPIDKeys();
        console.log(vapidKeys.publicKey);
        console.log(vapidKeys.privateKey);
    " 2>/dev/null || {
        # Fallback if web-push is not available
        echo "B$(generate_random_string 87)"  # Public key format
        echo "$(generate_random_string 43)"   # Private key format
    }
}

# Check if this is a fresh installation (no database files exist)
if [ ! -f "$DB_DIR/db.sqlite3" ]; then
    echo "[INIT] Fresh installation detected"

    # Always process the template to ensure environment variables are substituted
    echo "[INIT] Processing settings template"

    if [ -f "$TEMPLATE_DIR/settings.json.template" ]; then
        echo "[DEBUG] Processing template file"

        # Generate new secrets if not provided in environment
        if [ -z "$OVERSEERR_CLIENT_ID" ]; then
            export OVERSEERR_CLIENT_ID=$(generate_random_string 36)
        fi

        if [ -z "$OVERSEERR_API_KEY" ]; then
            export OVERSEERR_API_KEY=$(generate_random_string 50)
        fi

        if [ -z "$OVERSEERR_VAPID_PRIVATE" ] || [ -z "$OVERSEERR_VAPID_PUBLIC" ]; then
            echo "[INIT] Generating new VAPID keys"
            VAPID_KEYS=$(generate_vapid_keys)
            export OVERSEERR_VAPID_PUBLIC=$(echo "$VAPID_KEYS" | head -n 1)
            export OVERSEERR_VAPID_PRIVATE=$(echo "$VAPID_KEYS" | tail -n 1)
        fi

        # Substitute environment variables in settings template using envsubst
        envsubst < "$TEMPLATE_DIR/settings.json.template" > "$CONFIG_DIR/settings.json"

        chown 1000:1000 "$CONFIG_DIR/settings.json"
        chmod 644 "$CONFIG_DIR/settings.json"
        echo "[INIT] Settings.json created from template with new secrets"
    else
        echo "[ERROR] Template file not found: $TEMPLATE_DIR/settings.json.template"
    fi
else
    echo "[INIT] Existing installation detected, preserving existing database"

    # For existing installations, we still process the template but preserve important settings
    if [ -f "$TEMPLATE_DIR/settings.json.template" ] && [ -f "$CONFIG_DIR/settings.json" ]; then
        echo "[INIT] Merging configuration settings"

        # We'll preserve the existing settings.json but ensure environment variables are updated
        # This is a simple approach - in production you might want a more sophisticated merge
        envsubst < "$TEMPLATE_DIR/settings.json.template" > "$CONFIG_DIR/settings.json.new"

        # For now, we'll just use the new template with env vars, but you could implement
        # a more sophisticated merge that preserves user data while updating service configs
        mv "$CONFIG_DIR/settings.json.new" "$CONFIG_DIR/settings.json"

        chown 1000:1000 "$CONFIG_DIR/settings.json"
        chmod 644 "$CONFIG_DIR/settings.json"
        echo "[INIT] Settings.json updated with environment variables"
    fi
fi

echo "[INIT] Starting Overseerr..."
# Set NODE_ENV to production to ensure we run in production mode
export NODE_ENV=production

# Ensure database directory exists with correct permissions
mkdir -p "$DB_DIR"
chown 1000:1000 "$DB_DIR"

# Try to run the production version directly
if [ -f "/app/dist/index.js" ]; then
    exec /usr/local/bin/node /app/dist/index.js
else
    echo "[ERROR] Could not find production build, falling back to default entrypoint"
    # Fall back to the default entrypoint
    exec /usr/local/bin/node dist/index.js
fi
