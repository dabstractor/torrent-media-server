#!/bin/bash

# Test script to verify Prowlarr restore functionality
echo "🧪 Testing Prowlarr configuration restore..."

# First, let's test with a fresh restore
echo "1. Testing complete configuration restore..."
./scripts/restore-prowlarr-config.sh

echo ""
echo "2. Waiting for Prowlarr to start..."
sleep 20

echo ""
echo "3. Verifying configuration..."

# Check if API key is correct
API_KEY=$(grep -o '<ApiKey>[^<]*</ApiKey>' ./config/prowlarr/config.xml | sed 's/<ApiKey>\(.*\)<\/ApiKey>/\1/')
if [ "$API_KEY" = "2feed2fe71424878bb7945ead222f367" ]; then
    echo "✅ API Key: Correct ($API_KEY)"
else
    echo "❌ API Key: Incorrect ($API_KEY)"
fi

# Check authentication method
AUTH_METHOD=$(grep -o '<AuthenticationMethod>[^<]*</AuthenticationMethod>' ./config/prowlarr/config.xml | sed 's/<AuthenticationMethod>\(.*\)<\/AuthenticationMethod>/\1/')
if [ "$AUTH_METHOD" = "Forms" ]; then
    echo "✅ Authentication Method: Correct ($AUTH_METHOD)"
else
    echo "❌ Authentication Method: Incorrect ($AUTH_METHOD)"
fi

# Check if container is healthy
if docker ps | grep prowlarr | grep -q "healthy"; then
    echo "✅ Container Status: Healthy"
else
    echo "⚠️  Container Status: Not healthy yet (may still be starting)"
fi

# Check database contents
INDEXER_COUNT=$(sqlite3 ./config/prowlarr/prowlarr.db "SELECT COUNT(*) FROM Indexers;")
echo "📊 Configured Indexers: $INDEXER_COUNT"

PROXY_COUNT=$(sqlite3 ./config/prowlarr/prowlarr.db "SELECT COUNT(*) FROM IndexerProxies;")
echo "🌐 Configured Proxies: $PROXY_COUNT"

USER_COUNT=$(sqlite3 ./config/prowlarr/prowlarr.db "SELECT COUNT(*) FROM Users;")
echo "👤 Configured Users: $USER_COUNT"

echo ""
echo "🎉 Test completed! Check the results above."
echo ""
echo "Access Prowlarr at: http://localhost:9696"
echo "Login: admin / password"