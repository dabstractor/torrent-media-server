#!/usr/bin/with-contenv bash
# 03-generate-configs.sh - Generate service configurations from templates
# This script processes templates to create runtime configurations

echo "=== Generating service configurations ==="

# Check if already initialized to avoid overwriting existing configs
if [ -f /config/.configs-complete ]; then
    echo "Configuration generation already complete, skipping..."
    exit 0
fi

# Source generated secrets
if [ -f /config/generated/.secrets ]; then
    set -a
    source /config/generated/.secrets
    set +a
fi

# Set default environment variables if not provided
export LOG_LEVEL=${LOG_LEVEL:-info}
export AUTH_METHOD=${AUTH_METHOD:-None}
export AUTH_REQUIRED=${AUTH_REQUIRED:-DisabledForLocalAddresses}

# Function to process template and generate config
process_template() {
    local service=$1
    local template_file=$2
    local output_file=$3
    
    if [ -f "$template_file" ]; then
        echo "Processing template: $template_file -> $output_file"
        envsubst < "$template_file" > "$output_file"
        
        # Validate XML syntax if it's an XML file
        if [[ "$output_file" == *.xml ]]; then
            if ! xmllint --noout "$output_file" 2>/dev/null; then
                echo "ERROR: Invalid XML generated for $service: $output_file"
                return 1
            fi
        fi
        
        echo "✓ Generated $service configuration"
    else
        echo "Warning: Template not found: $template_file"
    fi
}

# Generate configurations for each service
process_template "Prowlarr" "/templates/prowlarr/config.xml.template" "/config/config.xml"
process_template "Sonarr" "/templates/sonarr/config.xml.template" "/config/config.xml" 
process_template "Radarr" "/templates/radarr/config.xml.template" "/config/config.xml"
process_template "Plex" "/templates/plex/Preferences.xml.template" "/config/Library/Application Support/Plex Media Server/Preferences.xml"
process_template "Transmission" "/templates/transmission/settings.json.template" "/config/settings.json"
process_template "qBittorrent" "/templates/qbittorrent/qBittorrent.conf.template" "/config/qBittorrent/qBittorrent.conf"

# Create Plex directory structure
mkdir -p "/config/Library/Application Support/Plex Media Server"

# Set proper ownership and permissions
chown -R abc:abc /config
chmod 644 /config/*.xml /config/*.json /config/*/*.conf 2>/dev/null || true

echo "Service configurations generated successfully"

# Mark configuration generation complete  
touch /config/.configs-complete

echo "=== Configuration generation complete ==="