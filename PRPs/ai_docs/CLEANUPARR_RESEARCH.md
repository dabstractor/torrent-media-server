# Cleanuparr Research Report

**Generated:** 2025-10-09  
**Repository:** https://github.com/Cleanuparr/Cleanuparr  
**Documentation:** https://cleanuparr.github.io/Cleanuparr/  
**Docker Image:** ghcr.io/cleanuparr/cleanuparr:latest

---

## 1. What is Cleanuparr?

Cleanuparr is an automated download management and cleanup tool designed for media server ecosystems. It integrates with *arr applications (Sonarr, Radarr, Lidarr, Readarr, Whisparr) and torrent/download clients to automatically clean up unwanted, stalled, and malicious downloads.

**Primary Purpose:**
- Address malicious files (e.g., `*.lnk`, `*.zipx`) that get stuck in Sonarr/Radarr requiring manual intervention
- Automate cleanup of failed, stalled, and slow downloads
- Block known malware patterns
- Manage seeding ratios and times
- Remove orphaned downloads no longer referenced by *arr apps
- Support cross-seed setups with hardlink awareness

**Tagline:** "Think of Cleanuparr as the janitor of your server; it keeps your download queue spotless, removes clutter, and blocks malicious files."

---

## 2. How Does It Work? (Architecture & Workflow)

### Architecture Components

Cleanuparr operates as a standalone web application with the following architecture:

1. **Web Interface:** Accessible at `http://localhost:11011` (configurable port)
2. **Scheduled Jobs:** Three main cleanup mechanisms running on configurable cron schedules
3. **API Integrations:** Connects to *arr apps and download clients via their REST APIs
4. **Database:** SQLite database stored in `/config` volume for configuration and state
5. **Health Check System:** Provides `/health`, `/health/ready`, and `/health/detailed` endpoints

### Core Cleanup Mechanisms

#### 1. Malware Blocker
- **Schedule:** Runs every 5 minutes (configurable)
- **Function:** Filters content using community-maintained blocklists
- **Actions:**
  - Removes downloads matching blacklist patterns
  - Supports whitelist mode (only allow matching patterns)
  - Automatically triggers replacement searches
  - Syncs to qBittorrent's built-in blacklist (optional)

#### 2. Queue Cleaner
- **Schedule:** Configurable (default: every 5 minutes)
- **Function:** Monitors *arr download queues using a "strike system"
- **Removes downloads that:**
  - Failed to import (min 3 strikes)
  - Are stalled (min 3 strikes)
  - Are stuck in metadata downloading state
  - Have low download speeds (configurable threshold)
- **Strike System:**
  - Tracks problematic downloads across check intervals
  - Configurable max strikes (minimum 3, or 0 to disable)
  - Can reset strikes when download resumes/improves
  - Deletes and blocks after reaching max strikes

#### 3. Download Cleaner
- **Schedule:** Runs hourly (configurable)
- **Function:** Manages completed downloads based on seeding rules
- **Criteria:**
  - Max seeding ratio
  - Min/Max seed time (hours)
  - Hardlink status (orphaned detection)
  - Download category/tag
- **Special Features:**
  - Cross-seed support (ignores hardlinked files from cross-seed)
  - Can move unlinked downloads to specific category
  - Configurable ignored root directories

### Workflow Example

```
1. Torrent added to qBittorrent by Sonarr
2. Malware Blocker (5 min): Checks filename against blocklist
   └─> If malware: Remove, block in Sonarr, trigger new search
3. Queue Cleaner (5 min): Monitors download progress
   └─> If stalled: Add strike
   └─> If strikes >= max: Remove, block, trigger search
4. Download completes, Sonarr imports
5. Download Cleaner (hourly): Checks seeding rules
   └─> If seeded > max time OR ratio > max: Remove torrent
   └─> If no hardlinks to *arr library: Mark as orphaned
```

---

## 3. APIs and Configuration Options

### Configuration Storage
- **Location:** `/config` volume
- **Format:** SQLite database + configuration files
- **Web UI:** Primary configuration method at `http://localhost:11011`

### General Configuration

**System Settings:**
- `Support Banner`: Show/hide support links on dashboard
- `Dry Run Mode`: Logs irreversible operations without making actual changes (testing mode)
- `Search Replacement Downloads`: Enable/disable automatic search triggers
- `Search Delay`: Configurable delay between replacement searches

**HTTP Configuration:**
- `Max Retries`: Number of HTTP call retry attempts
- `Timeout`: Seconds to wait before failing HTTP calls
- `Certificate Validation`: Options to validate SSL certificates

**Logging Settings:**
- Configurable log levels
- Log file size and retention controls
- Archive log option with retention settings

**Ignored Downloads:**
Can exclude specific downloads based on:
- Torrent hash
- Download client tags/categories/labels
- Tracker domains

### Malware Blocker Configuration

**Documentation:** https://cleanuparr.github.io/Cleanuparr/docs/configuration/malware-blocker/

**Scheduling:**
- **Basic Mode:** Simple interval-based scheduling
- **Advanced Mode:** Full cron expression control
  - Every 5 minutes: `0 0/5 * ? * * *`
  - Every hour: `0 0 * ? * * *`
  - Every 6 hours: `0 0 */6 ? * * *`

**Blocklist Configuration:**
- **Path/URL:** Local file path or remote URL
- **Type:** Blacklist (block matches) or Whitelist (allow only matches)
- **Reload Intervals:**
  - Cleanuparr official lists (`cleanuparr.pages.dev`): Every 5 minutes
  - Other remote URLs: Every 4 hours
  - Local files: Every 5 minutes

**Pattern Types Supported:**
- `*example` - Filename ends with "example"
- `example*` - Filename starts with "example"

- `*example*` - Filename contains "example"
- `example` - Filename exactly matches "example"
- `regex:<ANY_REGEX>` - Custom regex pattern (must be prefixed with `regex:`)

**Official Blocklists:**
- Static blacklist: `https://cleanuparr.pages.dev/static/blacklist`
- Permissive blacklist: (available)
- Known malware patterns: `https://cleanuparr.pages.dev/static/known_malware_file_name_patterns`
- Whitelist: (available)
- Whitelist with subtitles: (available)

**Options:**
- `Ignore Private Torrents`: Skip checking private tracker torrents
- `Delete Private Torrents`: Allow deletion of private torrents (use with caution - can cause Hit & Run penalties)
- `Delete Known Malware`: Automatically remove known malware (updated every 5 minutes)

### Queue Cleaner Configuration

