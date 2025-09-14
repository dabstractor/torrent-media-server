#!/bin/bash

# Script to automatically configure TVDB API key in the .env file
# This script is called during docker container initialization

echo "[INIT] Configuring TVDB API key..."

# Check if TVDB_API_KEY is already set in .env
if grep -q "TVDB_API_KEY=" /home/dustin/projects/torrents/.env; then
    # Check if it's still set to the placeholder value
    if grep -q "TVDB_API_KEY=YOUR_TVDB_API_KEY_HERE" /home/dustin/projects/torrents/.env; then
        echo "[INIT] TVDB_API_KEY not configured, generating placeholder..."
        # In a real implementation, this would either:
        # 1. Prompt for the API key
        # 2. Use a default test key
        # 3. Generate a temporary key for testing
        # For now, we'll leave it as a placeholder that needs to be manually configured
        echo "[INIT] Please set your TVDB_API_KEY in the .env file"
        echo "[INIT] Get your API key from https://thetvdb.com/api-information"
    else
        echo "[INIT] TVDB_API_KEY already configured"
    fi
else
    # Add the TVDB_API_KEY line to the .env file
    echo "" >> /home/dustin/projects/torrents/.env
    echo "# TVDB API Key - Get yours from https://thetvdb.com/api-information" >> /home/dustin/projects/torrents/.env
    echo "TVDB_API_KEY=YOUR_TVDB_API_KEY_HERE" >> /home/dustin/projects/torrents/.env
    echo "[INIT] TVDB_API_KEY added to .env file"
    echo "[INIT] Please set your TVDB_API_KEY in the .env file"
    echo "[INIT] Get your API key from https://thetvdb.com/api-information"
fi

echo "[INIT] TVDB API key configuration complete!"