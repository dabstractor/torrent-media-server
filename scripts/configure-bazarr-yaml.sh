#!/bin/bash
# Properly configure Bazarr's existing YAML structure

CONFIG_FILE="/config/config/config.yaml"
SONARR_API_KEY="$1"
RADARR_API_KEY="$2"

echo "Configuring Bazarr YAML with Sonarr and Radarr settings..."

# Backup
cp "$CONFIG_FILE" "$CONFIG_FILE.pre-config"

# Use sed to update the existing sonarr section
sed -i "/^sonarr:/,/^[a-z]/ {
    s|  apikey: ''|  apikey: ${SONARR_API_KEY}|
    s|  apikey: .*|  apikey: ${SONARR_API_KEY}|
    s|  base_url: /|  base_url: ''|
    s|  ip: ''|  ip: sonarr|
    s|  ip: 127.0.0.1|  ip: sonarr|
    s|  ip: localhost|  ip: sonarr|
}" "$CONFIG_FILE"

# Use sed to update the existing radarr section
sed -i "/^radarr:/,/^[a-z]/ {
    s|  apikey: ''|  apikey: ${RADARR_API_KEY}|
    s|  apikey: .*|  apikey: ${RADARR_API_KEY}|
    s|  base_url: /|  base_url: ''|
    s|  ip: ''|  ip: radarr|
    s|  ip: 127.0.0.1|  ip: radarr|
    s|  ip: localhost|  ip: radarr|
}" "$CONFIG_FILE"

# Verify changes
if grep -q "apikey: ${SONARR_API_KEY}" "$CONFIG_FILE" && grep -q "apikey: ${RADARR_API_KEY}" "$CONFIG_FILE"; then
    echo "Configuration successful!"
    echo "  Sonarr: sonarr:8989 (API key configured)"
    echo "  Radarr: radarr:7878 (API key configured)"
    exit 0
else
    echo "Configuration failed - restoring backup"
    cp "$CONFIG_FILE.pre-config" "$CONFIG_FILE"
    exit 1
fi
