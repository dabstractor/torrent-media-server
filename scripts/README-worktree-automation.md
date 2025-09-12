# Worktree Environment Automation

This project includes a script to automatically create isolated git worktrees with unique Docker configurations, enabling multiple parallel development environments.

## Script: `create-worktree-env.sh`

### Features

- ✅ **Automatic worktree creation** with new branch
- ✅ **Port conflict detection** and randomized port generation
- ✅ **Container prefix configuration** based on worktree name
- ✅ **Complete environment isolation** for parallel development
- ✅ **Intelligent cleanup** on failures
- ✅ **Cross-platform support** (Linux/macOS)

### Usage

```bash
# Create a new worktree environment
./create-worktree-env.sh <worktree-name>

# Examples
./create-worktree-env.sh feature-auth     # Creates ../torrents-downloads-feature-auth
./create-worktree-env.sh hotfix-123       # Creates ../torrents-downloads-hotfix-123  
./create-worktree-env.sh dev              # Creates ../torrents-downloads-dev
```

### What It Does

1. **Validates** worktree name (alphanumeric + hyphens only)
2. **Scans** for port conflicts across:
   - Running Docker containers
   - Existing `.env` files in sibling directories
3. **Creates** git worktree at `../[project-name]-[worktree-name]`
4. **Generates** new branch `worktree/[worktree-name]`
5. **Creates** `.env` with randomized ports (avoiding all conflicts)
6. **Sets** `CONTAINER_PREFIX` to `[worktree-name]-`
7. **Updates** `docker-compose.yml` container names

### Generated Configuration

#### Port Range
- **Range**: 10,000 - 65,000 (random selection)
- **Conflict Detection**: Checks running containers + existing `.env` files
- **Generated Ports**: 9 unique ports for all services

#### Container Prefix
- **Format**: `[worktree-name]-`
- **Examples**: 
  - `feature-auth-vpn`, `feature-auth-plex`, etc.
  - `dev-vpn`, `dev-plex`, etc.

#### Services Managed
- `vpn` - VPN connection
- `flaresolverr` - CloudFlare bypass
- `qbittorrent` - Torrent client
- `plex` - Media server
- `sonarr` - TV series management
- `radarr` - Movie management
- `nginx-proxy` - Reverse proxy
- `web-ui` - React frontend
- `prowlarr` - Torrent indexer

### Example Workflow

```bash
# Create development environment
./create-worktree-env.sh dev

# Switch to new environment
cd ../torrents-downloads-dev

# Start services
docker compose up -d

# All services now run on unique ports with dev- prefix:
# - dev-vpn, dev-plex, dev-qbittorrent, etc.
# - Ports: randomly generated and conflict-free
```

### Multiple Parallel Environments

```bash
# Production environment
./create-worktree-env.sh prod
cd ../torrents-downloads-prod
docker compose up -d

# Feature development
./create-worktree-env.sh feature-auth  
cd ../torrents-downloads-feature-auth
docker compose up -d

# Hotfix environment
./create-worktree-env.sh hotfix-security
cd ../torrents-downloads-hotfix-security  
docker compose up -d

# All run simultaneously with unique:
# - Container names (prod-, feature-auth-, hotfix-security-)
# - Port numbers (automatically randomized)
# - Git branches (worktree/prod, worktree/feature-auth, etc.)
```

### Sample Output

```bash
$ ./create-worktree-env.sh feature-auth

[INFO] Starting worktree environment creation for: feature-auth
[INFO] Checking for port conflicts...
[INFO] Found 17 ports already in use
[STEP] Creating git worktree: ../torrents-downloads-feature-auth
[SUCCESS] Created worktree at: ../torrents-downloads-feature-auth
[INFO] Created new branch: worktree/feature-auth
[STEP] Creating .env file with randomized ports
[SUCCESS] Created .env with container prefix: feature-auth-
[STEP] Updating docker-compose.yml container names
[SUCCESS] Updated container names with prefix: feature-auth-

🎉 Worktree Environment Created Successfully!

📁 Worktree Location: ../torrents-downloads-feature-auth
🏷️  Container Prefix: feature-auth-

🔌 Port Configuration:
   VPN_BITTORRENT_PORT=12427
   FLARESOLVERR_PORT=25260
   PLEX_PORT=29233
   NGINX_QBITTORRENT_PORT=27274
   NGINX_PROWLARR_PORT=29968
   WEB_UI_PORT=40587
   PIA_WIREGUARD_PORT=32757
   PIA_FLARESOLVERR_PORT=26175
   PIA_PROWLARR_PORT=29739

🚀 Next Steps:
   1. cd ../torrents-downloads-feature-auth
   2. docker compose up -d
   3. Access services on the new ports shown above
```

### Safety Features

- **Validation**: Worktree name validation (length, characters)
- **Conflict Prevention**: Comprehensive port conflict detection
- **Branch Management**: Automatic branch creation with naming convention
- **Cleanup**: Automatic cleanup on failures
- **Error Handling**: Detailed error messages with colored output

### Integration with Other Scripts

Works seamlessly with:
- `manage-container-prefix.sh` - For changing prefixes later
- Standard Docker Compose commands
- Git worktree management

### Cleanup

To remove a worktree environment:

```bash
# Remove worktree and branch
git worktree remove ../torrents-downloads-feature-auth
git branch -d worktree/feature-auth

# Or use git worktree list/prune for maintenance
git worktree list
git worktree prune
```