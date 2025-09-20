#!/bin/sh
set -e

URL_FILE="/shared-data/tunnel-url.txt"
LOG_FILE="/tmp/cloudflared.log"
CONFIG_FILE="/cloudflared-config/config.yml"
CREDENTIALS_DIR="/cloudflared-config"
TUNNEL_NAME="jellyfin-tunnel"

# Ensure shared directory exists
mkdir -p "$(dirname "$URL_FILE")"
mkdir -p "$CREDENTIALS_DIR"

# Install dependencies
apk add --no-cache curl jq openssl

# Check if tunnel is already configured
if [ -f "$CONFIG_FILE" ]; then
    echo "✅ Tunnel configuration found at $CONFIG_FILE"

    # Install cloudflared if not present
    if ! command -v cloudflared >/dev/null 2>&1; then
        echo "Installing cloudflared..."
        curl -L --output cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
        chmod +x cloudflared
        mv cloudflared /usr/local/bin/
    fi

    # Start tunnel temporarily to extract URL if not already saved
    if [ ! -f "$URL_FILE" ]; then
        echo "🔗 Extracting tunnel URL..."
        cloudflared tunnel --config "$CONFIG_FILE" run > "$LOG_FILE" 2>&1 &
        TUNNEL_PID=$!

        # Wait for URL and save it
        URL=""
        ATTEMPTS=0
        MAX_ATTEMPTS=30

        while [ -z "$URL" ] && [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
            sleep 2
            ATTEMPTS=$((ATTEMPTS + 1))
            URL=$(grep -o 'https://[a-zA-Z0-9-]\+\.cfargotunnel\.com' "$LOG_FILE" 2>/dev/null || true)
        done

        if [ -n "$URL" ]; then
            echo "✅ Tunnel URL extracted: $URL"
            echo "$URL" > "$URL_FILE"
        else
            echo "⚠️  Could not extract tunnel URL automatically"
        fi

        # Stop temporary tunnel
        kill $TUNNEL_PID 2>/dev/null || true
    else
        TUNNEL_URL=$(cat "$URL_FILE")
        echo "✅ Tunnel URL: $TUNNEL_URL"
    fi

    echo "✅ Tunnel setup complete!"
    exit 0
fi

# API token is present, create tunnel automatically
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "❌ ERROR: CLOUDFLARE_API_TOKEN not found in environment"
    echo "Please add your Cloudflare API token to the .env file"
    exit 1
fi

echo "🚀 Creating Cloudflare tunnel automatically using API token..."

# Install cloudflared first
echo "Installing cloudflared..."
curl -L --output cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared
mv cloudflared /usr/local/bin/

# Set API token for cloudflared
export CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN"

# Try using cloudflared's built-in tunnel creation with token
echo "Creating tunnel using cloudflared: $TUNNEL_NAME"
if cloudflared tunnel create "$TUNNEL_NAME" 2>&1; then
    echo "✅ Tunnel created successfully"

    # List tunnels to get the ID
    TUNNEL_LIST=$(cloudflared tunnel list 2>&1)
    TUNNEL_ID=$(echo "$TUNNEL_LIST" | grep "$TUNNEL_NAME" | awk '{print $1}')

    if [ -z "$TUNNEL_ID" ]; then
        echo "❌ Could not find tunnel ID"
        exit 1
    fi

    echo "✅ Tunnel ID: $TUNNEL_ID"

    # Create config file
    cat > "$CONFIG_FILE" << EOF
tunnel: $TUNNEL_ID
credentials-file: $CREDENTIALS_DIR/$TUNNEL_ID.json

ingress:
  - service: http://jellyfin:8096
    originRequest:
      noTLSVerify: true
      connectTimeout: 30s
  - service: http_status:404
EOF

    echo "✅ Configuration file created!"

    # Start tunnel briefly to get URL
    echo "🔗 Starting tunnel to extract URL..."
    cloudflared tunnel --config "$CONFIG_FILE" run > "$LOG_FILE" 2>&1 &
    TUNNEL_PID=$!

    # Wait for URL and save it
    URL=""
    ATTEMPTS=0
    MAX_ATTEMPTS=30

    while [ -z "$URL" ] && [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
        sleep 2
        ATTEMPTS=$((ATTEMPTS + 1))
        URL=$(grep -o 'https://[a-zA-Z0-9-]\+\.cfargotunnel\.com' "$LOG_FILE" 2>/dev/null || true)
    done

    if [ -n "$URL" ]; then
        echo "✅ Tunnel URL extracted: $URL"
        echo "$URL" > "$URL_FILE"
    else
        echo "⚠️  Could not extract tunnel URL automatically"
    fi

    # Stop tunnel
    kill $TUNNEL_PID 2>/dev/null || true

    echo "✅ Cloudflare tunnel setup complete!"
    echo "✅ Tunnel ID: $TUNNEL_ID"
    echo "✅ Tunnel URL: ${URL:-'Will be available when tunnel starts'}"
    echo "✅ Configuration saved to: $CONFIG_FILE"

else
    echo "❌ Failed to create tunnel with cloudflared"
    echo ""
    echo "🔧 Your API token needs these permissions:"
    echo "  - Account: Cloudflare Tunnel:Edit"
    echo "  - Zone: Zone:Read (for the domain you want to use)"
    echo ""
    echo "Please create a new token at: https://dash.cloudflare.com/profile/api-tokens"
    echo "Or use the manual setup method described in CLOUDFLARE_TUNNEL_SETUP.md"
    exit 1
fi