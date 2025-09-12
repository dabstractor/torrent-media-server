# Container Prefix Management

This project includes a script to manage Docker container prefixes, enabling multiple parallel instances of the stack to run simultaneously without conflicts.

## Script: `manage-container-prefix.sh`

### Features

- ✅ **Remove** existing container prefixes
- ✅ **Set** new container prefixes  
- ✅ **Automatic backups** before changes
- ✅ **Rule-based logic** for consistent updates
- ✅ **Service validation** to ensure all containers are accounted for
- ✅ **Interactive restart** option for running containers
- ✅ **Cross-platform** support (Linux/macOS)

### Usage

```bash
# Remove current prefix (containers become: vpn, plex, qbittorrent, etc.)
./manage-container-prefix.sh remove

# Set a new prefix (containers become: myprefix-vpn, myprefix-plex, etc.)
./manage-container-prefix.sh set "myprefix-"

# Set empty prefix (same as remove)
./manage-container-prefix.sh set ""
```

### How It Works

The script uses rule-based logic to update:

1. **Environment Variables**: Updates `CONTAINER_PREFIX` in `.env`
2. **Docker Compose**: Updates all `container_name` fields in `docker-compose.yml`
3. **Automatic Backups**: Creates timestamped backups before any changes
4. **Container Detection**: Identifies running containers that will be affected
5. **Interactive Restart**: Offers to restart containers with new names

### Managed Services

The script manages these container services:
- `vpn` - VPN connection (WARP/PIA)
- `flaresolverr` - CloudFlare bypass
- `qbittorrent` - Torrent client
- `plex` - Media server
- `sonarr` - TV series management
- `radarr` - Movie management  
- `nginx-proxy` - Reverse proxy
- `web-ui` - React frontend
- `prowlarr` - Torrent indexer

### Examples

**Scenario: Run two parallel environments**

```bash
# Environment 1 (production)
./manage-container-prefix.sh set "prod-"
docker compose up -d
# Creates: prod-vpn, prod-plex, prod-qbittorrent, etc.

# Environment 2 (development) 
./manage-container-prefix.sh set "dev-"
# Update ports in .env to avoid conflicts
docker compose up -d  
# Creates: dev-vpn, dev-plex, dev-qbittorrent, etc.
```

**Scenario: Clean container names**

```bash
# Remove prefix for cleaner names
./manage-container-prefix.sh remove
docker compose up -d
# Creates: vpn, plex, qbittorrent, etc.
```

### Safety Features

- **Automatic backups** with timestamps
- **Validation** of docker-compose.yml structure
- **Detection** of running containers
- **Interactive confirmation** before container restarts
- **Error handling** with colored output

### Files Modified

- `.env` - Updates `CONTAINER_PREFIX` variable
- `docker-compose.yml` - Updates `container_name` for all services

### Backup Files

Backups are created with format: `filename.backup.YYYYMMDD-HHMMSS`

Example: `.env.backup.20250912-144658`