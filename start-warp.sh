#!/bin/bash
# Start the media server with Cloudflare WARP VPN (default)
# No credentials required - WARP works out of the box

echo "🚀 Starting media server with Cloudflare WARP VPN..."
echo "📡 All torrent traffic will be routed through Cloudflare WARP"
echo ""

docker-compose up -d

echo ""
echo "✅ Services started!"
echo "🌐 Check your VPN IP: docker exec vpn curl -s ipinfo.io/ip"
echo "📊 View logs: docker-compose logs -f vpn"