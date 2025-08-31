#!/bin/bash
# PIA WireGuard Configuration Setup Script

set -e

PIA_USER="p1677140"
PIA_PASS="LawrenceLicks69BootyHoles"
PIA_REGION="swiss"
CONFIG_DIR="./config/vpn"

echo "Setting up PIA WireGuard configuration..."

# Create config directories
mkdir -p "${CONFIG_DIR}/wg_confs"
mkdir -p "${CONFIG_DIR}/pia"

# Generate WireGuard key pair using docker
echo "Generating WireGuard keys using docker container..."
PRIVATE_KEY=$(docker run --rm ghcr.io/linuxserver/wireguard:latest wg genkey)
PUBLIC_KEY=$(echo "$PRIVATE_KEY" | docker run --rm -i ghcr.io/linuxserver/wireguard:latest wg pubkey)

echo "Generated WireGuard keys"
echo "Private key: $PRIVATE_KEY"
echo "Public key: $PUBLIC_KEY"

# Get PIA token
echo "Authenticating with PIA..."
PIA_TOKEN=$(curl -s -u "$PIA_USER:$PIA_PASS" \
    "https://privateinternetaccess.com/gtoken/generateToken" \
    --data-urlencode "pubkey=$PUBLIC_KEY" | jq -r '.token')

if [[ "$PIA_TOKEN" == "null" || -z "$PIA_TOKEN" ]]; then
    echo "Failed to authenticate with PIA"
    exit 1
fi

echo "Got PIA token: ${PIA_TOKEN:0:20}..."

# Get server list and select server
echo "Getting PIA server list..."
SERVER_INFO=$(curl -s "https://serverlist.piaservers.net/vpninfo/servers/v6" | \
    jq -r --arg region "$PIA_REGION" '.regions[] | select(.id==$region) | .servers.wg[0]')

if [[ -z "$SERVER_INFO" || "$SERVER_INFO" == "null" ]]; then
    echo "No WireGuard servers found for region: $PIA_REGION"
    exit 1
fi

SERVER_IP=$(echo "$SERVER_INFO" | jq -r '.ip')
SERVER_PUBKEY=$(echo "$SERVER_INFO" | jq -r '.pubkey')
SERVER_PORT=$(echo "$SERVER_INFO" | jq -r '.port')

echo "Selected server: $SERVER_IP:$SERVER_PORT"

# Add key to PIA server and get assigned IP
echo "Registering with PIA server..."
WG_RESPONSE=$(curl -s -G "https://$SERVER_IP:1337/addKey" \
    --data-urlencode "pt=$PIA_TOKEN" \
    --data-urlencode "pubkey=$PUBLIC_KEY" \
    --cacert <(curl -s https://raw.githubusercontent.com/pia-foss/manual-connections/master/ca.rsa.4096.crt))

ASSIGNED_IP=$(echo "$WG_RESPONSE" | jq -r '.peer_ip')

if [[ "$ASSIGNED_IP" == "null" || -z "$ASSIGNED_IP" ]]; then
    echo "Failed to get assigned IP from PIA: $WG_RESPONSE"
    exit 1
fi

echo "Assigned IP: $ASSIGNED_IP"

# Create WireGuard configuration
cat > "${CONFIG_DIR}/wg_confs/wg0.conf" << EOF
[Interface]
PrivateKey = $PRIVATE_KEY
Address = $ASSIGNED_IP
DNS = 209.222.18.222, 209.222.18.218
PostUp = iptables -A FORWARD -i %i -j ACCEPT; iptables -A FORWARD -o %i -j ACCEPT; iptables -t nat -A POSTROUTING -o eth+ -j MASQUERADE
PostDown = iptables -D FORWARD -i %i -j ACCEPT; iptables -D FORWARD -o %i -j ACCEPT; iptables -t nat -D POSTROUTING -o eth+ -j MASQUERADE

[Peer]
PublicKey = $SERVER_PUBKEY
AllowedIPs = 0.0.0.0/0
Endpoint = $SERVER_IP:$SERVER_PORT
PersistentKeepalive = 25
EOF

# Store configuration info for later use
cat > "${CONFIG_DIR}/pia/config_info.json" << EOF
{
  "token": "$PIA_TOKEN",
  "server_ip": "$SERVER_IP",
  "server_pubkey": "$SERVER_PUBKEY",
  "server_port": "$SERVER_PORT",
  "assigned_ip": "$ASSIGNED_IP",
  "private_key": "$PRIVATE_KEY",
  "public_key": "$PUBLIC_KEY",
  "created": "$(date -u)"
}
EOF

echo "PIA WireGuard configuration created successfully!"
echo "Configuration file: ${CONFIG_DIR}/wg_confs/wg0.conf"
echo "Server IP: $SERVER_IP"
echo "Assigned IP: $ASSIGNED_IP"