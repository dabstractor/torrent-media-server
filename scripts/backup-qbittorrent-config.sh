#!/bin/bash

# Script to backup complete qBittorrent configuration

# Load environment variables from .env file
if [ -f ".env" ]; then
    # Parse .env file and export variables, ignoring comments and empty lines
    set -a
    source .env
    set +a
fi

BACKUP_DIR="${CONFIG_ROOT:-./config}/templates/qbittorrent"
MAIN_CONFIG="${CONFIG_ROOT:-./config}/qbittorrent/qBittorrent/qBittorrent.conf"
RUNTIME_CONFIG="${CONFIG_ROOT:-./config}/qbittorrent/qBittorrent/config/qBittorrent.conf"
CATEGORIES_FILE="${CONFIG_ROOT:-./config}/qbittorrent/qBittorrent/config/categories.json"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "Backing up complete qBittorrent configuration..."

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create timestamped backup directory for versioned backups
VERSIONED_BACKUP_DIR="/tmp/qbt_config_backup_$TIMESTAMP"
mkdir -p "$VERSIONED_BACKUP_DIR"

# Copy the main config file
if [ -f "$MAIN_CONFIG" ]; then
    echo "Backing up main configuration..."
    cp "$MAIN_CONFIG" "$BACKUP_DIR/qBittorrent.conf.template"
    cp "$MAIN_CONFIG" "$VERSIONED_BACKUP_DIR/qBittorrent.conf"
    echo "✓ Main config backed up"
else
    echo "⚠ Main config file not found: $MAIN_CONFIG"
fi

# Copy the runtime config file
if [ -f "$RUNTIME_CONFIG" ]; then
    echo "Backing up runtime configuration..."
    cp "$RUNTIME_CONFIG" "$BACKUP_DIR/runtime-qBittorrent.conf.template"
    cp "$RUNTIME_CONFIG" "$VERSIONED_BACKUP_DIR/runtime-qBittorrent.conf"
    echo "✓ Runtime config backed up"
else
    echo "⚠ Runtime config file not found: $RUNTIME_CONFIG"
fi

# Copy the categories file
if [ -f "$CATEGORIES_FILE" ]; then
    echo "Backing up categories configuration..."
    cp "$CATEGORIES_FILE" "$BACKUP_DIR/categories.json.template"
    cp "$CATEGORIES_FILE" "$VERSIONED_BACKUP_DIR/categories.json"
    echo "✓ Categories config backed up"
else
    echo "⚠ Categories file not found: $CATEGORIES_FILE"
fi

# Create configuration summary
echo "Creating configuration summary..."
cat > "$VERSIONED_BACKUP_DIR/backup_info.txt" << EOF
qBittorrent Configuration Backup
Created: $(date)
Backup Directory: $VERSIONED_BACKUP_DIR
Template Directory: $BACKUP_DIR

Files Backed Up:
- Main Config: $([ -f "$MAIN_CONFIG" ] && echo "✓" || echo "✗") $MAIN_CONFIG
- Runtime Config: $([ -f "$RUNTIME_CONFIG" ] && echo "✓" || echo "✗") $RUNTIME_CONFIG
- Categories: $([ -f "$CATEGORIES_FILE" ] && echo "✓" || echo "✗") $CATEGORIES_FILE

Use this backup to restore qBittorrent configuration if needed.
EOF

echo "Backup completed successfully!"
echo "Template files saved to: $BACKUP_DIR"
echo "Versioned backup saved to: $VERSIONED_BACKUP_DIR"
echo "Backup info: $VERSIONED_BACKUP_DIR/backup_info.txt"