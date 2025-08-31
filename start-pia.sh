#!/bin/bash
# Start the media server with PIA VPN
# Requires PIA credentials in .env file

echo "🔐 Starting media server with Private Internet Access VPN..."
echo "📋 Checking PIA configuration..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "📝 Please copy .env.example to .env and configure your PIA credentials"
    exit 1
fi

# Check if PIA credentials are set
if ! grep -q "^PIA_USER=" .env || ! grep -q "^PIA_PASS=" .env; then
    echo "❌ Error: PIA credentials not configured!"
    echo "📝 Please set PIA_USER and PIA_PASS in your .env file"
    echo "💡 Example:"
    echo "   PIA_USER=your_pia_username"
    echo "   PIA_PASS=your_pia_password"
    exit 1
fi

# Check if credentials are not just placeholders
if grep -q "your_pia_username" .env || grep -q "your_pia_password" .env; then
    echo "❌ Error: Please replace placeholder PIA credentials with your actual credentials"
    exit 1
fi

echo "✅ PIA configuration looks good!"
echo "🚀 Starting services with PIA VPN..."
echo ""

docker-compose -f docker-compose.yml -f docker-compose.pia.yml up -d

echo ""
echo "✅ Services started with PIA!"
echo "🌐 Check your VPN IP: docker exec vpn curl -s ipinfo.io/ip"
echo "📊 View logs: docker-compose logs -f vpn"
echo "🔍 Port forwarding status will be shown in the logs above"