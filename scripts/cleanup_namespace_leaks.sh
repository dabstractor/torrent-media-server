#!/bin/bash

# Script to properly clean up Docker containers and prevent namespace leaks

echo "Cleaning up Docker containers to prevent namespace leaks..."

# Stop all containers in proper order
echo "Stopping containers in dependency order..."

# Stop application containers first
app_containers=("flaresolverr" "qbittorrent" "sonarr" "radarr" "web-ui" "prowlarr")
for container in "${app_containers[@]}"; do
    if docker ps -q -f name=$container | grep -q .; then
        echo "Stopping $container..."
        docker stop $container 2>/dev/null
    else
        echo "$container is not running"
    fi
done

# Stop VPN container last
if docker ps -q -f name=vpn | grep -q .; then
    echo "Stopping vpn..."
    docker stop vpn 2>/dev/null
else
    echo "vpn is not running"
fi

# Wait a moment for graceful shutdown
sleep 5

# Check for any remaining containers
echo ""
echo "Checking for remaining containers..."
remaining=$(docker ps --format "{{.Names}}" | grep -E "(flaresolverr|qbittorrent|sonarr|radarr|web-ui|prowlarr|vpn|plex)" || true)
if [ -n "$remaining" ]; then
    echo "WARNING: Some containers are still running:"
    echo "$remaining"
    echo ""
    echo "Force stopping remaining containers..."
    for container in $remaining; do
        echo "Force stopping $container..."
        docker kill $container 2>/dev/null
    done
else
    echo "All target containers have been stopped."
fi

# Remove any dangling containers that might have namespace issues
echo ""
echo "Checking for dangling containers..."
dangling=$(docker ps -a --format "{{.ID}}\t{{.Names}}\t{{.Status}}" | grep -E "(Exited|Created)" | grep -E "(flaresolverr|qbittorrent|sonarr|radarr|web-ui|prowlarr|vpn)" | head -5 || true)
if [ -n "$dangling" ]; then
    echo "Removing dangling containers:"
    echo "$dangling"
    dangling_ids=$(echo "$dangling" | awk '{print $1}' | tr '\n' ' ')
    if [ -n "$dangling_ids" ]; then
        docker rm $dangling_ids 2>/dev/null
    fi
else
    echo "No dangling containers found."
fi

echo ""
echo "Cleanup completed. You can now restart your services with:"
echo "docker-compose up -d"
echo "or with PIA:"
echo "docker-compose -f docker-compose.yml -f docker-compose.pia.yml up -d"