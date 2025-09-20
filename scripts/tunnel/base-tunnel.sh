#!/bin/sh
set -e

# Service-specific configuration (customize these variables)
SERVICE_NAME="${SERVICE_NAME:-Generic Service}"
SERVICE_URL="${SERVICE_URL:-http://localhost:8080}"
SERVICE_PORT="${SERVICE_PORT:-8080}"
PROTOCOL_OPTS="${PROTOCOL_OPTS:---protocol http2}"

echo "🚀 Starting Cloudflare Tunnel for $SERVICE_NAME..."

# Install cloudflared if not present
install_cloudflared() {
    if ! command -v cloudflared >/dev/null 2>&1; then
        echo "📦 Installing cloudflared..."
        apk add --no-cache curl
        curl -L --output /usr/local/bin/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
        chmod +x /usr/local/bin/cloudflared
        echo "✅ cloudflared installed"
    fi
}

# Run named tunnel with token
run_named_tunnel() {
    echo "🔗 Named Tunnel detected! Using permanent tunnel..."
    echo "✅ This URL will never change on restart"

    # Start named tunnel with token
    cloudflared tunnel --no-autoupdate run --token "$TUNNEL_TOKEN" 2>&1 | tee /tmp/tunnel.log &
    TUNNEL_PID=$!

    # Wait a moment for tunnel to start
    sleep 10

    # Try to extract URL from logs (may not always be present)
    URL=$(grep -o 'https://[a-zA-Z0-9-]*\.cfargotunnel\.com' /tmp/tunnel.log | head -1 2>/dev/null || true)

    if [ -n "$URL" ]; then
        echo "$URL" > /shared-data/tunnel-url.txt
        echo "🎉 Named Tunnel URL: $URL"
        echo "📝 URL saved to tunnel-url.txt"
    else
        echo "🔗 Named Tunnel is running (URL will be visible in Cloudflare dashboard)"
        echo "💡 Check Zero Trust > Networks > Tunnels for your permanent URL"
    fi
}

# Run quick tunnel
run_quick_tunnel() {
    echo "ℹ️  No tunnel token found - using Quick Tunnel"
    echo "ℹ️  This provides instant access with temporary URLs"

    # Start quick tunnel and capture output
    cloudflared tunnel --url "$SERVICE_URL" $PROTOCOL_OPTS 2>&1 | tee /tmp/tunnel.log &
    TUNNEL_PID=$!

    echo "⏳ Waiting for tunnel URL..."

    # Wait for URL to appear in logs
    sleep 15
    URL=$(grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' /tmp/tunnel.log | head -1 2>/dev/null || true)

    if [ -n "$URL" ]; then
        echo "✅ Tunnel URL: $URL"
        echo "$URL" > /shared-data/tunnel-url.txt
        echo "📝 URL saved to tunnel-url.txt"
        echo ""
        echo "🎉 SUCCESS! Your $SERVICE_NAME server is now accessible remotely!"

        show_quick_tunnel_limitations
        show_upgrade_instructions

        echo ""
        echo "🚀 Your tunnel is ready! Access $SERVICE_NAME at: $URL"
    else
        echo "⚠️  URL not found yet, tunnel may still be starting..."
    fi
}

# Show limitations of quick tunnels
show_quick_tunnel_limitations() {
    echo ""
    echo "⚠️  IMPORTANT: Quick Tunnel Limitations"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "• This URL is TEMPORARY and changes every restart"
    echo "• Bookmarks and shared links will break after restarts"
    echo "• Mobile apps will need reconfiguration after restarts"
}

# Show upgrade instructions (can be customized per service)
show_upgrade_instructions() {
    echo ""
    echo "🔗 For a PERMANENT URL that never changes:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "1. Get free Cloudflare account: https://dash.cloudflare.com"
    echo "2. Go to Zero Trust > Networks > Tunnels"
    echo "3. Click 'Add a tunnel' > Choose 'Cloudflared' > Next"
    echo "4. Name your tunnel (e.g. '$(echo "$SERVICE_NAME" | tr '[:upper:]' '[:lower:]')') > Save tunnel"
    echo "5. Choose 'Docker' environment + '64-bit' architecture"
    echo "6. Copy token from: cloudflared tunnel run --token eyJ..."
    echo "7. Add to .env file: TUNNEL_TOKEN=your_token_here"
    echo "8. Restart: docker restart \${CONTAINER_PREFIX}cloudflared"
    echo "9. Get your permanent *.cfargotunnel.com URL!"
    echo ""
    echo "📖 Full guide: See config/$(echo "$SERVICE_NAME" | tr '[:upper:]' '[:lower:]')/tunnel-setup/CLOUDFLARE_SETUP_GUIDE.md"
}

# Main execution
main() {
    install_cloudflared

    # Check if user provided a tunnel token
    if [ -n "$TUNNEL_TOKEN" ]; then
        run_named_tunnel
    else
        run_quick_tunnel
    fi

    # Continue running tunnel
    wait $TUNNEL_PID
}

# Run main function
main "$@"