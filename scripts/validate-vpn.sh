#!/bin/bash
set -e

echo "=== VPN IP Leak Validation ==="

# Get host IP
echo -n "Host IP: "
HOST_IP=$(curl -s https://ipinfo.io/ip)
echo "${HOST_IP}"

# Get VPN container IP (gluetun)
echo -n "VPN Container IP: "
VPN_IP=$(docker compose exec vpn wget -qO- https://ipinfo.io/ip 2>/dev/null || echo "FAILED")
echo "${VPN_IP}"

# Get torrent client IP (qbittorrent or transmission)
if docker compose ps qbittorrent >/dev/null 2>&1; then
    echo -n "qBittorrent IP: "
    TORRENT_IP=$(docker compose exec qbittorrent wget -qO- https://ipinfo.io/ip 2>/dev/null || echo "FAILED")
    echo "${TORRENT_IP}"
elif docker compose ps transmission >/dev/null 2>&1; then
    echo -n "Transmission IP: "
    TORRENT_IP=$(docker compose exec transmission wget -qO- https://ipinfo.io/ip 2>/dev/null || echo "FAILED")
    echo "${TORRENT_IP}"
fi

# Validate IPs are different
echo ""
echo "=== Validation Results ==="

if [ "${HOST_IP}" = "${VPN_IP}" ]; then
    echo "❌ FAILED: VPN IP matches host IP (VPN not working!)"
    exit 1
elif [ "${VPN_IP}" = "FAILED" ]; then
    echo "❌ FAILED: Could not get VPN IP (VPN not connected!)"
    exit 1
else
    echo "✅ PASSED: VPN IP (${VPN_IP}) differs from host IP (${HOST_IP})"
fi

if [ -n "${TORRENT_IP}" ] && [ "${TORRENT_IP}" = "${VPN_IP}" ]; then
    echo "✅ PASSED: Torrent client IP matches VPN IP (isolation working!)"
elif [ "${TORRENT_IP}" = "FAILED" ]; then
    echo "⚠️  WARNING: Could not get torrent client IP"
elif [ -n "${TORRENT_IP}" ]; then
    echo "❌ FAILED: Torrent client IP (${TORRENT_IP}) differs from VPN IP (${VPN_IP})"
    exit 1
fi

echo ""
echo "=== VPN Validation Complete ==="
