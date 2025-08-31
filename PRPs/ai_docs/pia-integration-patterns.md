# PIA Integration Patterns Documentation

## Overview

This document provides comprehensive patterns and guidelines for integrating Private Internet Access (PIA) VPN with Docker-based torrent stacks using WireGuard protocol.

## Authentication Flow

### PIA Token-Based Authentication

PIA uses a token-based authentication system that requires:
1. Username/password credentials to obtain an authentication token
2. Token is valid for 24 hours
3. Automatic token refresh mechanism required

```bash
# Authentication API endpoint
PIA_AUTH_URL="https://privateinternetaccess.com/gtoken/generateToken"

# Token generation request
curl -u "$PIA_USER:$PIA_PASS" \
  "$PIA_AUTH_URL" \
  -d "pubkey=$(cat /config/public_key)"
```

### Token Storage Pattern

```json
{
  "status": "OK",
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_at": "2024-09-01T15:30:00Z"
}
```

## WireGuard Configuration Generation

### Server Selection and Configuration

```bash
# Server list endpoint
PIA_SERVER_LIST="https://serverlist.piaservers.net/vpninfo/servers/v6"

# Region-specific server selection
curl -s "$PIA_SERVER_LIST" | \
  jq -r '.regions[] | select(.id=="'$PIA_REGION'") | .servers.wg[0]'
```

### Dynamic WireGuard Config Pattern

```ini
[Interface]
PrivateKey = <generated_private_key>
Address = <assigned_ip_from_pia>/32
DNS = 209.222.18.222, 209.222.18.218

[Peer] 
PublicKey = <pia_server_public_key>
AllowedIPs = 0.0.0.0/0
Endpoint = <pia_server_ip>:<pia_server_port>
PersistentKeepalive = 25
```

## Docker Container Integration Patterns

### Environment Variables Pattern

```yaml
environment:
  # PIA Credentials (from .env file)
  - PIA_USER=${PIA_USER}
  - PIA_PASS=${PIA_PASS}
  - PIA_REGION=${PIA_REGION:-swiss}
  
  # VPN Configuration
  - PORT_FORWARDING=${PORT_FORWARDING:-1}
  - LOCAL_NETWORK=${LOCAL_NETWORK:-192.168.1.0/24}
  
  # LinuxServer Compatibility
  - PUID=${PUID:-1000}
  - PGID=${PGID:-1000}
  - TZ=${TZ:-America/New_York}
```### Volume Mount Pattern

```yaml
volumes:
  # Main configuration directory
  - ./config/vpn:/config
  
  # PIA-specific configuration storage
  - ./config/vpn/pia:/pia
  
  # Automation scripts
  - ./config/vpn/scripts:/scripts:ro
```

### Health Check Pattern

```yaml
healthcheck:
  test: |
    /scripts/healthcheck.sh || exit 1
  interval: 60s
  timeout: 10s
  retries: 3
  start_period: 30s
```

## Container Selection Patterns

### Option 1: Dedicated PIA Container (Recommended)

```yaml
vpn:
  image: thrnz/docker-wireguard-pia:latest
  container_name: vpn
  cap_add:
    - NET_ADMIN
  environment:
    - PUID=1000
    - PGID=1000
    - LOC=${PIA_REGION}
    - USER=${PIA_USER}
    - PASS=${PIA_PASS}
    - PORTFORWARD=1
    - LOCAL_NETWORK=${LOCAL_NETWORK}
```### Option 2: LinuxServer with PIA Mod

```yaml
vpn:
  image: ghcr.io/linuxserver/wireguard:latest
  container_name: vpn
  cap_add:
    - NET_ADMIN
    - SYS_MODULE
  environment:
    - PUID=1000
    - PGID=1000
    - SERVERURL=auto
    - PEERDNS=auto
    # PIA-specific variables added via init scripts
```

## Port Forwarding Integration

### PIA Port Forwarding API

```bash
# Get forwarded port from PIA
PIA_PORT_URL="https://209.222.18.222:19999/getSignature"

# Request port forwarding
curl -s -G "$PIA_PORT_URL" \
  --data-urlencode "token=$PIA_TOKEN" \
  --cacert /config/ca.rsa.4096.crt
```

### Port Configuration in Transmission

```bash
# Set transmission port via API
TRANSMISSION_PORT=$(cat /config/pia/forwarded_port)
curl -X POST http://localhost:9091/transmission/rpc \
  -H "X-Transmission-Session-Id: $SESSION_ID" \
  -d '{"method":"session-set","arguments":{"peer-port":'$TRANSMISSION_PORT'}}'
```## Security Patterns

### IP Leak Prevention

```bash
# Block non-VPN traffic
iptables -A OUTPUT -o lo -j ACCEPT
iptables -A OUTPUT -o tun+ -j ACCEPT
iptables -A OUTPUT -o wg+ -j ACCEPT
iptables -A OUTPUT -d ${LOCAL_NETWORK} -j ACCEPT
iptables -A OUTPUT -j REJECT
```

### DNS Security

```ini
# Use PIA DNS servers
DNS = 209.222.18.222, 209.222.18.218

# Block DNS leaks
iptables -A OUTPUT -p udp --dport 53 -d 209.222.18.222 -j ACCEPT
iptables -A OUTPUT -p udp --dport 53 -d 209.222.18.218 -j ACCEPT
iptables -A OUTPUT -p udp --dport 53 -j REJECT
```

## Automation Scripts Patterns

### Connection Script Structure

```bash
#!/bin/bash
# pia-connect.sh

set -e

# Configuration paths
CONFIG_DIR="/config"
PIA_DIR="/config/pia"
WG_DIR="/config/wg_confs"

# Functions
authenticate_pia() { ... }
get_server_config() { ... }
generate_wg_config() { ... }
setup_port_forwarding() { ... }
monitor_connection() { ... }

# Main execution
main() {
    authenticate_pia
    get_server_config
    generate_wg_config
    setup_port_forwarding
    monitor_connection
}

main "$@"
```### Health Check Script Structure

```bash
#!/bin/bash
# healthcheck.sh

# Check VPN interface
ip link show wg0 > /dev/null 2>&1 || exit 1

# Check IP is PIA server
CURRENT_IP=$(curl -s ipinfo.io/ip)
PIA_IP=$(cat /config/pia/server_ip)
[ "$CURRENT_IP" = "$PIA_IP" ] || exit 1

# Check token validity
TOKEN_EXPIRES=$(jq -r '.expires_at' /config/pia/auth.json)
CURRENT_TIME=$(date -u +%s)
TOKEN_EXPIRES_TIMESTAMP=$(date -d "$TOKEN_EXPIRES" +%s)
[ $TOKEN_EXPIRES_TIMESTAMP -gt $CURRENT_TIME ] || exit 1

exit 0
```

## Error Handling Patterns

### Common Error Scenarios

1. **Authentication Failure**
   - Invalid credentials
   - Token expiration
   - API rate limiting

2. **Connection Issues**
   - Server unavailability
   - Network connectivity problems
   - WireGuard interface failures

3. **Port Forwarding Problems**
   - Port assignment failures
   - Transmission integration issues
   - Firewall conflicts

### Recovery Patterns

```bash
# Token refresh pattern
refresh_token() {
    if ! authenticate_pia; then
        log_error "Authentication failed, retrying in 60s"
        sleep 60
        return 1
    fi
    log_info "Token refreshed successfully"
}

# Connection retry pattern  
connect_with_retry() {
    for attempt in {1..5}; do
        if establish_connection; then
            return 0
        fi
        log_warn "Connection attempt $attempt failed"
        sleep $((attempt * 10))
    done
    return 1
}
```