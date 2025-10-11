#!/bin/bash
set -e

# Custom entrypoint for Huntarr with dependency readiness checks
CONFIG_DIR="/config"

echo "[HUNTARR] Initialization starting..."

# Ensure config directory is writable
if [ ! -w "$CONFIG_DIR" ]; then
    echo "[HUNTARR] ERROR: $CONFIG_DIR is not writable"
    exit 1
fi

echo "[HUNTARR] Config directory is writable"

# Wait for *arr services to be ready
wait_for_service() {
    local service=$1
    local port=$2
    local max_attempts=30
    local attempt=0

    echo "[HUNTARR] Waiting for $service to be ready..."

    while [ $attempt -lt $max_attempts ]; do
        if curl -s -f "http://${service}:${port}/ping" >/dev/null 2>&1; then
            echo "[HUNTARR] $service is ready"
            return 0
        fi

        attempt=$((attempt + 1))
        echo "[HUNTARR] Waiting for $service... (attempt $attempt/$max_attempts)"
        sleep 2
    done

    echo "[HUNTARR] WARNING: $service not available after ${max_attempts} attempts"
    return 1
}

# Wait for dependencies (non-blocking - warn but continue)
wait_for_service "sonarr" "8989" || true
wait_for_service "radarr" "7878" || true
wait_for_service "prowlarr" "9696" || true

# Configure database with default settings if needed
configure_database() {
    local db_path="$CONFIG_DIR/huntarr.db"
    local template_path="/templates/init-config.sql"

    # Wait for Huntarr to create the initial database
    echo "[HUNTARR] Waiting for database initialization..."
    local max_wait=30
    local waited=0
    while [ ! -f "$db_path" ] && [ $waited -lt $max_wait ]; do
        sleep 1
        waited=$((waited + 1))
    done

    if [ ! -f "$db_path" ]; then
        echo "[HUNTARR] Database not found, will be created by application"
        return 0
    fi

    # Check if user already exists
    local user_count=$(python3 -c "import sqlite3; conn = sqlite3.connect('$db_path'); print(conn.execute('SELECT COUNT(*) FROM users').fetchone()[0]); conn.close()")

    if [ "$user_count" = "0" ]; then
        echo "[HUNTARR] No users found, applying default configuration..."

        # Set environment variables for substitution
        SONARR_URL_VALUE="${SONARR_BACKEND_URL:-http://sonarr:8989}"
        RADARR_URL_VALUE="${RADARR_BACKEND_URL:-http://radarr:7878}"
        PROWLARR_URL_VALUE="${PROWLARR_BACKEND_URL:-http://prowlarr:9696}"
        SONARR_API_KEY_VALUE="${SONARR_API_KEY}"
        RADARR_API_KEY_VALUE="${RADARR_API_KEY}"
        PROWLARR_API_KEY_VALUE="${PROWLARR_API_KEY}"

        # Apply configuration using Python to handle JSON properly
        python3 << PYEOF
import sqlite3
import json

db_path = '$CONFIG_DIR/huntarr.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Create default admin user (password: admin)
cursor.execute("""
    INSERT OR IGNORE INTO users (id, username, password, created_at, updated_at, two_fa_enabled)
    VALUES (1, 'admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5eDXMaAQ7kY3i', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
""")

# Configure Sonarr
sonarr_config = {
    "instances": [{
        "name": "Default",
        "api_url": "$SONARR_URL_VALUE",
        "api_key": "$SONARR_API_KEY_VALUE",
        "enabled": True,
        "swaparr_enabled": False,
        "hunt_missing_items": 10,
        "hunt_upgrade_items": 0,
        "hunt_missing_mode": "seasons_packs",
        "upgrade_mode": "seasons_packs",
        "state_management_mode": "custom",
        "state_management_hours": 168,
        "air_date_delay_days": 0
    }],
    "sleep_duration": 1800,
    "hourly_cap": 20,
    "monitored_only": True,
    "skip_future_episodes": True,
    "tag_processed_items": True,
    "custom_tags": {
        "missing": "huntarr-missing",
        "upgrade": "huntarr-upgrade",
        "shows_missing": "huntarr-shows-missing"
    }
}

cursor.execute("""
    INSERT OR REPLACE INTO app_configs (app_type, config_data, created_at, updated_at)
    VALUES ('sonarr', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
""", (json.dumps(sonarr_config),))

# Configure Radarr
radarr_config = {
    "instances": [{
        "name": "Default",
        "api_url": "$RADARR_URL_VALUE",
        "api_key": "$RADARR_API_KEY_VALUE",
        "enabled": True,
        "swaparr_enabled": False,
        "hunt_missing_movies": 10,
        "hunt_upgrade_movies": 0,
        "state_management_mode": "custom",
        "state_management_hours": 168,
        "release_date_delay_days": 0
    }],
    "sleep_duration": 1800,
    "hourly_cap": 20,
    "monitored_only": True,
    "skip_future_releases": False,
    "process_no_release_dates": False,
    "tag_processed_items": True,
    "custom_tags": {
        "missing": "huntarr-missing",
        "upgrade": "huntarr-upgrade"
    }
}

cursor.execute("""
    INSERT OR REPLACE INTO app_configs (app_type, config_data, created_at, updated_at)
    VALUES ('radarr', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
""", (json.dumps(radarr_config),))

# Configure Prowlarr
prowlarr_config = {
    "instances": [],
    "enabled": True,
    "name": "Prowlarr",
    "api_url": "$PROWLARR_URL_VALUE",
    "api_key": "$PROWLARR_API_KEY_VALUE"
}

cursor.execute("""
    INSERT OR REPLACE INTO app_configs (app_type, config_data, created_at, updated_at)
    VALUES ('prowlarr', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
""", (json.dumps(prowlarr_config),))

# Configure authentication bypass for local network access
print("[HUNTARR] Configuring local network authentication bypass...")
cursor.execute("""
    INSERT OR REPLACE INTO general_settings (setting_key, setting_value, setting_type, created_at, updated_at)
    VALUES ('auth_mode', 'local_bypass', 'string', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
""")

cursor.execute("""
    INSERT OR REPLACE INTO general_settings (setting_key, setting_value, setting_type, created_at, updated_at)
    VALUES ('local_access_bypass', 'true', 'boolean', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
""")

conn.commit()
conn.close()
print("[HUNTARR] Default configuration applied successfully")
print("[HUNTARR] Local network authentication bypass enabled")
PYEOF

        echo "[HUNTARR] Configuration complete!"
        echo "[HUNTARR] - Admin username: admin"
        echo "[HUNTARR] - Admin password: admin (CHANGE THIS AFTER FIRST LOGIN)"
        echo "[HUNTARR] - Sonarr: ${SONARR_URL_VALUE}"
        echo "[HUNTARR] - Radarr: ${RADARR_URL_VALUE}"
        echo "[HUNTARR] - Prowlarr: ${PROWLARR_URL_VALUE}"
    else
        echo "[HUNTARR] User already exists, skipping configuration"
    fi
}

