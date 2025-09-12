#!/bin/bash

# Script to backup complete Prowlarr configuration
BACKUP_DIR="./config/templates/prowlarr"
DB_FILE="./config/prowlarr/prowlarr.db"
CONFIG_FILE="./config/prowlarr/config.xml"

echo "Backing up complete Prowlarr configuration..."

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Copy the database file
echo "Backing up database..."
cp "$DB_FILE" "$BACKUP_DIR/prowlarr.db.template"

# Copy the config file
echo "Backing up config.xml..."
cp "$CONFIG_FILE" "$BACKUP_DIR/config.xml.template"

# Create SQL dumps for key tables
echo "Creating SQL dumps for key configuration tables..."
sqlite3 "$DB_FILE" ".dump Users" > "$BACKUP_DIR/users.sql"
sqlite3 "$DB_FILE" ".dump IndexerProxies" > "$BACKUP_DIR/indexer_proxies.sql"
sqlite3 "$DB_FILE" ".dump Indexers" > "$BACKUP_DIR/indexers.sql"
sqlite3 "$DB_FILE" ".dump Applications" > "$BACKUP_DIR/applications.sql"
sqlite3 "$DB_FILE" ".dump AppSyncProfiles" > "$BACKUP_DIR/app_sync_profiles.sql"
sqlite3 "$DB_FILE" ".dump ApplicationIndexerMapping" > "$BACKUP_DIR/app_indexer_mapping.sql"

# Create a complete database dump
echo "Creating complete database dump..."
sqlite3 "$DB_FILE" ".dump" > "$BACKUP_DIR/complete_database.sql"

echo "Backup completed successfully!"
echo "Files saved to: $BACKUP_DIR"