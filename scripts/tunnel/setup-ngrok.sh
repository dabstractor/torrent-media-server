#!/bin/bash

# Ngrok Setup Script
# This script gets your auth token and sets up ngrok

echo "🚀 Ngrok Setup for Jellyfin"
echo "=========================="
echo ""

echo "Opening: https://dashboard.ngrok.com/get-started/your-authtoken"
echo ""

# Try to open the auth token page
if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "https://dashboard.ngrok.com/get-started/your-authtoken" >/dev/null 2>&1 &
elif command -v open >/dev/null 2>&1; then
    open "https://dashboard.ngrok.com/get-started/your-authtoken" >/dev/null 2>&1 &
elif command -v cmd.exe >/dev/null 2>&1; then
    cmd.exe /c "start https://dashboard.ngrok.com/get-started/your-authtoken" >/dev/null 2>&1 &
else
    echo "Please manually open this URL in your browser:"
    echo "https://dashboard.ngrok.com/get-started/your-authtoken"
fi

echo ""
echo "📋 Please copy your Auth Token from the page and paste it below:"
read -p "Ngrok Auth Token: " ngrok_token

if [ -z "$ngrok_token" ]; then
    echo "❌ No auth token provided. Setup cancelled."
    exit 1
fi

# Update or create .env file with ngrok configuration
if [ -f ".env" ]; then
    # Check if NGROK_AUTHTOKEN already exists
    if grep -q "^NGROK_AUTHTOKEN=" .env; then
        # Update existing token
        sed -i "s/^NGROK_AUTHTOKEN=.*/NGROK_AUTHTOKEN=$ngrok_token/" .env
        echo "✅ Updated NGROK_AUTHTOKEN in .env file"
    else
        # Add new token
        echo "NGROK_AUTHTOKEN=$ngrok_token" >> .env
        echo "✅ Added NGROK_AUTHTOKEN to .env file"
    fi
else
    # Create new .env file
    cp .env.example .env
    echo "NGROK_AUTHTOKEN=$ngrok_token" >> .env
    echo "✅ Created .env file with ngrok configuration"
fi

echo ""
echo "Opening: https://dashboard.ngrok.com/cloud-edge/domains"
echo ""

# Try to open the static domains page
if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "https://dashboard.ngrok.com/cloud-edge/domains" >/dev/null 2>&1 &
elif command -v open >/dev/null 2>&1; then
    open "https://dashboard.ngrok.com/cloud-edge/domains" >/dev/null 2>&1 &
elif command -v cmd.exe >/dev/null 2>&1; then
    cmd.exe /c "start https://dashboard.ngrok.com/cloud-edge/domains" >/dev/null 2>&1 &
else
    echo "Please manually open this URL in your browser:"
    echo "https://dashboard.ngrok.com/cloud-edge/domains"
fi

echo ""
echo "📋 Please follow these steps:"
echo "1. Click 'Create Domain'"
echo "2. Close the 'Start an endpoint' dialog that appears"
echo "3. Copy the domain name from the domain details panel"
echo "4. Paste it below (e.g., your-domain.ngrok-free.app)"
echo ""
read -p "Ngrok Static Domain (optional): " ngrok_domain

if [ -n "$ngrok_domain" ]; then
    # Validate domain format
    if [[ ! "$ngrok_domain" =~ \.ngrok(-free)?\.app$ ]]; then
        echo "⚠️  Warning: Domain doesn't look like a valid ngrok domain"
        echo "   Valid domains should end with .ngrok-free.app or .ngrok.app"
        read -p "Continue anyway? (y/N): " confirm
        if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
            echo "❌ Setup cancelled."
            exit 1
        fi
    fi

    # Update or add NGROK_DOMAIN to .env file
    if [ -f ".env" ]; then
        if grep -q "^NGROK_DOMAIN=" .env; then
            sed -i "s/^NGROK_DOMAIN=.*/NGROK_DOMAIN=$ngrok_domain/" .env
            echo "✅ Updated NGROK_DOMAIN in .env file"
        else
            echo "NGROK_DOMAIN=$ngrok_domain" >> .env
            echo "✅ Added NGROK_DOMAIN to .env file"
        fi
    fi
else
    echo "ℹ️  No domain provided. You can add it later to .env file:"
    echo "   NGROK_DOMAIN=your-domain.ngrok-free.app"
fi

echo ""
echo "🔄 Restarting ngrok service..."
docker compose restart ngrok

echo ""
echo "⏳ Waiting for ngrok to start..."
sleep 5

echo ""
echo "📋 Checking ngrok status..."
NGROK_LOGS=$(docker compose logs ngrok | tail -10)
echo "$NGROK_LOGS"

echo ""
echo "✅ Ngrok setup complete!"
echo "   Auth Token: ${ngrok_token:0:10}... (hidden for security)"
if [ -n "$ngrok_domain" ]; then
    echo "   Static Domain: $ngrok_domain"
    echo ""
    echo "Your Jellyfin server will be available at: https://$ngrok_domain"
else
    echo "   Static Domain: Not configured (using temporary URL)"
    echo ""
    echo "Note: Configure NGROK_DOMAIN in .env for a permanent URL"
fi
echo "Note: It may take a few moments for the tunnel to be fully active."