# Media Services API Documentation

This document provides comprehensive API structure documentation for each media service in the torrents-services stack, focusing on health/status endpoints for monitoring and integration.

## Table of Contents

1. [Prowlarr API](#prowlarr-api)
2. [qBittorrent API](#qbittorrent-api)
3. [Plex Media Server API](#plex-media-server-api)
4. [Sonarr API](#sonarr-api)
5. [Radarr API](#radarr-api)
6. [API Testing Examples](#api-testing-examples)

---

## Prowlarr API

### Base API Structure
- **Base URL**: `http://localhost:9696/api/v1`
- **Authentication**: API Key required
- **Default Port**: 9696

### Authentication
Prowlarr API v1 supports two authentication methods:

1. **X-Api-Key Header** (Recommended):
   ```http
   X-Api-Key: your-api-key-here
   ```

2. **Query Parameter**:
   ```http
   ?apikey=your-api-key-here
   ```

### Health/Status Endpoints

#### System Status
```http
GET /api/v1/system/status
```
**Headers**:
```
X-Api-Key: your-api-key
Accept: application/json
```

**Response Example**:
```json
{
  "appName": "Prowlarr",
  "instanceName": "Prowlarr",
  "version": "1.x.x",
  "buildTime": "2024-01-01T00:00:00Z",
  "isDebug": false,
  "isProduction": true,
  "isAdmin": false,
  "isUserInteractive": false,
  "startupPath": "/app/prowlarr/bin",
  "appData": "/config",
  "osName": "ubuntu",
  "osVersion": "22.04",
  "isMonoRuntime": false,
  "isMono": false,
  "isLinux": true,
  "isOsx": false,
  "isWindows": false,
  "mode": "console",
  "branch": "master",
  "authentication": "required",
  "sqliteVersion": "3.46.0",
  "urlBase": "",
  "runtimeVersion": ".NET 6.0.x",
  "runtimeName": ".NET"
}
```

#### Health Check
```http
GET /api/v1/health
```
**Headers**:
```
X-Api-Key: your-api-key
Accept: application/json
```

**Response Example**:
```json
[
  {
    "source": "IndexerStatusCheck",
    "type": "warning",
    "message": "Indexers unavailable due to failures: Example Indexer",
    "wikiUrl": "https://wiki.servarr.com/prowlarr/system#indexers-are-unavailable-due-to-failures"
  }
]
```

### cURL Examples
```bash
# Check system status
curl -H "X-Api-Key: your-api-key" \
     -H "Accept: application/json" \
     http://localhost:9696/api/v1/system/status

# Check health
curl -H "X-Api-Key: your-api-key" \
     -H "Accept: application/json" \
     http://localhost:9696/api/v1/health
```

---

## qBittorrent API

### Base API Structure
- **Base URL**: `http://localhost:8081/api/v2`
- **Authentication**: Session-based (login required)
- **Default Port**: 8081

### Authentication Flow

#### Login
```http
POST /api/v2/auth/login
Content-Type: application/x-www-form-urlencoded

username=admin&password=adminpass
```

**Response**: Sets session cookie for subsequent requests

#### Logout
```http
POST /api/v2/auth/logout
```

### Health/Status Endpoints

#### Application Version
```http
GET /api/v2/app/version
```
**Response**: `"4.6.4"` (plain text)

#### API Version
```http
GET /api/v2/app/webapiVersion
```
**Response**: `"2.9.3"` (plain text)

#### Build Information
```http
GET /api/v2/app/buildInfo
```
**Response Example**:
```json
{
  "qt": "5.15.8",
  "libtorrent": "1.2.19.0",
  "boost": "1.76",
  "openssl": "1.1.1n",
  "bitness": 64
}
```

#### Transfer Information (Status)
```http
GET /api/v2/transfer/info
```
**Response Example**:
```json
{
  "connection_status": "connected",
  "dht_nodes": 405,
  "dl_info_data": 0,
  "dl_info_speed": 0,
  "dl_rate_limit": 0,
  "up_info_data": 0,
  "up_info_speed": 0,
  "up_rate_limit": 0,
  "queueing": true,
  "use_alt_speed_limits": false,
  "refresh_interval": 1500
}
```

### cURL Examples
```bash
# Login first
curl -c cookies.txt \
     -d "username=admin&password=adminpass" \
     http://localhost:8081/api/v2/auth/login

# Check application version
curl -b cookies.txt \
     http://localhost:8081/api/v2/app/version

# Check transfer status
curl -b cookies.txt \
     http://localhost:8081/api/v2/transfer/info

# Logout
curl -b cookies.txt \
     http://localhost:8081/api/v2/auth/logout
```

---

## Plex Media Server API

### Base API Structure
- **Base URL**: `http://localhost:32400`
- **Authentication**: X-Plex-Token required
- **Default Port**: 32400
- **Response Formats**: XML (default) or JSON (with Accept header)

### Authentication
All requests require a Plex token:

1. **URL Parameter**:
   ```http
   ?X-Plex-Token=your-plex-token
   ```

2. **Header**:
   ```http
   X-Plex-Token: your-plex-token
   ```

### Health/Status Endpoints

#### Server Identity
```http
GET /identity?X-Plex-Token=your-token
```
**Response Format**: XML by default, JSON with `Accept: application/json`

**XML Response Example**:
```xml
<MediaContainer size="0" machineIdentifier="unique-id" version="1.x.x"/>
```

#### Server Status/Capabilities
```http
GET /?X-Plex-Token=your-token
```
**Response**: Server capabilities and status information

#### Active Sessions
```http
GET /status/sessions?X-Plex-Token=your-token
```
**Response**: Currently active playback sessions

#### Transcode Sessions
```http
GET /transcode/sessions?X-Plex-Token=your-token
```
**Response**: Active transcode operations

#### All Activities
```http
GET /activities?X-Plex-Token=your-token
```
**Response**: Overview of current server activities

### cURL Examples
```bash
# Get server identity (JSON)
curl -H "Accept: application/json" \
     "http://localhost:32400/identity?X-Plex-Token=your-token"

# Check active sessions
curl -H "Accept: application/json" \
     "http://localhost:32400/status/sessions?X-Plex-Token=your-token"

# Get server capabilities
curl -H "Accept: application/json" \
     "http://localhost:32400/?X-Plex-Token=your-token"
```

---

## Sonarr API

### Base API Structure
- **Base URL**: `http://localhost:8989/api/v3`
- **Authentication**: API Key required
- **Default Port**: 8989

### Authentication
API Key must be provided via:

1. **X-Api-Key Header** (Recommended):
   ```http
   X-Api-Key: your-api-key
   ```

2. **Query Parameter**:
   ```http
   ?apikey=your-api-key
   ```

### Health/Status Endpoints

#### System Status
```http
GET /api/v3/system/status
```
**Headers**:
```
X-Api-Key: your-api-key
Accept: application/json
```

**Response Example**:
```json
{
  "appName": "Sonarr",
  "instanceName": "Sonarr",
  "version": "4.x.x",
  "buildTime": "2024-01-01T00:00:00Z",
  "isDebug": false,
  "isProduction": true,
  "isAdmin": false,
  "isUserInteractive": false,
  "startupPath": "/app/sonarr/bin",
  "appData": "/config",
  "osName": "ubuntu",
  "osVersion": "22.04",
  "isMonoRuntime": false,
  "isMono": false,
  "isLinux": true,
  "isOsx": false,
  "isWindows": false,
  "mode": "console",
  "branch": "main",
  "authentication": "required",
  "sqliteVersion": "3.46.0",
  "urlBase": "",
  "runtimeVersion": ".NET 6.0.x",
  "runtimeName": ".NET"
}
```

#### Health Check
```http
GET /api/v3/health
```
**Headers**:
```
X-Api-Key: your-api-key
Accept: application/json
```

**Response Example**:
```json
[
  {
    "source": "DownloadClientCheck",
    "type": "error",
    "message": "No download client is available",
    "wikiUrl": "https://wiki.servarr.com/sonarr/system#download-clients-are-unavailable-due-to-failure"
  }
]
```

#### Ping Endpoint (Unauthenticated)
```http
GET /ping
```
**Response**: `"pong"` (plain text)

### cURL Examples
```bash
# Check system status
curl -H "X-Api-Key: your-api-key" \
     -H "Accept: application/json" \
     http://localhost:8989/api/v3/system/status

# Check health
curl -H "X-Api-Key: your-api-key" \
     -H "Accept: application/json" \
     http://localhost:8989/api/v3/health

# Simple ping (no auth required)
curl http://localhost:8989/ping
```

---

## Radarr API

### Base API Structure
- **Base URL**: `http://localhost:7878/api/v3`
- **Authentication**: API Key required
- **Default Port**: 7878

### Authentication
API Key must be provided via:

1. **X-Api-Key Header** (Recommended):
   ```http
   X-Api-Key: your-api-key
   ```

2. **Query Parameter**:
   ```http
   ?apikey=your-api-key
   ```

### Health/Status Endpoints

#### System Status
```http
GET /api/v3/system/status
```
**Headers**:
```
X-Api-Key: your-api-key
Accept: application/json
```

**Response Example**:
```json
{
  "appName": "Radarr",
  "instanceName": "Radarr",
  "version": "5.x.x",
  "buildTime": "2024-01-01T00:00:00Z",
  "isDebug": false,
  "isProduction": true,
  "isAdmin": false,
  "isUserInteractive": false,
  "startupPath": "/app/radarr/bin",
  "appData": "/config",
  "osName": "ubuntu",
  "osVersion": "22.04",
  "isMonoRuntime": false,
  "isMono": false,
  "isLinux": true,
  "isOsx": false,
  "isWindows": false,
  "mode": "console",
  "branch": "master",
  "authentication": "required",
  "sqliteVersion": "3.46.0",
  "urlBase": "",
  "runtimeVersion": ".NET 6.0.x",
  "runtimeName": ".NET"
}
```

#### Health Check
```http
GET /api/v3/health
```
**Headers**:
```
X-Api-Key: your-api-key
Accept: application/json
```

**Response Example**:
```json
[
  {
    "source": "DownloadClientCheck",
    "type": "warning",
    "message": "Download client is unavailable",
    "wikiUrl": "https://wiki.servarr.com/radarr/system#download-clients-are-unavailable-due-to-failure"
  }
]
```

#### Ping Endpoint (Unauthenticated)
```http
GET /ping
```
**Response**: `"pong"` (plain text)

### cURL Examples
```bash
# Check system status
curl -H "X-Api-Key: your-api-key" \
     -H "Accept: application/json" \
     http://localhost:7878/api/v3/system/status

# Check health
curl -H "X-Api-Key: your-api-key" \
     -H "Accept: application/json" \
     http://localhost:7878/api/v3/health

# Simple ping (no auth required)
curl http://localhost:7878/ping
```

---

## API Testing Examples

### Postman Collection
```json
{
  "info": {
    "name": "Media Services API Collection",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "prowlarr_api_key",
      "value": "your-prowlarr-api-key"
    },
    {
      "key": "sonarr_api_key",
      "value": "your-sonarr-api-key"
    },
    {
      "key": "radarr_api_key",
      "value": "your-radarr-api-key"
    },
    {
      "key": "plex_token",
      "value": "your-plex-token"
    }
  ],
  "item": [
    {
      "name": "Prowlarr Health Check",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "X-Api-Key",
            "value": "{{prowlarr_api_key}}"
          },
          {
            "key": "Accept",
            "value": "application/json"
          }
        ],
        "url": "http://localhost:9696/api/v1/health"
      }
    },
    {
      "name": "qBittorrent Login",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/x-www-form-urlencoded"
          }
        ],
        "body": {
          "mode": "urlencoded",
          "urlencoded": [
            {
              "key": "username",
              "value": "admin"
            },
            {
              "key": "password",
              "value": "adminpass"
            }
          ]
        },
        "url": "http://localhost:8081/api/v2/auth/login"
      }
    }
  ]
}
```

### Docker Health Check Commands
For use in docker-compose.yml healthcheck sections:

```yaml
# Prowlarr
healthcheck:
  test: ["CMD-SHELL", "curl -f -H \"X-Api-Key: $$PROWLARR_API_KEY\" http://localhost:9696/api/v1/system/status"]
  interval: 30s
  timeout: 10s
  retries: 3

# qBittorrent
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8081"]
  interval: 30s
  timeout: 10s
  retries: 3

# Plex
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:32400/web/index.html"]
  interval: 60s
  timeout: 10s
  retries: 3

# Sonarr
healthcheck:
  test: ["CMD-SHELL", "curl -s http://localhost:8989/ping > /dev/null 2>&1 || exit 1"]
  interval: 30s
  timeout: 10s
  retries: 3

# Radarr
healthcheck:
  test: ["CMD-SHELL", "curl -s http://localhost:7878/ping > /dev/null 2>&1 || exit 1"]
  interval: 30s
  timeout: 10s
  retries: 3
```

### Monitoring Script Example
```bash
#!/bin/bash
# health-monitor.sh - Check all services

check_service() {
    local service_name=$1
    local url=$2
    local headers=$3

    if curl -s -f $headers "$url" > /dev/null; then
        echo "✅ $service_name: Healthy"
        return 0
    else
        echo "❌ $service_name: Unhealthy"
        return 1
    fi
}

# Check all services
check_service "Prowlarr" "http://localhost:9696/api/v1/health" "-H 'X-Api-Key: $PROWLARR_API_KEY'"
check_service "qBittorrent" "http://localhost:8081" ""
check_service "Plex" "http://localhost:32400/web/index.html" ""
check_service "Sonarr" "http://localhost:8989/ping" ""
check_service "Radarr" "http://localhost:7878/ping" ""
```

---

## Important Notes

### Security Considerations
1. **API Keys**: Store API keys securely and rotate them regularly
2. **Network Access**: Limit API access to necessary networks only
3. **HTTPS**: Use HTTPS in production environments
4. **Rate Limiting**: Be mindful of API rate limits

### Container Networking
In this Docker setup:
- qBittorrent uses VPN container networking: `network_mode: "container:vpn"`
- Access qBittorrent API through nginx proxy or VPN container IP
- Other services use the `media_network` bridge network

### Monitoring Best Practices
1. Use unauthenticated endpoints (`/ping`) for simple health checks where available
2. Implement proper retry logic for API calls
3. Monitor both individual service health and cross-service dependencies
4. Set appropriate timeouts for health check calls