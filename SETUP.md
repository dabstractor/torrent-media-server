# Project Setup Instructions

## ⚡ Fully Automated Setup

**No manual steps required!** This project is now fully automated:

```bash
docker compose up -d
```

That's it! All services will start with complete configurations automatically.

### Verify All Services are Healthy
```bash
docker ps
```
All containers should show status as "healthy".

## 🚀 What's Automatically Configured

On first startup, Prowlarr gets a complete configuration automatically:

### Authentication & Security
- **Username:** `admin`
- **Password:** `password` 
- **API Key:** `2feed2fe71424878bb7945ead222f367` (fixed)
- **Authentication:** Forms with local network bypass
- **Local Access:** No authentication required for local connections

### FlareSolverr Proxy Configuration
- **Service:** Configured and enabled
- **Host:** `http://flaresolverr:8191/`
- **Timeout:** 60 seconds
- **Purpose:** CloudFlare bypass for indexers

### Pre-configured Indexers (20 total)
All enabled and ready to use:
- **0Magnet** - General torrents
- **BitSearch** - Multi-category search
- **BTdirectory** - Directory-style indexer  
- **btstate** - General indexer
- **1337x** - Popular general tracker
- **EZTV** - TV shows specialist
- **ExtraTorrent.st** - General torrents
- **FileMood** - File search
- **kickasstorrents.ws** - KAT clone
- **Isohunt2** - Search engine
- **LimeTorrents** - General tracker
- **Magnet Cat** - Magnet links
- **The Pirate Bay** - Classic tracker
- **kickasstorrents.to** - Another KAT clone
- **TheRARBG** - RARBG clone
- **Torrent Downloads** - General downloads
- **TorrentDownload** - Download portal
- **TorrentGalaxyClone** - TG mirror
- **Uindex** - General search
- **YTS** - Movie quality specialist

### App Sync Profile
- **Profile:** Standard (enabled for RSS, Interactive & Automatic search)

## Backup & Restore Scripts

### Create New Configuration Backup
```bash
./scripts/backup-prowlarr-config.sh
```

### Restore from Backup
```bash
./scripts/restore-prowlarr-config.sh
```

## Environment Configuration

The project uses these key environment variables in `.env`:
```env
PROWLARR_API_KEY=2feed2fe71424878bb7945ead222f367
FLARESOLVERR_URL=http://flaresolverr:8191
```

## Why This Comprehensive Approach?

Prowlarr stores complex configurations in SQLite database including:
- User credentials and authentication settings
- Indexer definitions and credentials  
- Proxy configurations
- Application sync profiles

Simple API key fixes don't preserve indexer configurations, user settings, or proxy setups. The database restore ensures identical configuration across all deployments.

## 🔧 How the Automation Works

The project uses a **custom entrypoint script** (`./scripts/prowlarr-entrypoint.sh`) that:

1. **Detects fresh installations** - Checks if Prowlarr database exists
2. **Restores complete configuration** - Copies pre-configured database and config files
3. **Starts Prowlarr normally** - Hands off to the original LinuxServer.io entrypoint

This happens **automatically during container startup**, ensuring:
- ✅ **Zero manual steps** - Just run `docker compose up -d`  
- ✅ **Consistent deployments** - Identical config every time
- ✅ **No timing issues** - Configuration restored before Prowlarr starts
- ✅ **Preserves updates** - Only runs on truly fresh installations

### Manual Configuration Scripts (Available but not needed)

If you need to manually manage configurations:
- `./scripts/backup-prowlarr-config.sh` - Create configuration backup  
- `./scripts/restore-prowlarr-config.sh` - Manual restoration
- `./scripts/set-prowlarr-apikey.sh` - Quick API key fix only