# Generic Tunnel Framework

This framework provides reusable components for creating Cloudflare Tunnels for any service.

## 🏗️ Framework Structure

```
scripts/tunnel/
├── base-tunnel.sh          # Core tunnel logic (reusable)
├── setup-ngrok.sh          # Ngrok setup script
├── start-tunnel.sh         # Tunnel startup script
├── quick-tunnel.sh         # Quick tunnel script
├── intelligent-tunnel.sh   # Intelligent tunnel selection
├── create-tunnel-config.sh # Tunnel configuration script
└── README.md              # This file

config/{service}/tunnel-setup/
├── smart-tunnel.sh         # Service-specific tunnel script
├── CLOUDFLARE_SETUP_GUIDE.md
└── README.md
```

## 🔧 Creating Tunnel Setup for New Services

### 1. Copy Framework Template
```bash
# Create service directory
mkdir -p config/{service}/tunnel-setup

# Copy base script and customize
cp scripts/tunnel/base-tunnel.sh config/{service}/tunnel-setup/smart-tunnel.sh
```

### 2. Customize for Service
Edit the service-specific variables:
- `SERVICE_NAME` - Display name (e.g., "Plex", "Jellyfin")
- `SERVICE_URL` - Internal service URL (e.g., "http://plex:32400")
- `SERVICE_PORT` - Service port
- `PROTOCOL_OPTS` - Any protocol-specific options

### 3. Add to Docker Compose
```yaml
cloudflared-{service}:
  image: alpine:latest
  container_name: ${CONTAINER_PREFIX}cloudflared-{service}
  volumes:
    - ./config/{service}/tunnel-setup:/tunnel-setup:ro
  environment:
    - TUNNEL_TOKEN=${SERVICE_TUNNEL_TOKEN:-}
  entrypoint: ["/tunnel-setup/smart-tunnel.sh"]
```

## 📝 Service-Specific Requirements

### Jellyfin
- ✅ **Implemented**: `config/jellyfin/tunnel-setup/`
- **Protocol**: HTTP/2 (optimized for Jellyfin)
- **Port**: 8096
- **Special Notes**: None

### Plex (Future)
- **Protocol**: HTTP/1.1 (Plex requirements)
- **Port**: 32400
- **Special Notes**: May need authentication headers

### Other Services
Each service may have different requirements for:
- Protocol optimization
- Authentication handling
- URL structure
- Port configuration

## 🎯 Benefits

- **Consistency**: Same user experience across services
- **Maintainability**: Shared core logic
- **Flexibility**: Service-specific customization
- **Documentation**: Standardized guides for each service