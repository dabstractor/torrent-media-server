#!/bin/bash

# Script to restore complete Prowlarr configuration with fixed API key

# Load environment variables from .env file
if [ -f ".env" ]; then
    # Parse .env file and export variables, ignoring comments and empty lines
    export $(grep -v '^#' .env | grep -v '^$' | xargs)
fi

TEMPLATE_DIR="${CONFIG_ROOT:-./config}/templates/prowlarr"
CONFIG_DIR="${CONFIG_ROOT:-./config}/prowlarr"
DESIRED_API_KEY="${PROWLARR_API_KEY:-2feed2fe71424878bb7945ead222f367}"

echo "Restoring complete Prowlarr configuration..."

# Stop Prowlarr if it's running
echo "Stopping Prowlarr container..."
docker compose stop prowlarr

# Wait a moment for container to fully stop
sleep 5

# Backup existing config if it exists
if [ -f "$CONFIG_DIR/prowlarr.db" ]; then
    echo "Backing up existing configuration..."
    mv "$CONFIG_DIR/prowlarr.db" "$CONFIG_DIR/prowlarr.db.backup.$(date +%Y%m%d_%H%M%S)"
fi

if [ -f "$CONFIG_DIR/config.xml" ]; then
    mv "$CONFIG_DIR/config.xml" "$CONFIG_DIR/config.xml.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Restore database from template
if [ -f "$TEMPLATE_DIR/prowlarr.db.template" ]; then
    echo "Restoring database from template..."
    cp "$TEMPLATE_DIR/prowlarr.db.template" "$CONFIG_DIR/prowlarr.db"
    chown 1000:1000 "$CONFIG_DIR/prowlarr.db"
else
    echo "ERROR: Database template not found at $TEMPLATE_DIR/prowlarr.db.template"
    echo "Please run backup-prowlarr-config.sh first to create the template"
    exit 1
fi

# Restore config.xml from template
if [ -f "$TEMPLATE_DIR/config.xml.template" ]; then
    echo "Restoring config.xml from template..."
    cp "$TEMPLATE_DIR/config.xml.template" "$CONFIG_DIR/config.xml"
    chown 1000:1000 "$CONFIG_DIR/config.xml"
    
    # Ensure the API key is set to our desired value
    echo "Setting API key to fixed value..."
    sed -i "s/<ApiKey>.*<\/ApiKey>/<ApiKey>$DESIRED_API_KEY<\/ApiKey>/" "$CONFIG_DIR/config.xml"
else
    echo "ERROR: Config template not found at $TEMPLATE_DIR/config.xml.template"
    exit 1
fi

# Start Prowlarr
echo "Starting Prowlarr container..."
docker compose up prowlarr -d

echo ""
echo "Prowlarr configuration restored successfully!"
echo "Configuration includes:"
echo "- Fixed API Key: $DESIRED_API_KEY"
echo "- Admin user (admin/password)"
echo "- FlareSolverr proxy configuration"
echo "- All configured indexers"
echo "- Authentication: Forms with local bypass"
echo ""
echo "Waiting for Prowlarr to start..."
sleep 15

# Check if Prowlarr is healthy
if docker ps | grep prowlarr | grep -q "healthy"; then
    echo "✅ Prowlarr is now healthy and ready!"
else
    echo "⚠️  Prowlarr is starting... Check 'docker ps' for status"
fi