# Check if configuration is needed before starting Huntarr
DB_PATH="$CONFIG_DIR/huntarr.db"
if [ ! -f "$DB_PATH" ]; then
    echo "[HUNTARR] First run - starting Huntarr to initialize database..."

    # Start Huntarr in background to create database
    python3 /app/main.py &
    HUNTARR_PID=$!

    # Wait for database to be created
    echo "[HUNTARR] Waiting for database creation..."
    max_wait=60
    waited=0
    while [ ! -f "$DB_PATH" ] && [ $waited -lt $max_wait ]; do
        sleep 1
        waited=$((waited + 1))
    done

    if [ -f "$DB_PATH" ]; then
        echo "[HUNTARR] Database created, applying configuration..."

        # Give Huntarr a moment to finish initial setup
        sleep 3

        # Stop Huntarr
        kill $HUNTARR_PID 2>/dev/null || true
        wait $HUNTARR_PID 2>/dev/null || true

        # Apply configuration
        configure_database

        echo "[HUNTARR] Configuration applied, starting Huntarr..."
    else
        echo "[HUNTARR] Database creation timed out"
        kill $HUNTARR_PID 2>/dev/null || true
    fi
fi

echo "[HUNTARR] Starting Huntarr application..."

# Execute Huntarr (replace current process, preserve PID 1)
exec python3 /app/main.py
