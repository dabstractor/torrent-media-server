#!/bin/bash

# Initialize Prowlarr configuration
CONFIG_FILE="/config/config.xml"
TEMPLATE_FILE="/templates/config.xml"

# Only copy template if config doesn't exist
if [ ! -f "$CONFIG_FILE" ] && [ -f "$TEMPLATE_FILE" ]; then
    echo "Initializing Prowlarr config from template..."
    cp "$TEMPLATE_FILE" "$CONFIG_FILE"
    chown 1000:1000 "$CONFIG_FILE"
    echo "Prowlarr config initialized with fixed API key"
fi