**Documentation:** https://cleanuparr.github.io/Cleanuparr/docs/configuration/queue-cleaner/

**Scheduling:** Same as Malware Blocker (Basic/Advanced cron modes)

**Failed Import Settings:**
- `Max Strikes`: Minimum 3, or 0 to disable (requires download client configured)
- `Ignore Private Torrents`: Skip private tracker torrents
- `Delete Private Torrents`: Allow deletion (caution advised)
- `Ignored Patterns`: Ignore specific failure reasons (e.g., "title mismatch")

**Stalled Download Settings:**
- `Max Strikes`: Minimum 3, or 0 to disable
- `Reset Strikes on Progress`: Clear strikes when download resumes
- `Metadata Download Strikes`: qBittorrent-specific (stuck in metadata state)

**Slow Download Settings:**
- `Max Strikes`: Minimum 3, or 0 to disable
- `Minimum Speed Threshold`: Speed below which download is considered slow

- `Maximum Download Time`: Max time allowed for slow downloads
- `Ignore Downloads Above Size`: Skip large downloads from slow speed checks
- `Reset Strikes on Speed Improvement`: Clear strikes when speed increases

### Download Cleaner Configuration

**Documentation:** https://cleanuparr.github.io/Cleanuparr/docs/configuration/download-cleaner/

**Scheduling:** Same as other modules (Basic/Advanced cron modes)

**Seeding Rules Categories:**
Each category requires:
- `Category Name`: Must match download client exactly
- `Max Ratio`: Seeding ratio threshold (-1 to disable)
- `Min Seed Time`: Minimum hours before eligible for removal
- `Max Seed Time`: Maximum hours to seed (-1 to disable)
- **Important:** Both Max Ratio AND Max Seed Time cannot be -1 simultaneously

**Unlinked Download Settings:**
- `Enable Unlinked Download Handling`: Detect orphaned torrents
- `Target Category/Tag`: Where to move unlinked downloads
- `Ignored Root Directory`: Skip checking specific paths (useful for cross-seed)
- `Categories to Check`: Specific categories to scan for unlinked downloads

**Special Options:**
- `Delete Private Torrents`: Allow removal of private tracker torrents (caution: can cause Hit & Run)
- `Ignored Downloads`: List matching torrent hash, tags, labels, or trackers

### Blacklist Synchronizer Configuration

**Documentation:** https://cleanuparr.github.io/Cleanuparr/docs/configuration/blacklist-sync/

**Function:** Automatically synchronizes blacklist entries to qBittorrent clients

**Key Features:**
- Runs every hour
- Syncs when blacklist path or content changes
- Uses content hash to detect changes (only pushes updates when changed)
- Updates qBittorrent's "Excluded file names" setting

- **Does NOT** automatically enable the exclusion setting in qBittorrent

**Configuration:**
- `Blacklist Path`: Local file or HTTP/HTTPS URL (mandatory when enabled)
  - Example local: `/data/blacklists/qbit-exclusions.txt`
  - Example remote: `https://example.com/blacklist.txt`
- For remote URLs: Ensure server is reachable and certificate is valid

**Important:** If Blacklist Sync is enabled, a blacklist path is mandatory.

### Download Client Configuration

**Documentation:** https://cleanuparr.github.io/Cleanuparr/docs/configuration/download-client/

**Supported Clients:**
- qBittorrent
- Deluge
- Transmission
- µTorrent

**Configuration Fields:**
- `Enable Download Client`: Controls activation for operations and health checks
- `Client Name`: Descriptive identifier for this instance
- `Client Type`: Select which download client software

**Connection Settings:**
- `Host URL Format`: `protocol://hostname:port`
  - Examples:
    - `http://localhost:8080`
    - `https://seedbox.example.com:8080`
    - `http://192.168.1.100:8112`
- `URL Base Path`: Optional prefix for reverse proxy setups
  - Examples: `qbittorrent`, `downloads/deluge`, `transmission`
- `Username`: Optional authentication
- `Password`: Optional authentication

**Pattern Matching:**
Patterns can match:
- Torrent hash
- qBittorrent: tag or category
- Deluge: label
- Transmission: category (last directory from save location)
- µTorrent: label
- Tracker domain

### Notification Configuration

**Documentation:** https://cleanuparr.github.io/Cleanuparr/docs/configuration/notifications/

