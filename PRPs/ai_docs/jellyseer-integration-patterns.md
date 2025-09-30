# Jellyseer Integration Patterns and Configuration Reference

## Docker Configuration Patterns

### Official Image Configuration
```yaml
# Use fallenbagel/jellyseerr (NOT linuxserver.io)
image: fallenbagel/jellyseerr:latest
# Volume mount: /app/config (NOT /config)
volumes:
  - ./config/jellyseer:/app/config
```

### Network Security Pattern
```yaml
# Jellyseer is a management service - dual network access
networks:
  - media_network    # Primary for web UI access
  - vpn_network     # Secondary for qBittorrent communication
# NOT network_mode: "container:vpn" (that's only for qBittorrent)
```

### Port Configuration
```yaml
# Use 5056 to avoid conflict with Overseerr (5055)
ports:
  - "${JELLYSEER_PORT:-5056}:5055"
# Internal port remains 5055, external mapped to 5056
```

## Service Integration Examples

### Jellyfin Connection Configuration
```json
{
  "jellyfin": {
    "hostname": "jellyfin",
    "port": 8096,
    "useSsl": false,
    "libraries": [],
    "serverName": "Jellyfin Server"
  }
}
```

### Radarr Integration
```json
{
  "radarr": [{
    "id": 1,
    "hostname": "radarr",
    "port": 7878,
    "apiKey": "${RADARR_API_KEY}",
    "useSsl": false,
    "baseUrl": "",
    "qualityProfileId": 1,
    "rootFolder": "/data/movies",
    "minimumAvailability": "released",
    "tags": []
  }]
}
```

### Sonarr Integration
```json
{
  "sonarr": [{
    "id": 1,
    "hostname": "sonarr",
    "port": 8989,
    "apiKey": "${SONARR_API_KEY}",
    "useSsl": false,
    "baseUrl": "",
    "qualityProfileId": 1,
    "rootFolder": "/data/tvshows",
    "languageProfileId": 1,
    "tags": []
  }]
}
```

## Environment Variable Patterns

### Required Variables
```bash
# Port Configuration
JELLYSEER_PORT=5056
NGINX_JELLYSEER_PORT=18056

# URL Configuration
JELLYSEER_URL=http://localhost:${NGINX_JELLYSEER_PORT}
JELLYSEER_BACKEND_URL=http://jellyseer:5055

# Integration Keys (reference existing)
RADARR_API_KEY=existing_value
SONARR_API_KEY=existing_value
```

### Web UI Environment
```yaml
web-ui:
  environment:
    - JELLYSEER_URL=http://localhost:${NGINX_JELLYSEER_PORT}
    - JELLYSEER_BACKEND_URL=http://jellyseer:5055
```

## Health Check Configuration

### Docker Compose Health Check
```yaml
healthcheck:
  test: ["CMD-SHELL", "curl -f http://localhost:5055/api/v1/status || exit 1"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s  # Allow time for initialization
```

### Web UI Health Endpoint
```typescript
// Add to web-ui/src/app/api/health/[service]/route.ts
jellyseer: {
  url: process.env.JELLYSEER_BACKEND_URL || 'http://jellyseer:5055',
  healthEndpoint: '/api/v1/status',
  authType: 'none',
  timeout: 10000
}
```

## Configuration Template Processing

### Template Structure
```json
{
  "main": {
    "apiKey": "${JELLYSEER_API_KEY}",
    "applicationTitle": "Jellyseer",
    "applicationUrl": "${JELLYSEER_URL}",
    "trustProxy": true
  },
  "jellyfin": {
    "hostname": "jellyfin",
    "port": 8096,
    "useSsl": false
  },
  "sonarr": [/* array of sonarr configs */],
  "radarr": [/* array of radarr configs */],
  "notifications": {
    "agents": {}
  }
}
```

### Template Processing Script
```bash
# In entrypoint script
if [ -f "$TEMPLATE_DIR/settings.json.template" ]; then
    envsubst < "$TEMPLATE_DIR/settings.json.template" > "$CONFIG_DIR/settings.json"

    # Validate JSON structure
    if ! cat "$CONFIG_DIR/settings.json" | jq . >/dev/null 2>&1; then
        echo "[ERROR] Generated settings.json is invalid"
        echo '{}' > "$CONFIG_DIR/settings.json"
    fi

    chown 1000:1000 "$CONFIG_DIR/settings.json"
fi
```

## Web UI Integration

### Service Configuration
```typescript
// Add to use-service-config.ts
jellyseer: {
  name: 'Jellyseer',
  category: 'management' as const,
  icon: 'Play',
  url: process.env.JELLYSEER_URL || 'http://localhost:5056',
  description: 'Media request management for Jellyfin'
}
```

### Service Categories
- **management**: Request management services (Overseerr, Jellyseer)
- **media**: Media servers (Jellyfin, Plex)
- **download**: Download clients (qBittorrent)
- **automation**: Download automation (Radarr, Sonarr)

## Common Gotchas and Solutions

### Port Conflicts
- **Problem**: Default port 5055 conflicts with Overseerr
- **Solution**: Use JELLYSEER_PORT=5056, map to internal 5055

### Network Configuration
- **Problem**: Confusion about VPN isolation requirements
- **Solution**: Jellyseer is management service, uses dual network (media + vpn)

### Volume Mounts
- **Problem**: Using LinuxServer.io patterns (/config)
- **Solution**: Official image uses /app/config

### Startup Dependencies
- **Problem**: Starting before dependent services ready
- **Solution**: depends_on with service_healthy conditions

### JSON Template Validation
- **Problem**: Invalid JSON after envsubst processing
- **Solution**: Validate with jq, fallback to empty object

### Permission Issues
- **Problem**: Configuration files owned by root
- **Solution**: chown 1000:1000 after template processing

## API Integration Examples

### Status Check
```bash
curl -f http://localhost:5056/api/v1/status
```

### Service Connections Test
```bash
# Test Jellyfin connection
curl -f http://localhost:5056/api/v1/service/jellyfin/status

# Test Radarr connection
curl -f http://localhost:5056/api/v1/service/radarr/status

# Test Sonarr connection
curl -f http://localhost:5056/api/v1/service/sonarr/status
```

### Request Submission
```bash
curl -X POST http://localhost:5056/api/v1/request \
  -H "Content-Type: application/json" \
  -d '{
    "mediaType": "movie",
    "mediaId": 550,
    "tvdbId": null,
    "seasons": [],
    "userId": 1
  }'
```

## Security Considerations

### Network Isolation
- **Rule**: No VPN isolation needed for Jellyseer
- **Pattern**: Uses standard Docker networking with dual network access
- **Communication**: Direct communication with all services except qBittorrent

### API Key Management
- **Pattern**: Use environment variable substitution
- **Storage**: Never hardcode in templates
- **Generation**: Auto-generate if not provided (optional)

### Access Control
- **External Access**: Direct port exposure allowed
- **Authentication**: Jellyseer handles user management internally
- **Proxy**: Can be proxied through nginx for SSL/custom domains