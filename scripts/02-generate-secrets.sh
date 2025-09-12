#!/usr/bin/with-contenv bash
# 02-generate-secrets.sh - Generate secure API keys and passwords
# This script creates cryptographically secure secrets for services

echo "=== Generating secure secrets ==="

# Check if already initialized to avoid regenerating secrets
if [ -f /config/.secrets-complete ]; then
    echo "Secrets already generated, skipping..."
    exit 0
fi

# Generate API keys if not provided via environment
export SONARR_API_KEY=${SONARR_API_KEY:-$(openssl rand -hex 16)}
export RADARR_API_KEY=${RADARR_API_KEY:-$(openssl rand -hex 16)}
export PROWLARR_API_KEY=${PROWLARR_API_KEY:-$(openssl rand -hex 16)}

# Generate passwords if not provided
TRANSMISSION_PASSWORD=${TRANSMISSION_PASSWORD:-$(openssl rand -base64 16)}
QBITTORRENT_PASSWORD=${QBITTORRENT_PASSWORD:-$(openssl rand -base64 16)}

# Generate password hashes for applications that require them
# Transmission uses SHA1 salt format
TRANSMISSION_PASSWORD_HASH=$(echo -n "${TRANSMISSION_PASSWORD}" | sha1sum | cut -d' ' -f1)
export TRANSMISSION_PASSWORD_HASH="{$(openssl rand -hex 8)$TRANSMISSION_PASSWORD_HASH"

# qBittorrent uses PBKDF2
export QBITTORRENT_PASSWORD_HASH=$(python3 -c "import hashlib; import os; import base64; salt=os.urandom(8); print('@ByteArray(' + base64.b64encode(hashlib.pbkdf2_hmac('sha512', b'$QBITTORRENT_PASSWORD', salt, 100000)).decode() + ')')")

# Store generated secrets for reference
cat > /config/generated/.secrets << EOF
# Generated secrets - DO NOT COMMIT TO VERSION CONTROL
SONARR_API_KEY=$SONARR_API_KEY
RADARR_API_KEY=$RADARR_API_KEY
PROWLARR_API_KEY=$PROWLARR_API_KEY
TRANSMISSION_USERNAME=${TRANSMISSION_USERNAME:-admin}
TRANSMISSION_PASSWORD=$TRANSMISSION_PASSWORD
TRANSMISSION_PASSWORD_HASH=$TRANSMISSION_PASSWORD_HASH
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