**Supported Services:**
- **Notifiarr**: Discord notifications via Notifiarr service
  - Requires: API key from Notifiarr dashboard
  - Requires: Notifiarr's Passthrough integration
  - Requires: Discord channel ID (numeric format)
  - Note: Use "global" API key (integration-specific keys don't work with Apprise)
- **Apprise**: Universal notification library (80+ services)
  - Requires: Apprise server URL
  - Requires: Configuration key
- **ntfy**: Simple push notifications

**Event Triggers:**
1. Failed Import Strike
2. Stalled Strike
3. Slow Strike
4. Queue Item Deleted
5. Download Cleaned
6. Category Changed

**Configuration:**
- Each provider can be individually enabled/disabled
- Assign unique provider name for identification
- Granular control over which events trigger notifications

### Health Check Endpoints

**Documentation:** https://cleanuparr.github.io/Cleanuparr/docs/configuration/health-checks/

**Available Endpoints:**

1. **`/health` (Liveness Probe)**
   - Purpose: Verify application is running
   - Response: HTTP 200 (healthy) or 503 (unhealthy)
   - Command: `curl http://localhost:11011/health`
   - Use: Docker HEALTHCHECK, Kubernetes liveness probes

2. **`/health/ready` (Readiness Probe)**
   - Purpose: Confirm application is ready to serve traffic
   - Response: HTTP 200 (ready) or 503 (not ready)
   - Command: `curl http://localhost:11011/health/ready`

   - Use: Kubernetes readiness probes, load balancer health checks
   - Checks: Database connectivity, file system access, download client health

3. **`/health/detailed` (Comprehensive Status)**
   - Purpose: Detailed health status for monitoring and debugging
   - Response: Detailed JSON with component statuses and timing
   - Command: `curl http://localhost:11011/health/detailed`
   - Use: Monitoring systems and troubleshooting

**Health Check Components:**
- Application health
- Database connectivity
- File system access
- Download client status

**Environment Variables Affecting Health Checks:**
- `PORT`: Application port (default: 11011)
- `BASE_PATH`: Affects health check URL paths

---

## 4. Integration with Torrent Clients

### qBittorrent Integration

**Connection:**
- Host URL: `http://qbittorrent:8080` (Docker networking) or `http://localhost:8080`
- Optional: Username/Password authentication
- Optional: URL base path for reverse proxy

**Special Features:**
- **Built-in Blacklist Sync**: Can inject blocklists into qBittorrent's "Excluded file names" setting
- **Metadata Download Detection**: Detect torrents stuck in metadata downloading state
- **Tag/Category Support**: Can organize by tags or categories
- **Malware Blocking**: Integrates with qBittorrent's native malware blocking

**Setup Scenarios:**

1. **Using qBittorrent's Built-in Blacklist** (https://cleanuparr.github.io/Cleanuparr/docs/setup-scenarios/qbit-built-in/)
   - Configure qBittorrent Options → Downloads
   - Check "Excluded file names"

   - Paste exclusion list from official/permissive/custom blacklist
   - Enable Cleanuparr's Queue Cleaner
   - qBittorrent blocks files from being downloaded
   - Malicious torrents marked as complete without downloading

2. **Using Cleanuparr's Malware Blocker** (https://cleanuparr.github.io/Cleanuparr/docs/setup-scenarios/cleanuperr-blocklist/)
   - Configure Malware Blocker with official blocklists
   - Automatic filtering and removal
   - Triggers replacement searches
   - Syncs blocklist to qBittorrent hourly (optional)

### Transmission Integration

**Connection:**
- Host URL: `http://transmission:9091` or `http://localhost:9091`
- Optional: Username/Password authentication
- Optional: URL base path

**Category Support:**
- Categories derived from last directory in save location
- Pattern matching against categories
- Can organize unlinked downloads by category

**Limitations:**
- No native tag support (uses categories)
- No built-in blacklist sync (must use Cleanuparr's Malware Blocker)

### Deluge Integration

**Connection:**
- Host URL: `http://deluge:8112` or `http://localhost:8112`
- Optional: Username/Password authentication
- Optional: URL base path

**Label Support:**
- Uses Deluge's label system
- Pattern matching against labels
- Can organize unlinked downloads by labels

**Limitations:**
- No built-in blacklist sync (must use Cleanuparr's Malware Blocker)

### µTorrent Integration

**Connection:**
- Host URL with authentication
- Optional: URL base path

**Label Support:**

- Uses µTorrent's label system
- Pattern matching against labels

---

## 5. Integration with Sonarr/Radarr (*arr apps)

### Connection Method

Cleanuparr connects to *arr applications via their REST APIs. Configuration is done through the web UI at `http://localhost:11011`.

**Supported *arr Applications:**
- Sonarr (TV shows)
- Radarr (Movies)
- Lidarr (Music)
- Readarr (Books)
- Whisparr (Adult content)

### Configuration Requirements

While specific documentation pages weren't captured, typical *arr app configuration includes:
- **URL**: Full URL to *arr application (e.g., `http://localhost:8989` for Sonarr)
- **API Key**: Found in Settings → General in each *arr app
- **Optional**: URL base path for reverse proxy setups

### Integration Features

**Queue Monitoring:**
- Monitors *arr download queues in real-time
- Detects failed imports, stalled downloads
- Uses *arr's API to check download status
- Tracks strikes per download

**Automatic Actions:**
- **Remove & Block**: Deletes problematic downloads from queue
- **Blocklist**: Adds to *arr's blocklist to prevent re-download
- **Trigger Search**: Automatically initiates new search for replacement content
- **Configurable Search Delay**: Prevent hammering indexers

**Failed Import Handling:**
- Detects when *arr reports import failure
- Tracks failure reasons (can ignore specific patterns like "title mismatch")
- Applies strike system
- Blocks and searches for replacement after max strikes

### Orphaned Download Detection

**How It Works:**

1. Download Cleaner checks for hardlinks between torrent files and *arr library
2. If no hardlinks found → torrent is "orphaned" (not referenced by *arr)
3. Can move to specific category/tag or remove entirely

**Cross-Seed Support:**
- Ignores hardlinks from cross-seed operations
- Configurable ignored root directories (e.g., `/data/downloads`)
- Prevents accidental removal of cross-seeded content still in use

---

## 6. Docker Deployment Patterns

### Docker Image

**Registry:** GitHub Container Registry (GHCR)  
**Image:** `ghcr.io/cleanuparr/cleanuparr:latest`  
**Available Tags:**
- `latest` - Most recent stable release
- `v2.3.3` - Specific version (most recent as of Sept 2023)
- `v2.3.0`, `v2.2.0`, etc. - Previous versions

### Basic Docker Run

```bash
docker run -d \
  --name cleanuparr \
  --restart unless-stopped \
  -p 11011:11011 \
  -v /path/to/config:/config \
  -e PORT=11011 \
  -e PUID=1000 \
  -e PGID=1000 \
  -e UMASK=022 \
  -e TZ=Etc/UTC \
  ghcr.io/cleanuparr/cleanuparr:latest
```

### Docker Compose Example

```yaml
version: "3.8"

services:
  cleanuparr:
    image: ghcr.io/cleanuparr/cleanuparr:latest
    container_name: cleanuparr
    restart: unless-stopped
    ports:
      - "11011:11011"
    volumes:
      - /path/to/config:/config

    environment:
      - PORT=11011
      - BASE_PATH=
      - PUID=1000
      - PGID=1000
      - UMASK=022
      - TZ=Etc/UTC
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:11011/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
```

### Network Considerations

**Standard Deployment:**
- Cleanuparr runs on its own network interface
- Connects to *arr apps and download clients via their exposed ports
- Does NOT need VPN isolation (it only manages, doesn't download)

**With VPN-Isolated Download Clients:**
If your download client (e.g., qBittorrent) uses `network_mode: "container:vpn"`:
- Cleanuparr should NOT share the VPN network
- Cleanuparr connects to download client via VPN container's exposed ports
- Example setup:

```yaml
services:
  vpn:
    image: gluetun
    ports:
      - "8080:8080"  # qBittorrent web UI exposed through VPN
  
  qbittorrent:
    network_mode: "container:vpn"  # Routes through VPN
  
  cleanuparr:
    # Standard networking - connects to qBittorrent via vpn:8080
    ports:
      - "11011:11011"
    # Configure qBittorrent URL as: http://vpn:8080
```

### Volume Mounts

**Required:**
- `/config` - Configuration files and SQLite database

**Optional but Recommended:**

- Mount download directories **IF** using orphaned detection with hardlink checking
- Must match download client's mount paths for accurate hardlink detection
- Example: If qBittorrent has `/data/torrents:/downloads`, Cleanuparr should also have `/data/torrents:/downloads`

**Important Path Mapping Rule:**
> "When using Docker, users must mount the downloads directory the same way it is mounted for the download client - if the download client's directory is /downloads, it should be identical for Cleanuparr."

This is critical for:
- Hardlink detection (orphaned torrent cleanup)
- File existence checks
- Cross-seed support

---

## 7. Environment Variables

### Core Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `11011` | Web interface port |
| `BASE_PATH` | `` | Reverse proxy base path (e.g., `/cleanuparr`) |
| `PUID` | `1000` | User ID for file permissions |
| `PGID` | `1000` | Group ID for file permissions |
| `UMASK` | `022` | File creation mask |
| `TZ` | `Etc/UTC` | Timezone (e.g., `America/New_York`) |

### Usage Notes

**PORT:**
- Changes the web interface port
- Must match port mapping in Docker: `-p <PORT>:<PORT>`
- Affects health check URLs

**BASE_PATH:**
- Used when running behind reverse proxy with subpath
- Example: `BASE_PATH=/cleanuparr` → Access at `http://domain.com/cleanuparr`
- Affects all web routes including health checks

**PUID/PGID:**
- Controls ownership of files in `/config` volume
- Should match host user running Docker (run `id` command)

- Prevents permission errors when accessing config files

**UMASK:**
- Controls default permissions for newly created files
- `022` = files: 644, directories: 755 (recommended)
- `002` = files: 664, directories: 775 (group writable)

**TZ:**
- Sets container timezone for accurate logging and scheduling
- Affects cron schedule execution times
- Use IANA timezone database format

### No Environment Variable Configuration

**Important:** Cleanuparr does NOT use environment variables for:
- Download client connections
- *arr app connections  
- Feature settings (Malware Blocker, Queue Cleaner, etc.)
- Blocklists or cleanup rules

All application configuration is done through the web UI at `http://localhost:11011`.

---

## 8. Volumes and Directory Access

### Required Volumes

**`/config`**
- **Purpose:** Store configuration, database, and logs
- **Contents:**
  - SQLite database with all settings
  - Application configuration files
  - Log files
- **Permissions:** Must be writable by PUID:PGID user
- **Backup:** Critical - contains all Cleanuparr settings

### Optional Volumes (Orphaned Detection)

**Download Directories:**
- **Required for:** Hardlink detection, orphaned torrent cleanup
- **Must match:** Download client's exact mount paths
- **Example:**

```yaml
volumes:
  - /host/config:/config                    # Required
  - /host/data/torrents:/data/torrents      # Optional - for hardlink detection
  - /host/data/media:/data/media            # Optional - for hardlink detection
```

**Why Matching Paths Matter:**

1. Cleanuparr queries download client API for file paths
2. Download client returns paths like `/data/torrents/Movie.mkv`
3. Cleanuparr checks hardlinks using the same path
4. If paths don't match, hardlink detection fails

### Directory Permissions

**Common Issues:**
- Permission denied errors reading download directories
- Config directory not writable
- Log files cannot be created

**Solutions:**
1. Set correct PUID/PGID matching host user
2. Ensure host directories are readable/writable by that user
3. Use `chmod` and `chown` on host directories if needed

```bash
# Example: Fix permissions on host
sudo chown -R 1000:1000 /host/config
sudo chmod -R 755 /host/data/torrents
```

### Cross-Seed Considerations

**Ignored Root Directories:**
- Configure in Download Cleaner settings
- Prevents removal of cross-seeded content
- Example: Set to `/data/downloads` to skip that path entirely

**How It Works:**
- Cleanuparr skips hardlink checks for ignored directories
- Useful when cross-seed creates additional hardlinks
- Prevents false positives for "orphaned" detection

---

## 9. Webhooks and Event Triggers

### No Incoming Webhook Support

Cleanuparr does **NOT** receive webhooks from *arr applications or download clients. Instead, it:
- **Polls** *arr apps via their APIs on scheduled intervals
- **Polls** download clients via their APIs on scheduled intervals
- Uses cron-based scheduling for all operations

### Outgoing Notifications

Cleanuparr can **send** notifications when events occur, but these are push notifications, not webhooks:

**Supported Notification Services:**

- **Notifiarr** → Discord notifications
- **Apprise** → 80+ notification platforms
- **ntfy** → Simple push notifications

**Notification Events:**
1. Failed Import Strike
2. Stalled Strike  
3. Slow Strike
4. Queue Item Deleted
5. Download Cleaned
6. Category Changed

### Operational Model

```
┌─────────────┐         ┌──────────────┐
│  Cleanuparr │◄────────│  Cron Timer  │
└──────┬──────┘         └──────────────┘
       │ API Calls
       ├──────────────────┐
       ▼                  ▼
┌─────────────┐    ┌─────────────┐
│  *arr Apps  │    │  Download   │
│  (Sonarr,   │    │  Clients    │
│   Radarr)   │    │ (qBittorrent)│
└─────────────┘    └─────────────┘

       │
       │ Push Notifications
       ▼
┌─────────────┐
│  Notifiarr/ │
│   Apprise   │
└─────────────┘
```

Cleanuparr is **event-driven by scheduled polling**, not by incoming webhooks.

---

## 10. Common Configuration Pitfalls

### Issue 1: Re-download Loop (Bug)

**Problem:** Queue Cleaner fails to blocklist releases on "Failed Import", causing infinite re-download loops.

**Details:**
- Bug documented in Issue #282 (https://github.com/Cleanuparr/Cleanuparr/issues/282)
- Downloads that can't be imported (e.g., .iso, .exe files) are removed but not blocklisted
- *arr apps immediately re-download the same release
- Malware Blocker correctly blocklists, but Queue Cleaner does not

**Workaround:**
- Use Malware Blocker for file extension filtering
- Monitor logs for repeated downloads

- Manually blocklist problematic releases in *arr apps

### Issue 2: Path Mapping Mismatch

**Problem:** Hardlink detection fails, orphaned torrents not detected correctly.

**Cause:** Download client and Cleanuparr have different mount paths.

**Example of Problem:**
```yaml
qbittorrent:
  volumes:
    - /host/downloads:/downloads      # qBittorrent sees /downloads

cleanuparr:
  volumes:
    - /host/downloads:/data/torrents  # Cleanuparr sees /data/torrents
```

**Solution:** Use identical container paths:
```yaml
qbittorrent:
  volumes:
    - /host/downloads:/downloads

cleanuparr:
  volumes:
    - /host/downloads:/downloads      # Must match!
```

### Issue 3: Category Configuration

**Problem:** Download Cleaner doesn't remove completed downloads.

**Causes:**
- Category name doesn't exactly match download client
- Both Max Ratio AND Max Seed Time set to -1 (disabled)
- No categories configured to check

**Solutions:**
1. Verify exact category name (case-sensitive) in download client
2. Set at least one condition: Max Ratio OR Max Seed Time
3. Add category to "Categories to Check" list

### Issue 4: Private Torrent Deletion

**Problem:** Hit & Run penalties from private trackers.

**Cause:** Cleanuparr removes torrents before meeting seeding requirements.

**Solutions:**
1. Enable "Ignore Private Torrents" in all modules
2. Set appropriate Min Seed Time for private tracker categories

3. Never enable "Delete Private Torrents" unless certain
4. Add private tracker domains to ignored downloads list

### Issue 5: Strike System Minimum

**Problem:** Strike system not working as expected.

**Cause:** Strike values below minimum threshold.

**Solution:**
- Failed Import Strikes: Minimum 3 (or 0 to disable)
- Stalled Strikes: Minimum 3 (or 0 to disable)
- Slow Download Strikes: Minimum 3 (or 0 to disable)
- Requires download client to be configured

### Issue 6: Blacklist Sync Not Applying

**Problem:** qBittorrent not blocking files despite Blacklist Sync enabled.

**Causes:**
1. Blacklist path not configured (mandatory when enabled)
2. "Excluded file names" not enabled in qBittorrent
3. Remote URL unreachable or certificate invalid

**Solutions:**
1. Ensure blacklist path is set (local file or URL)
2. Manually enable "Excluded file names" in qBittorrent Options → Downloads
3. Verify remote URLs are accessible and have valid certificates

### Issue 7: Permission Errors

**Problem:** Cannot read/write files, logs show permission denied.

**Solutions:**
1. Set PUID/PGID to match host user: `id` command shows your UID/GID
2. Fix host directory permissions:
   ```bash
   sudo chown -R 1000:1000 /path/to/config
   sudo chmod -R 755 /path/to/config
   ```
3. Ensure Docker has access to mounted paths

### Issue 8: Health Checks Failing

**Problem:** Docker reports container unhealthy.

**Causes:**
- Slow startup (database initialization)
- File system permission issues

- Download client connectivity issues

**Solutions:**
1. Increase `start_period` in health check (default: 10s)
2. Test manually: `curl http://localhost:11011/health`
3. Check logs for errors: `docker logs cleanuparr`
4. Verify download client configurations in web UI

---

## 11. Best Practices for Deployment

### Pre-Deployment Planning

**1. Understand Your Cleanup Needs**
- Identify which features you need: Malware blocking? Stalled cleanup? Seeding management?
- Start with one feature enabled, add others gradually
- Use Dry Run Mode initially to preview actions without making changes

**2. Plan Path Structure**
- Use consistent paths across all containers
- Document your path mapping strategy
- Consider using a unified `/data` structure:
  ```
  /data
    ├── torrents/     # Active downloads
    ├── media/        # *arr libraries
    └── config/       # App configs
  ```

**3. Private Tracker Considerations**
- Inventory your private trackers and their requirements
- Set "Ignore Private Torrents" globally, or
- Configure category-specific rules with appropriate Min Seed Times
- Never enable "Delete Private Torrents" without careful consideration

### Initial Setup Process

**1. Install & Access**
```bash
docker run -d --name cleanuparr \
  --restart unless-stopped \
  -p 11011:11011 \
  -v /path/to/config:/config \
  -e PUID=1000 -e PGID=1000 -e TZ=America/New_York \
  ghcr.io/cleanuparr/cleanuparr:latest

# Access web UI
```
Open: http://localhost:11011

**2. Configure Download Clients First**
- Add all download clients (qBittorrent, Transmission, etc.)

- Test connectivity (should show healthy in UI)
- Verify correct URL format: `http://hostname:port`

**3. Configure *arr Applications**
- Add Sonarr, Radarr, etc.
- Enter API keys from Settings → General in each *arr app
- Test connectivity

**4. Enable Features Incrementally**

**Start with Malware Blocker:**
- Enable Malware Blocker
- Use official blocklist: `https://cleanuparr.pages.dev/static/blacklist`
- Enable "Delete Known Malware"
- Monitor logs for 24-48 hours

**Then add Queue Cleaner:**
- Start with Failed Import Strikes only
- Set max strikes to 5 (lenient initially)
- Monitor logs for false positives
- Gradually add Stalled and Slow detection

**Finally add Download Cleaner:**
- Configure seeding rules per category
- Start with high Max Seed Time (e.g., 30 days)
- Enable orphaned detection last
- Test with Dry Run Mode

**5. Configure Notifications**
- Set up Notifiarr or Apprise
- Enable notifications for "Queue Item Deleted" and "Download Cleaned"
- Monitor notifications for unexpected actions

### Production Configuration

**General Settings:**
```
Dry Run Mode: OFF (after testing)
Search Replacement: ON
Search Delay: 5-10 minutes
Max Retries: 3
Timeout: 30 seconds
Certificate Validation: ON (unless using self-signed certs)
```

**Malware Blocker:**
```
Schedule: Every 5 minutes
Blocklist: https://cleanuparr.pages.dev/static/blacklist
Type: Blacklist
Delete Known Malware: ON

Ignore Private Torrents: ON (if using private trackers)
```

**Queue Cleaner:**
```
Schedule: Every 5 minutes
Failed Import Strikes: 3-5
Stalled Strikes: 5
Slow Download Strikes: 5
Minimum Speed: 100 KB/s
Ignore Private Torrents: ON
Reset Strikes on Progress: ON
```

**Download Cleaner:**
```
Schedule: Every hour (or every 6 hours)

Category Rules (example):
- radarr:
  Max Ratio: 2.0
  Min Seed Time: 48 hours
  Max Seed Time: 30 days
  
- sonarr:
  Max Ratio: 1.5
  Min Seed Time: 72 hours
  Max Seed Time: 45 days

Orphaned Detection:
- Enable: YES
- Target Category: "cleanuparr-orphaned"
- Ignored Root: /data/cross-seed (if applicable)
```

**Blacklist Sync (qBittorrent only):**
```
Enable: OPTIONAL
Blacklist Path: https://cleanuparr.pages.dev/static/blacklist
Note: Manually enable "Excluded file names" in qBittorrent
```

### Monitoring & Maintenance

**Daily:**
- Check notifications for unexpected deletions
- Review web UI dashboard for stats

**Weekly:**
- Review logs for errors or warnings
- Verify orphaned detection accuracy
- Check if blocklists are updating (timestamps in logs)

**Monthly:**
- Review and adjust strike thresholds based on false positives
- Evaluate seeding rules effectiveness
- Update to latest Cleanuparr version if available

### Backup Strategy

**Critical Backup:**
- `/config` volume contains entire configuration
- Backup before major version upgrades
- Include in regular backup rotation

```bash
# Backup config
tar -czf cleanuparr-config-$(date +%Y%m%d).tar.gz /path/to/config/

# Restore config
docker stop cleanuparr
tar -xzf cleanuparr-config-20231009.tar.gz -C /path/to/
docker start cleanuparr
```

### Security Best Practices

**1. API Key Protection**
- Store *arr API keys securely
- Don't expose Cleanuparr port publicly (use reverse proxy with auth)
- Use HTTPS for remote access

**2. Network Segmentation**
- Cleanuparr doesn't need VPN isolation (doesn't download torrents)
- Place on management network with *arr apps
- Download clients can be on separate VPN network

**3. Certificate Validation**
- Keep certificate validation enabled
- Use proper SSL certificates for *arr apps
- Only disable for trusted self-signed certificates

### Performance Optimization

**1. Schedule Tuning**
- Malware Blocker: Every 5 minutes (default, appropriate)
- Queue Cleaner: Every 5-10 minutes (balance responsiveness vs API load)
- Download Cleaner: Every 1-6 hours (less frequent, not time-critical)

**2. Reduce API Load**
- Use longer intervals for Download Cleaner
- Configure appropriate ignored downloads lists
- Limit number of *arr apps if possible

**3. Database Maintenance**
- Cleanuparr uses SQLite in `/config`
- No manual maintenance required
- Consider periodic backups to prevent corruption

### Troubleshooting Checklist

**When things go wrong:**

1. **Check logs:**
   ```bash
   docker logs cleanuparr
   docker logs cleanuparr --tail 100
   docker logs cleanuparr --follow
   ```

2. **Verify connectivity:**
   ```bash
   # From Cleanuparr container
   docker exec cleanuparr curl http://sonarr:8989/api/v3/system/status?apikey=YOUR_KEY
   docker exec cleanuparr curl http://qbittorrent:8080/api/v2/app/version
   ```

3. **Check health status:**
   ```bash
   curl http://localhost:11011/health/detailed
   ```

4. **Review configuration:**
   - Web UI → General → Verify all settings
   - Check download client configurations (test button)
   - Check *arr app configurations (test button)

5. **Enable Dry Run Mode:**
   - Test configuration changes safely
   - Review logs for what WOULD happen
   - Disable once confident

---

## 12. Version History & Release Notes

### Latest Stable Release: v2.3.3 (September 29, 2023)

**Changes:**
- Fixed icons paths
- Improved UI caching for Download Cleaner page
- Added status JSON to Cloudflare pages

### v2.3.0 (September 15, 2023)

**Major Features:**
- Added option to inject blacklist into qBittorrent (Blacklist Sync)
- Added ignored downloads setting per job
- Added ntfy notification support
- Improved frontend layout

**Bug Fixes:**
- Fixed slow strikes reset mechanism

### v2.2.0 (September 2, 2023)

**Features:**
- Improved download client health checks
- Added configurable log retention
- Reworked notifications system
- Made sidebar scrollable

**Release Links:**
- GitHub Releases: https://github.com/Cleanuparr/Cleanuparr/releases
- Latest: https://github.com/Cleanuparr/Cleanuparr/releases/tag/v2.3.3

---

## 13. Additional Resources

### Official Documentation

**Main Documentation:** https://cleanuparr.github.io/Cleanuparr/

**Key Pages:**
- About & Features: https://cleanuparr.github.io/Cleanuparr/docs/
- How It Works: https://cleanuparr.github.io/Cleanuparr/docs/how_it_works/
- Installation Guide: https://cleanuparr.github.io/Cleanuparr/docs/installation/detailed/
- Configuration Overview: https://cleanuparr.github.io/Cleanuparr/docs/category/configuration/

**Feature Configuration:**
- General Settings: https://cleanuparr.github.io/Cleanuparr/docs/configuration/general/
- Download Client: https://cleanuparr.github.io/Cleanuparr/docs/configuration/download-client/
- Malware Blocker: https://cleanuparr.github.io/Cleanuparr/docs/configuration/malware-blocker/
- Queue Cleaner: https://cleanuparr.github.io/Cleanuparr/docs/configuration/queue-cleaner/
- Download Cleaner: https://cleanuparr.github.io/Cleanuparr/docs/configuration/download-cleaner/
- Blacklist Sync: https://cleanuparr.github.io/Cleanuparr/docs/configuration/blacklist-sync/
- Notifications: https://cleanuparr.github.io/Cleanuparr/docs/configuration/notifications/
- Health Checks: https://cleanuparr.github.io/Cleanuparr/docs/configuration/health-checks/

**Setup Scenarios:**
- Setup Scenarios Overview: https://cleanuparr.github.io/Cleanuparr/docs/category/setup-scenarios/
- Using qBittorrent's Built-in Blacklist: https://cleanuparr.github.io/Cleanuparr/docs/setup-scenarios/qbit-built-in/
- Using Cleanuparr's Malware Blocker: https://cleanuparr.github.io/Cleanuparr/docs/setup-scenarios/cleanuperr-blocklist/

### GitHub Repository

**Repository:** https://github.com/Cleanuparr/Cleanuparr  
**Issues:** https://github.com/Cleanuparr/Cleanuparr/issues  
**Releases:** https://github.com/Cleanuparr/Cleanuparr/releases  

**Known Issues:**
- Issue #282: Queue Cleaner re-download loop bug (https://github.com/Cleanuparr/Cleanuparr/issues/282)

### Docker Images

**GitHub Container Registry:**
- Image: `ghcr.io/cleanuparr/cleanuparr:latest`
- Version Tags: `v2.3.3`, `v2.3.0`, `v2.2.0`, etc.
- Package Page: https://github.com/orgs/Cleanuparr/packages

### Community Blocklists

**Official Cleanuparr Blocklists:**
- Blacklist: `https://cleanuparr.pages.dev/static/blacklist`
- Known Malware Patterns: `https://cleanuparr.pages.dev/static/known_malware_file_name_patterns`
- Permissive Blacklist: Available on cleanuparr.pages.dev
- Whitelist: Available on cleanuparr.pages.dev
- Whitelist with Subtitles: Available on cleanuparr.pages.dev

**Update Frequency:**
- Official lists updated and fetched every 5 minutes by Cleanuparr

### Related Tools & Guides

**TRaSH Guides:**
- 3rd Party Tools: https://trash-guides.info/Downloaders/3rd-party-tools/
- qBittorrent Basic Setup: https://trash-guides.info/Downloaders/qBittorrent/Basic-Setup/
- Hardlinks and Instant Moves: https://trash-guides.info/File-and-Folder-Structure/Hardlinks-and-Instant-Moves/

**Similar Tools:**
- Janitorr: https://github.com/Schaka/janitorr (Cleans Radarr, Sonarr, Jellyseerr before running out of space)
- Decluttarr: https://github.com/ManiMatter/decluttarr (Removes stalled downloads from queues)

### Platform Support

**Docker:** Recommended installation method (Linux, Windows, macOS)
**Windows:** Installer (.exe) and portable (.zip)
**macOS:** Installer (.pkg) and portable (.zip) for Intel and Apple Silicon  
**Linux:** Portable executable and systemd service  
**Arch Linux:** AUR package available (`cleanuparr`)  
**Unraid:** Community support available  

---

## 14. Summary & Quick Start

### What is Cleanuparr?

Cleanuparr is an automated "janitor" for your media server that:
- **Blocks malware** using community blocklists
- **Removes failed/stalled/slow downloads** using a strike system
- **Manages seeding** based on time and ratio
- **Cleans orphaned torrents** no longer referenced by *arr apps
- **Supports cross-seed** setups with hardlink awareness

### Quick Start (Docker)

```bash
# 1. Run Cleanuparr
docker run -d \
  --name cleanuparr \
  --restart unless-stopped \
  -p 11011:11011 \
  -v /path/to/config:/config \
  -v /path/to/downloads:/downloads \
  -e PUID=1000 -e PGID=1000 -e TZ=America/New_York \
  ghcr.io/cleanuparr/cleanuparr:latest

# 2. Open web UI
# http://localhost:11011

# 3. Configure in this order:
#    - Add Download Clients (qBittorrent, etc.)
#    - Add *arr Apps (Sonarr, Radarr, etc.)
#    - Enable Malware Blocker with official blocklist
#    - Enable Queue Cleaner with strikes = 5
#    - Enable Download Cleaner with seeding rules

# 4. Monitor logs
docker logs -f cleanuparr
```

### Key Configuration Rules

✅ **DO:**
- Start with Dry Run Mode enabled
- Use official blocklists: `https://cleanuparr.pages.dev/static/blacklist`
- Set strikes to 3-5 minimum
- Match download paths between Cleanuparr and download clients
- Enable "Ignore Private Torrents" if using private trackers
- Set appropriate Min Seed Time for private tracker categories
- Test connectivity to all download clients and *arr apps
- Monitor notifications for unexpected actions

❌ **DON'T:**
- Enable "Delete Private Torrents" without careful consideration
- Set both Max Ratio AND Max Seed Time to -1 (at least one must be configured)
- Use different mount paths between Cleanuparr and download clients
- Ignore path mapping requirements for hardlink detection
- Skip Dry Run Mode testing on first setup
- Set strikes below 3 (minimum threshold)

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      Cleanuparr                         │
│                  (Port 11011)                           │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Malware    │  │    Queue     │  │   Download   │ │
│  │   Blocker    │  │   Cleaner    │  │   Cleaner    │ │
│  │  (5 min)     │  │  (5 min)     │  │  (hourly)    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Configuration Database (SQLite)          │  │
│  │              /config volume                      │  │
│  └──────────────────────────────────────────────────┘  │
└───────────┬─────────────────────┬─────────────────────┘
            │ API Calls           │ API Calls
            ▼                     ▼
    ┌───────────────┐     ┌──────────────────┐
    │   *arr Apps   │     │ Download Clients │
    │               │     │                  │
    │ - Sonarr      │     │ - qBittorrent    │
    │ - Radarr      │     │ - Transmission   │
    │ - Lidarr      │     │ - Deluge         │
    │ - Readarr     │     │ - µTorrent       │
    │ - Whisparr    │     │                  │
    └───────────────┘     └──────────────────┘
```

### When to Use Cleanuparr

**Perfect for:**
- Media servers with recurring malware downloads
- Cleaning up stalled/failed downloads automatically
- Managing seeding ratios and times
- Cross-seed setups with orphaned torrent cleanup
- Automating manual cleanup tasks

**Not needed if:**
- You manually manage downloads and it works fine
- You have a simple setup with few issues
- You don't need automated seeding management
- Your download clients handle everything adequately

---

## 15. Integration Example: Complete Docker Compose Stack

### Example: Cleanuparr + qBittorrent + Sonarr/Radarr

```yaml
version: "3.8"

services:
  # VPN Container (optional but recommended for torrents)
  vpn:
    image: qmcgaw/gluetun
    container_name: gluetun
    cap_add:
      - NET_ADMIN
    environment:
      - VPN_SERVICE_PROVIDER=private internet access
      - OPENVPN_USER=${VPN_USER}
      - OPENVPN_PASSWORD=${VPN_PASSWORD}
      - SERVER_REGIONS=US East
    ports:
      - 8080:8080  # qBittorrent web UI
    volumes:
      - /path/to/gluetun:/gluetun
    restart: unless-stopped

  # qBittorrent - isolated via VPN
  qbittorrent:
    image: lscr.io/linuxserver/qbittorrent:latest
    container_name: qbittorrent
    network_mode: "container:vpn"  # Routes through VPN
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
      - WEBUI_PORT=8080
    volumes:
      - /path/to/qbittorrent/config:/config
      - /data/torrents:/downloads  # IMPORTANT: Same path as cleanuparr
    depends_on:
      - vpn
    restart: unless-stopped

  # Sonarr
  sonarr:
    image: lscr.io/linuxserver/sonarr:latest
    container_name: sonarr
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York

    ports:
      - 8989:8989
    volumes:
      - /path/to/sonarr/config:/config
      - /data/media/tv:/tv
      - /data/torrents:/downloads  # Same path as qbittorrent & cleanuparr
    restart: unless-stopped

  # Radarr
  radarr:
    image: lscr.io/linuxserver/radarr:latest
    container_name: radarr
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
    ports:
      - 7878:7878
    volumes:
      - /path/to/radarr/config:/config
      - /data/media/movies:/movies
      - /data/torrents:/downloads  # Same path as qbittorrent & cleanuparr
    restart: unless-stopped

  # Cleanuparr - NOT on VPN, standard networking
  cleanuparr:
    image: ghcr.io/cleanuparr/cleanuparr:latest
    container_name: cleanuparr
    environment:
      - PORT=11011
      - PUID=1000
      - PGID=1000
      - UMASK=022
      - TZ=America/New_York
    ports:
      - 11011:11011
    volumes:
      - /path/to/cleanuparr/config:/config
      - /data/torrents:/downloads  # CRITICAL: Same path for hardlink detection
      - /data/media:/media          # Optional: For hardlink verification
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:11011/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
    restart: unless-stopped
    depends_on:
      - sonarr
      - radarr

      - qbittorrent

# Host directory structure:
# /data/
#   ├── torrents/          # Active downloads (shared by all)
#   │   ├── movies/
#   │   └── tv/
#   ├── media/             # Final library
#   │   ├── movies/
#   │   └── tv/
#   └── config/
#       ├── sonarr/
#       ├── radarr/
#       ├── qbittorrent/
#       └── cleanuparr/
```

### Configuration in Cleanuparr Web UI

After starting the stack, configure Cleanuparr at `http://localhost:11011`:

**1. Add Download Client (qBittorrent):**
```
Name: qBittorrent
Type: qBittorrent
URL: http://vpn:8080          # Access via VPN container
Username: admin
Password: <your-password>
```

**2. Add *arr Apps:**
```
Sonarr:
  URL: http://sonarr:8989
  API Key: <from Sonarr Settings → General>

Radarr:
  URL: http://radarr:7878
  API Key: <from Radarr Settings → General>
```

**3. Enable Malware Blocker:**
```
Schedule: Every 5 minutes
Blocklist URL: https://cleanuparr.pages.dev/static/blacklist
Type: Blacklist
Delete Known Malware: ✓
```

**4. Enable Queue Cleaner:**
```
Schedule: Every 5 minutes
Failed Import Strikes: 5
Stalled Strikes: 5
Slow Download Strikes: 5
Minimum Speed: 100 KB/s
```

**5. Enable Download Cleaner:**
```
Schedule: Every hour

Categories:
  - radarr: Max Ratio 2.0, Max Seed Time 720h (30 days)
  - sonarr: Max Ratio 1.5, Max Seed Time 1080h (45 days)
```

---

## 16. Frequently Asked Questions

### Q: Does Cleanuparr need to be on the VPN with my torrent client?

**A:** No. Cleanuparr only manages downloads via APIs; it doesn't download torrents itself. It should run on standard networking and connect to your download client through the VPN container's exposed ports.

### Q: Will Cleanuparr delete my actively seeding torrents?

**A:** Only if they meet your configured criteria (Max Ratio, Max Seed Time, or orphaned detection). Configure appropriate thresholds and use "Ignore Private Torrents" to protect important downloads.

### Q: How do I prevent accidental deletion of private tracker torrents?

**A:** Three options:
1. Enable "Ignore Private Torrents" globally in all modules
2. Set appropriate Min Seed Time per category (e.g., 168 hours minimum)
3. Add private tracker domains to ignored downloads list

### Q: Why aren't hardlinks being detected correctly?

**A:** Path mapping mismatch. Ensure Cleanuparr and your download client mount the same host directory to the same container path. Example: Both use `/downloads`, not one using `/downloads` and another using `/data/torrents`.

### Q: Can Cleanuparr work without *arr apps?

**A:** Partially. The Download Cleaner can manage seeding without *arr apps, but Queue Cleaner and Malware Blocker require *arr apps to monitor queues and trigger replacement searches.

### Q: Does Cleanuparr support Usenet (SABnzbd, NZBGet)?

**A:** Not currently. As of v2.3.3, only torrent clients are supported (qBittorrent, Transmission, Deluge, µTorrent). SABnzbd support has been requested (Issue #273).

### Q: How often do blocklists update?

**A:**
- Official Cleanuparr lists (`cleanuparr.pages.dev`): Every 5 minutes
- Other remote URLs: Every 4 hours
- Local files: Every 5 minutes

### Q: What's the difference between Malware Blocker and Queue Cleaner?

**A:**
- **Malware Blocker:** Filters by filename patterns using blocklists. Runs independently of *arr status.
- **Queue Cleaner:** Monitors *arr download queues and removes based on import status (failed, stalled, slow). Requires *arr apps.

### Q: Can I use Cleanuparr with cross-seed?

**A:** Yes! Configure "Ignored Root Directory" in Download Cleaner to skip paths where cross-seed operates. This prevents accidental removal of cross-seeded content.

### Q: Is there an API for Cleanuparr?

**A:** Yes, health check endpoints are documented (`/health`, `/health/ready`, `/health/detailed`). However, full REST API documentation for configuration management is not publicly available. Primary configuration is through the web UI.

### Q: How do I test configuration without deleting anything?

**A:** Enable "Dry Run Mode" in General settings. Cleanuparr will log what it would do without making actual changes. Monitor logs, then disable Dry Run when confident.

### Q: What happens if Cleanuparr goes offline?

**A:** Nothing catastrophic. Your downloads continue normally. When Cleanuparr comes back online, it resumes monitoring on its next scheduled run. Strike counts persist in the database.

### Q: Can I run multiple Cleanuparr instances?

**A:** Not recommended. Multiple instances managing the same download clients/arr apps could conflict and cause issues. Use a single instance per media server ecosystem.

---

## 17. Conclusion

Cleanuparr is a powerful automation tool that solves common pain points in media server management:
- Eliminates manual cleanup of malicious/failed downloads
- Automates seeding management
- Keeps download queues clean and efficient
- Supports complex setups including cross-seed and private trackers

**Key Takeaways:**
1. Start conservatively with Dry Run Mode and high strike thresholds
2. Path mapping consistency is critical for hardlink detection
3. Use official blocklists for malware protection
4. Configure private tracker protections if applicable
5. Monitor notifications and logs initially to tune settings
6. Cleanuparr runs on scheduled polling, not webhooks

**Getting Started:**
```bash
docker run -d --name cleanuparr \
  -p 11011:11011 \
  -v /path/to/config:/config \
  -v /data/torrents:/downloads \
  -e PUID=1000 -e PGID=1000 -e TZ=America/New_York \
  ghcr.io/cleanuparr/cleanuparr:latest
```

Open `http://localhost:11011` and configure step-by-step as outlined in this document.

---

**Report Generated:** 2025-10-09  
**Research Version:** Based on Cleanuparr v2.3.3
