#!/bin/bash

# Script to set fixed Prowlarr API key
# This should be run after Prowlarr container is healthy

CONFIG_FILE="./config/prowlarr/config.xml"
DESIRED_API_KEY="2feed2fe71424878bb7945ead222f367"

if [ -f "$CONFIG_FILE" ]; then
    # Get current API key
    CURRENT_KEY=$(grep -o '<ApiKey>[^<]*</ApiKey>' "$CONFIG_FILE" | sed 's/<ApiKey>\(.*\)<\/ApiKey>/\1/')
    
    if [ "$CURRENT_KEY" != "$DESIRED_API_KEY" ]; then
        echo "Updating Prowlarr API key from $CURRENT_KEY to $DESIRED_API_KEY"
        sed -i "s/<ApiKey>.*<\/ApiKey>/<ApiKey>$DESIRED_API_KEY<\/ApiKey>/" "$CONFIG_FILE"
        echo "API key updated successfully. Restarting Prowlarr container..."
        docker compose restart prowlarr
    else
        echo "API key already set correctly"
    fi
else
    echo "Prowlarr config file not found at $CONFIG_FILE"
    exit 1
fi