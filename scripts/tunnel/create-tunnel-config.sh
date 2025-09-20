#!/bin/sh
set -e

# Configuration
CLOUDFLARED_DIR="/home/nonroot/.cloudflared"
CONFIG_FILE="$CLOUDFLARED_DIR/config.yml"
TUNNEL_NAME="${TUNNEL_NAME:-jellyfin-tunnel}"
SERVICE_URL="${JELLYFIN_SERVICE_URL:-http://jellyfin:8096}"

echo "🔧 Creating tunnel configuration..."

# Check if tunnel exists
if ! cloudflared tunnel list | grep -q "$TUNNEL_NAME"; then
    echo "❌ Tunnel '$TUNNEL_NAME' not found. Please create it first:"
    echo "   cloudflared tunnel create $TUNNEL_NAME"
    exit 1
fi

# Get tunnel ID
TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')

if [ -z "$TUNNEL_ID" ]; then
    echo "❌ Could not determine tunnel ID"
    exit 1
fi

echo "✅ Found tunnel: $TUNNEL_NAME ($TUNNEL_ID)"

# Create config file
cat > "$CONFIG_FILE" << EOF
tunnel: $TUNNEL_ID
credentials-file: $CLOUDFLARED_DIR/$TUNNEL_ID.json

ingress:
  - service: $SERVICE_URL
    originRequest:
      noTLSVerify: true
      connectTimeout: 30s
      tcpKeepAlive: 30s
      keepAliveConnections: 1024
      keepAliveTimeout: 1m30s
  - service: http_status:404
EOF

echo "✅ Configuration created at $CONFIG_FILE"
echo "✅ Tunnel setup complete!"
echo ""
echo "You can now restart the cloudflared container to use the tunnel:"
echo "  docker restart ${CONTAINER_PREFIX:-jellyfin-}cloudflared"