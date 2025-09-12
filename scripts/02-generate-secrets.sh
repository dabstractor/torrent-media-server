#!/usr/bin/with-contenv bash
# 02-generate-secrets.sh - Generate secure API keys and passwords
# This script creates cryptographically secure secrets for services

echo "=== Generating secure secrets ==="

# Check if already initialized to avoid regenerating secrets
if [ -f /config/.secrets-complete ]; then
    echo "Secrets already generated, skipping..."
    exit 0
fi

# Generate random hex string function using /dev/urandom
generate_hex() {
    tr -dc 'a-f0-9' < /dev/urandom | head -c ${1:-32}
}

# Generate random base64 string function using /dev/urandom
generate_base64() {
    tr -dc 'A-Za-z0-9' < /dev/urandom | head -c ${1:-16}
}

# Generate API keys if not provided via environment
export SONARR_API_KEY=${SONARR_API_KEY:-$(generate_hex 32)}
export RADARR_API_KEY=${RADARR_API_KEY:-$(generate_hex 32)}
export PROWLARR_API_KEY=${PROWLARR_API_KEY:-$(generate_hex 32)}

# Generate passwords if not provided
QBITTORRENT_PASSWORD=${QBITTORRENT_PASSWORD:-$(openssl rand -base64 16)}

# Generate password hashes for applications that require them

# qBittorrent uses simple password - hash generation not needed for basic auth
export QBITTORRENT_PASSWORD_HASH="$QBITTORRENT_PASSWORD"

# Store generated secrets for reference
cat > /config/generated/.secrets << EOF
# Generated secrets - DO NOT COMMIT TO VERSION CONTROL
SONARR_API_KEY=$SONARR_API_KEY
RADARR_API_KEY=$RADARR_API_KEY
PROWLARR_API_KEY=$PROWLARR_API_KEY
QBITTORRENT_USERNAME=${QBITTORRENT_USERNAME:-admin}
QBITTORRENT_PASSWORD=$QBITTORRENT_PASSWORD
QBITTORRENT_PASSWORD_HASH=$QBITTORRENT_PASSWORD_HASH
EOF

chmod 600 /config/generated/.secrets
chown abc:abc /config/generated/.secrets

echo "Secure secrets generated successfully"
echo "API keys and passwords stored in /config/generated/.secrets"

# Export secrets for use by subsequent scripts
set -a
source /config/generated/.secrets
set +a

# Mark secrets generation complete
touch /config/.secrets-complete

echo "=== Secret generation complete ==="