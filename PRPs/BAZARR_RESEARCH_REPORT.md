# Bazarr Comprehensive Research Report
**Generated**: 2025-10-09
**Purpose**: Subtitle automation integration with Sonarr/Radarr

---

## 1. Official Bazarr Documentation

### 1.1 Primary Resources
- **Official Website**: https://www.bazarr.media/
- **Official Wiki**: https://wiki.bazarr.media/
- **GitHub Repository**: https://github.com/morpheus65535/bazarr
- **TRaSH Guides (Best Practices)**: https://trash-guides.info/Bazarr/

### 1.2 Key Documentation URLs with Anchors

#### Installation & Setup
- **Setup Guide**: https://wiki.bazarr.media/Getting-Started/Setup-Guide/
- **First Time Configuration**: https://wiki.bazarr.media/Getting-Started/First-time-installation-configuration/
- **Docker Installation**: https://wiki.bazarr.media/Getting-Started/Installation/Docker/docker/

#### Configuration
- **Settings Documentation**: https://wiki.bazarr.media/Additional-Configuration/Settings/
- **PostgreSQL Database**: https://wiki.bazarr.media/Additional-Configuration/PostgreSQL-Database/
- **Webhooks**: https://wiki.bazarr.media/Additional-Configuration/Webhooks/
- **Performance Tuning**: https://wiki.bazarr.media/Additional-Configuration/Performance-Tuning/
- **Plex Integration**: https://wiki.bazarr.media/Additional-Configuration/Plex/

#### Troubleshooting
- **FAQ**: https://wiki.bazarr.media/Troubleshooting/FAQ/

### 1.3 API Documentation Status

**CRITICAL FINDING**: Bazarr does **NOT** have formal API documentation.

- **API Exists**: Bazarr has a REST API built with Flask-RESTX
- **No OpenAPI/Swagger**: No official OpenAPI specification or Swagger UI found
- **Undocumented**: API is primarily for internal use by the web interface
- **Source Code Required**: To use API endpoints, you must examine the source code
- **API File Location**: `/bazarr/api/` directory in GitHub repository
- **Known API Files**:
  - `bazarr/api.py` (~1795 lines)
  - `/opt/Bazarr/bazarr/api/system/settings.py`

#### Known API Endpoints
```
# Webhooks (documented)
GET/POST  /api/webhooks/plex?apikey=YOUR_BAZARR_API_KEY

# System (inferred from source)
POST      /api/system/settings
GET       /api/system/account?action=login
GET       /api/system/status
```

**API Key Location**: Settings → General → Security

---

## 2. Docker Deployment

### 2.1 Official Docker Image

**Primary Image**: `lscr.io/linuxserver/bazarr:latest`
**Image Maintainer**: LinuxServer.io
**Documentation**: https://docs.linuxserver.io/images/docker-bazarr/
**Docker Hub**: https://hub.docker.com/r/linuxserver/bazarr

**Alternative Images**:
- `hotio/bazarr` - https://hotio.dev/containers/bazarr/

### 2.2 Environment Variables

```yaml
environment:
  - PUID=1000              # User ID for file permissions
  - PGID=1000              # Group ID for file permissions
  - TZ=Etc/UTC             # Timezone (optional)
  - UMASK=022              # Optional: override default umask
```

**PostgreSQL Environment Variables** (take precedence over config.yaml):
```yaml
  - POSTGRES_ENABLED=true
  - POSTGRES_HOST=localhost
  - POSTGRES_PORT=5432
  - POSTGRES_DATABASE=bazarr
  - POSTGRES_USERNAME=<username>
  - POSTGRES_PASSWORD=<password>
  - PGSSLCERT=/tmp/postgresql.crt  # For non-root containers
```

### 2.3 Volume Mappings

```yaml
volumes:
  - /path/to/bazarr/config:/config     # Required: persistent config
  - /path/to/movies:/movies            # Optional: movie library
  - /path/to/tv:/tv                    # Optional: TV show library
```

### 2.4 Port Mappings

```yaml
ports:
  - 6767:6767  # HTTP web interface
```

### 2.5 Complete Docker Compose Example

```yaml
services:
  bazarr:
    image: lscr.io/linuxserver/bazarr:latest
    container_name: bazarr
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=Etc/UTC
    volumes:
      - /path/to/bazarr/config:/config
      - /path/to/movies:/movies
      - /path/to/tv:/tv
    ports:
      - 6767:6767
    restart: unless-stopped
```

---

## 3. Sonarr/Radarr Integration

### 3.1 How Bazarr Connects

**Connection Method**: HTTP/HTTPS API calls to Sonarr/Radarr
**Polling Interval**: Every 1-5 minutes (pull mode, not webhook-based)
**API Version**: Uses Sonarr/Radarr v3 API endpoints

### 3.2 Required Configuration Parameters

#### Sonarr Configuration
```yaml
# Location: Bazarr Settings → Sonarr
Enabled: true
Hostname/IP: sonarr           # Container name or IP (NOT 127.0.0.1 in Docker!)
Port: 8989                    # Default Sonarr port
Base URL: /sonarr             # ONLY if using reverse proxy, must start with /
API Key: <sonarr_api_key>     # From Sonarr → Settings → General → Security
SSL Enabled: false/true
```

#### Radarr Configuration
```yaml
# Location: Bazarr Settings → Radarr
Enabled: true
Hostname/IP: radarr           # Container name or IP (NOT 127.0.0.1 in Docker!)
Port: 7878                    # Default Radarr port
Base URL: /radarr             # ONLY if using reverse proxy, must start with /
API Key: <radarr_api_key>     # From Radarr → Settings → General → Security
SSL Enabled: false/true
```

### 3.3 Path Mapping Requirements

**When Path Mapping is NEEDED**:
- Sonarr/Radarr run on different physical machines than Bazarr
- Different mount points between containers
- Synology mixing packages with Docker

**When Path Mapping is NOT NEEDED**:
- All services run in Docker with consistent volume mappings
- Same file paths across all containers

**BEST PRACTICE**: Use identical volume mappings across Sonarr, Radarr, and Bazarr to avoid path mapping entirely.

**Example Path Mapping** (only if absolutely necessary):
```
From Sonarr/Radarr: /data/media/tv
To Bazarr:          /tv
```

**Common Error**:
```
This Sonarr root directory does not seem to be accessible by Bazarr.
Please check path mapping.
```
**Solution**: Ensure volume paths match exactly, or configure path mapping correctly.

### 3.4 Authentication Requirements

**API Key Retrieval**:
1. Open Sonarr/Radarr
2. Navigate to: Settings → General → Security
3. Copy the API Key
4. Paste into Bazarr's Sonarr/Radarr settings

**Test Connection**: Always click "Test" button after entering all fields before saving.

### 3.5 Webhook/Event Integration

**IMPORTANT LIMITATION**: Bazarr does **NOT** use Sonarr/Radarr webhooks for triggering subtitle downloads.

**Why Not Webhooks?**
- Sonarr doesn't call webhooks when series are added
- Bazarr operates in "pull mode" instead
- Synchronization occurs every 1-5 minutes via scheduled tasks

**Bazarr's Own Webhooks**:
Bazarr can **receive** webhook calls from:
- Plex (when media is played)
- Sonarr/Radarr (for subtitle requests)

**Plex Webhook Example** (requires Plex Pass):
```
http://bazarr:6767/api/webhooks/plex?apikey=YOUR_BAZARR_API_KEY
```

---

## 4. Configuration Files & Database

### 4.1 Configuration File Structure

**Configuration File**: `config.yaml` (changed from `config.ini` in v1.4)
**Location**: `/config/config.yaml` (in Docker container)

**PostgreSQL Configuration Example**:
```yaml
postgresql:
  enabled: true
  host: localhost
  port: 5432
  database: bazarr
  username: <postgres_username>
  password: <postgres_password>
```

**CRITICAL NOTES**:
- `config.yaml` is created on first startup but takes time to populate
- Primary configuration method is the **web interface** at `http://[IP]:6767`
- Web UI changes are automatically written to `config.yaml`
- Manual editing is possible but not recommended
- Environment variables override `config.yaml` settings

### 4.2 Database Configuration

**Default Database**: SQLite
**Location**: `/config/db/bazarr.db`

**PostgreSQL Support**: Available from v1.1.5-beta.8+
**Recommended Version**: PostgreSQL 14
**Minimum Version**: PostgreSQL 9

#### PostgreSQL Docker Deployment Example
```bash
docker create --name=postgres14 \
     -e POSTGRES_PASSWORD=<postgres_password> \
     -e POSTGRES_USER=<postgres_username> \
     -e POSTGRES_DB=bazarr \
     -p 5432:5432/tcp \
     -v /path/to/appdata/postgres14:/var/lib/postgresql/data \
     postgres:14
```

#### Database Migration (SQLite → PostgreSQL)

**Requirements**:
- Bazarr 1.1.5+ required for migration
- Database must be created manually before starting Bazarr
- Run Bazarr against PostgreSQL at least once before migration
- Use PGLoader for data migration

**PGLoader Command Requirements**:
- Use `--with "quote identifiers"` for case-sensitivity
- Cast timestamp columns to timestamp type:
  - `table_blacklist.timestamp`
  - `table_blacklist_movie.timestamp`
  - `table_history.timestamp`
  - `table_history_movie.timestamp`

**Known Issue**: Some columns from SQLite may not exist in PostgreSQL on first run. Ensure migration compatibility.

**Storage Limitation**: Cannot store config directory over NFS share (SQLite limitation).

### 4.3 Required Environment Variables Summary

```bash
# File Permissions
PUID=1000
PGID=1000
TZ=Etc/UTC
UMASK=022

# PostgreSQL (optional, overrides config.yaml)
POSTGRES_ENABLED=true
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DATABASE=bazarr
POSTGRES_USERNAME=bazarr
POSTGRES_PASSWORD=secret_password
PGSSLCERT=/tmp/postgresql.crt  # For non-root users
```

### 4.4 Configuration File Locations

**Windows**:
```
%programdata%\Bazarr\config.yaml
%programdata%\Bazarr\db\
%programdata%\Bazarr\log\
```

**Docker**:
```
/config/config.yaml
/config/db/
/config/log/
```

**Source Installation**:
```
./data/config.yaml
./data/db/
./data/log/
```

---

## 5. Best Practices & TRaSH Guides Recommendations

### 5.1 Subtitle Scoring (TRaSH Guides)

**Goal**: 99% of downloaded subtitles should be correct for your release

#### Minimum Score Thresholds
```yaml
Sonarr:
  Minimum Subtitle Score: 90
  Reason: Prevents bad/out-of-sync subtitles

Radarr:
  Minimum Subtitle Score: 80
  Reason: Prevents bad/out-of-sync subtitles
```

#### Synchronization Score Thresholds
```yaml
Series (TV Shows):
  Score Threshold: 96
  Automatic Synchronization: Enabled

Movies:
  Score Threshold: 86
  Automatic Synchronization: Enabled
```

**Warning**:
- Setting score **too low** → bad/unsyncable subtitles
- Setting score **too high** (98-100) → fewer available subtitles, possible misalignment

### 5.2 Docker Best Practices

#### PUID/PGID Permission Management

**The Magic Solution**:
> Ensure any volume directories on the host are owned by the same user you specify and any permissions issues will vanish like magic.

**Find Your PUID/PGID**:
```bash
id your_user
```

**Recommended UMASK**:
```yaml
UMASK: 002
Result:
  - Folders: 775 (drwxrwxr-x)
  - Files:   664 (-rw-rw-r--)
Reason: Ideal for shared group access across containers
```

**Critical for Synology NAS**:
- Match PUID/PGID to the user that owns your media shares
- Required for Docker container to access network shares

#### Volume Path Consistency

**CRITICAL RULE**: Use **identical** volume mappings across all *arr apps.

**Good Example**:
```yaml
sonarr:
  volumes:
    - /data/media/tv:/tv
    - /data/media/movies:/movies

radarr:
  volumes:
    - /data/media/tv:/tv
    - /data/media/movies:/movies

bazarr:
  volumes:
    - /data/media/tv:/tv
    - /data/media/movies:/movies
```

**Bad Example** (requires path mapping):
```yaml
sonarr:
  volumes:
    - /mnt/tv:/data

bazarr:
  volumes:
    - /mnt/tv:/tv  # Different internal path!
```

#### Docker Networking

**CRITICAL**: Do NOT use `127.0.0.1` or `localhost` in Docker container settings.

**Wrong**:
```yaml
Sonarr Hostname: 127.0.0.1  # Points to Bazarr container itself!
```

**Correct**:
```yaml
Sonarr Hostname: sonarr  # Container name on same Docker network
```

### 5.3 Subtitle Provider Setup

**Recommendation**: Select **multiple** subtitle providers
**Reason**: Better coverage and availability
**Accounts**: Create accounts with providers for higher limits

**Common Providers**:
- OpenSubtitles
- Subscene
- Addic7ed
- TVsubtitles
- Legendas.TV

**Anti-Captcha**: Some providers require paid anti-captcha service for automated downloads.

### 5.4 Subtitle Storage Location

**TRaSH Recommendation**: "AlongSide Media File"

**Rationale**:
- Subtitles stored with media files
- Plex/Jellyfin/Emby can easily find them
- Portable with media files

**Storage Format**:
```
/tv/Show Name/Season 01/Show.S01E01.mkv
/tv/Show Name/Season 01/Show.S01E01.en.srt
```

### 5.5 After Install Configuration

**CRITICAL**: Bazarr only searches for subtitles for Episodes and Movies added **after installation**.

**Required Steps for Existing Media**:
1. Navigate to Series or Movies in Bazarr
2. Select "Mass Edit"
3. Select all series/movies
4. Choose your Language Profile
5. Save changes

**Language Profile Setup**:
1. Settings → Languages
2. Create language profile with desired languages
3. Set cutoff language (when to stop searching)
4. Assign profile to series/movies

---

## 6. Common Pitfalls & Troubleshooting

### 6.1 Path Mapping Issues

#### Error: "This path doesn't seem to be valid"
**Cause**: Bazarr cannot access the path specified by Sonarr/Radarr
**Solutions**:
1. Ensure volume mappings match exactly across containers
2. Verify file permissions (PUID/PGID)
3. Check that paths are accessible inside Bazarr container
4. Configure path mapping if paths truly differ

#### Error: "Please check path mapping"
**Cause**: Sonarr/Radarr root directory not accessible
**Solutions**:
1. Use `docker exec -it bazarr ls /path/to/media` to test access
2. Verify volume mounts in `docker-compose.yml`
3. Remove incorrect path mappings if paths actually match
4. Fix container volume mappings instead of using path mapping

**TRaSH Recommendation**:
> If everything runs on Docker you normally don't need path mapping except if you got messed up paths. It would be smarter to fix those first.

### 6.2 Sonarr/Radarr Connection Issues

#### Error: "Cannot connect to Sonarr/Radarr"
**Causes & Solutions**:
1. **Wrong hostname**: Use container name, not `127.0.0.1`
2. **Wrong port**: Verify Sonarr (8989) / Radarr (7878)
3. **Wrong API key**: Copy from app's Settings → General → Security
4. **Base URL error**: Only use if reverse proxy, must start with `/`
5. **Network isolation**: Ensure containers on same Docker network

**Test Command**:
```bash
docker exec -it bazarr wget -O- http://sonarr:8989/api/v3/system/status?apikey=YOUR_KEY
```

### 6.3 Docker Networking Problems

**Loopback Address Issue**:
```
127.0.0.1 → Points to Bazarr container itself, not Docker host
localhost → Same problem in Docker context
```

**Solution**: Use Docker service names or host IP
```yaml
Correct: sonarr (Docker service name)
Correct: 192.168.1.100 (host IP)
Wrong:   127.0.0.1
Wrong:   localhost
```

### 6.4 Permission Issues

#### Symptoms:
- Cannot write subtitle files
- "Permission denied" errors in logs
- Subtitles disappear after download

**Diagnosis**:
```bash
# Check file ownership
docker exec -it bazarr ls -la /tv
docker exec -it bazarr id

# Verify PUID/PGID
docker inspect bazarr | grep -i puid
```

**Solutions**:
1. Match PUID/PGID to host user
2. Fix host directory ownership: `chown -R 1000:1000 /path/to/media`
3. Set appropriate UMASK (002 recommended)
4. Ensure group access for shared containers

### 6.5 Windows-Specific Issues

**Problem**: Mapped network drives don't work
**Reason**: Bazarr service runs under Local System account
**Solution**: Use UNC paths instead
```
Wrong: Z:\media\tv
Right: \\server\share\media\tv
```

### 6.6 Database Issues

**Error**: "Database is locked"
**Causes**:
- Config directory over NFS share (unsupported)
- Multiple Bazarr instances accessing same database
- File system permissions

**Solutions**:
1. Move config to local storage (not NFS)
2. Ensure only one Bazarr instance runs
3. Check file permissions on database file

### 6.7 PostgreSQL Migration Issues

**Error**: "Column does not exist in PostgreSQL database"
**Cause**: Schema mismatch between SQLite and PostgreSQL
**Solution**:
1. Run Bazarr against PostgreSQL at least once before migration
2. Let Bazarr create tables first
3. Then migrate data using PGLoader

**Error**: "Database connection failed"
**Checks**:
```bash
# Test PostgreSQL connection from Bazarr container
docker exec -it bazarr nc -zv postgres 5432
docker exec -it bazarr env | grep POSTGRES
```

### 6.8 Subtitle Synchronization Issues

**Problem**: Subtitles out of sync
**Solutions**:
1. Enable "Automatic Subtitles Synchronization"
2. Set appropriate sync score thresholds:
   - Series: 96
   - Movies: 86
3. Ensure proper minimum scores (Sonarr: 90, Radarr: 80)
4. Verify correct subtitle for release (check hash matching)

### 6.9 Authentication/Password Reset

**Locked out of Bazarr?**
**Solution**:
1. Edit `/config/config.yaml`
2. Change `auth: type` to `null`
3. Restart Bazarr
4. Access without password
5. Reconfigure authentication

### 6.10 Debug Logging

**Enable Debug Logging**:
1. Settings → General
2. Enable "Debug" logging level
3. Clear logs
4. Reproduce issue
5. Check logs at `/config/log/bazarr.log`

**Share Logs** (for support):
- Use gist.github.com or pastebin
- Never share in plain text (too long)
- Include relevant timeframe only

---

## 7. Automation & Auto-Configuration

### 7.1 Pre-Configuration Capabilities

**Configuration Method**: Primarily **Web UI-based**

**Web Interface Access**: `http://[IP]:6767`

**Manual config.yaml Editing**:
- Possible but not recommended
- Changes may be overwritten by Web UI
- No schema validation
- High risk of syntax errors

### 7.2 API-Based Configuration

**Status**: API exists but is **undocumented**

**Known Configuration Endpoint**:
```
POST /api/system/settings
```

**Payload**: Unknown (requires source code inspection)

**Authentication**: Requires API key from Settings → General → Security

**Recommendation**:
- For automation, configure via Web UI first
- Export `config.yaml` as template
- Inject template into new instances
- Use environment variables for PostgreSQL

### 7.3 Automated Deployment Scripts

**Third-Party Script**: PiJARR
- URL: https://github.com/pijarr/pijarr
- Description: Automates installation of Jackett, Sonarr, Radarr, Lidarr, Readarr, Prowlarr, and Bazarr
- Platform: Debian-based distros
- Method: Shell script
- Limitations: May not include latest best practices

### 7.4 Database Manipulation for Configuration

**SQLite Database**: `/config/db/bazarr.db`

**Tables** (inferred):
- `table_settings_*` - Configuration settings
- `table_shows` - Sonarr series data
- `table_movies` - Radarr movie data
- `table_history` - Subtitle download history
- `table_blacklist` - Blacklisted subtitles

**Direct Database Editing**:
- **Not recommended**: Schema undocumented
- **Risk**: Data corruption
- **Alternative**: Use config.yaml or Web UI

### 7.5 Configuration Template Approach

**Recommended Automation Method**:

1. **Manual Initial Setup**:
   - Install Bazarr
   - Configure via Web UI
   - Test all integrations

2. **Export Configuration**:
   ```bash
   docker cp bazarr:/config/config.yaml ./bazarr-config-template.yaml
   ```

3. **Parameterize Template**:
   ```yaml
   # Example: config-template.yaml
   sonarr:
     ip: ${SONARR_HOST}
     port: ${SONARR_PORT}
     apikey: ${SONARR_API_KEY}

   radarr:
     ip: ${RADARR_HOST}
     port: ${RADARR_PORT}
     apikey: ${RADARR_API_KEY}
   ```

4. **Deploy with Templating**:
   ```bash
   # Using envsubst or similar
   envsubst < config-template.yaml > config.yaml
   docker cp config.yaml bazarr:/config/config.yaml
   docker restart bazarr
   ```

5. **Alternative: Environment Variables**:
   ```yaml
   environment:
     - POSTGRES_ENABLED=true
     - POSTGRES_HOST=${POSTGRES_HOST}
     # ... all PostgreSQL settings via env vars
   ```

### 7.6 Initialization Scripts

**Docker Init Scripts**: Not officially supported by LinuxServer image

**Workaround**:
```yaml
bazarr:
  image: lscr.io/linuxserver/bazarr:latest
  volumes:
    - ./init-bazarr.sh:/custom-cont-init.d/init-bazarr.sh:ro
```

**init-bazarr.sh Example**:
```bash
#!/bin/bash
# Wait for Bazarr to create config.yaml
while [ ! -f /config/config.yaml ]; do
  sleep 2
done

# Inject settings if not already configured
if ! grep -q "sonarr_ip" /config/config.yaml; then
  # Append or modify configuration
  # Use yq or sed for YAML manipulation
  yq eval '.sonarr.ip = env(SONARR_HOST)' -i /config/config.yaml
fi
```

**CRITICAL TIMING ISSUE**:
> The configuration file is created quickly when the service is started for the first time, but it takes a very long time for the content to be available in the file.

**Solution**: Add delays or watch for file content population.

---

## 8. Advanced Features

### 8.1 Whisper Provider (AI Subtitle Generation)

**Documentation**: https://wiki.bazarr.media/Additional-Configuration/Whisper-Provider/

**Capability**: Generate subtitles using AI when none available from providers

**Setup Requirements**:
- Additional configuration in Settings
- May require significant compute resources
- Optional feature for missing subtitles

### 8.2 Performance Tuning

**Documentation**: https://wiki.bazarr.media/Additional-Configuration/Performance-Tuning/

**Use Cases**:
- Low-powered devices (Raspberry Pi, NAS)
- Cloud environments with resource limits
- Large media libraries

**Tuning Options**:
- Adjust sync frequency
- Limit concurrent downloads
- Configure provider timeouts
- Optimize database queries

### 8.3 Reverse Proxy Support

**Documentation**: https://wiki.bazarr.media/Additional-Configuration/Reverse-Proxy-Help/

**Configuration**: Base URL setting
**Format**: Must start with `/` (e.g., `/bazarr`)
**Use Only If**: Using Nginx, Caddy, Traefik, or similar

**Example Base URLs**:
```
Sonarr:  /sonarr
Radarr:  /radarr
Bazarr:  /bazarr
```

**Common Mistake**: Setting base URL when not using reverse proxy causes connection failures.

### 8.4 Notification Configuration

**Notification Providers**: Configured via Apprise

**Supported Services**:
- Discord
- Telegram
- Slack
- Pushover
- Email
- Many others via Apprise

**Setup**: Settings → Notifications

---

## 9. Critical Warnings & Gotchas

### 9.1 Configuration Gotchas

1. **Post-Install Configuration Required**: Bazarr only searches for subs for media added **after** installation. Existing media requires manual language profile assignment via Mass Edit.

2. **Docker Loopback Address**: `127.0.0.1` and `localhost` do **NOT** work in Docker for referencing other containers.

3. **Base URL Confusion**: Only use Base URL if using a reverse proxy. Otherwise, leave blank.

4. **Path Mapping Trap**: If paths match between containers, remove path mapping entirely or it will cause errors.

5. **NFS Share Limitation**: Cannot store config directory on NFS due to SQLite locking issues.

6. **Config File Timing**: `config.yaml` is created quickly but takes time to populate. Wait for service to fully start before automation.

7. **API Key vs Auth Type**: API key authentication is legacy. Prefer forms or basic auth.

8. **Webhook Limitation**: Bazarr does NOT receive webhooks from Sonarr/Radarr for triggering downloads. Uses polling instead.

9. **PostgreSQL Schema Issue**: Must run Bazarr against PostgreSQL at least once before attempting migration from SQLite.

10. **Subtitle Sync Bug**: Path mapping may not be respected during subtitle sync operations (known issue #2512).

### 9.2 Network Security

**No Special Requirements**: Unlike qBittorrent, Bazarr does **NOT** require VPN isolation.

**Subtitle Providers**: Accessed over HTTPS
**Sonarr/Radarr**: Local network communication
**No Torrent Activity**: Bazarr only downloads subtitles, not torrents

### 9.3 Version Compatibility

**Sonarr/Radarr API**: Bazarr uses v3 API endpoints (was updated from deprecated v1/v2)
**Minimum Bazarr Version for PostgreSQL**: v1.1.5-beta.8
**Minimum PostgreSQL Version**: 9 (recommended: 14)

---

## 10. Automation Code Snippets

### 10.1 Docker Compose with Auto-Configuration

```yaml
version: "3.8"

services:
  bazarr:
    image: lscr.io/linuxserver/bazarr:latest
    container_name: bazarr
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
      - UMASK=002
    volumes:
      - ./bazarr/config:/config
      - /data/media/tv:/tv
      - /data/media/movies:/movies
      - ./init-bazarr.sh:/custom-cont-init.d/99-init-bazarr:ro
    ports:
      - "6767:6767"
    restart: unless-stopped
    depends_on:
      - sonarr
      - radarr
    networks:
      - media

  sonarr:
    image: lscr.io/linuxserver/sonarr:latest
    container_name: sonarr
    # ... sonarr config

  radarr:
    image: lscr.io/linuxserver/radarr:latest
    container_name: radarr
    # ... radarr config

networks:
  media:
    name: media
```

### 10.2 Configuration Validation Script

```bash
#!/bin/bash
# validate-bazarr-config.sh

BAZARR_URL="http://localhost:6767"
BAZARR_API_KEY="your_api_key_here"

# Check if Bazarr is running
if ! curl -s "${BAZARR_URL}/api/system/status?apikey=${BAZARR_API_KEY}" > /dev/null; then
  echo "ERROR: Bazarr is not accessible"
  exit 1
fi

# Check Sonarr connection (requires examining logs or UI)
echo "Manually verify Sonarr/Radarr connections in Web UI"

# Verify volume mounts
docker exec bazarr ls /tv > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "ERROR: /tv volume not mounted"
  exit 1
fi

docker exec bazarr ls /movies > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "ERROR: /movies volume not mounted"
  exit 1
fi

echo "Basic validation passed"
```

### 10.3 Database Backup Script

```bash
#!/bin/bash
# backup-bazarr-db.sh

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "${BACKUP_DIR}"

# Backup SQLite database
docker exec bazarr sqlite3 /config/db/bazarr.db ".backup '/config/db/backup_${TIMESTAMP}.db'"
docker cp bazarr:/config/db/backup_${TIMESTAMP}.db "${BACKUP_DIR}/"
docker exec bazarr rm /config/db/backup_${TIMESTAMP}.db

# Backup config.yaml
docker cp bazarr:/config/config.yaml "${BACKUP_DIR}/config_${TIMESTAMP}.yaml"

echo "Backup completed: ${BACKUP_DIR}"
```

### 10.4 API Key Extraction Script

```bash
#!/bin/bash
# extract-bazarr-apikey.sh

# Extract API key from config.yaml
API_KEY=$(docker exec bazarr cat /config/config.yaml | grep -A5 "^auth:" | grep "apikey:" | awk '{print $2}')

if [ -z "$API_KEY" ]; then
  echo "ERROR: Could not extract API key"
  exit 1
fi

echo "Bazarr API Key: ${API_KEY}"
```

### 10.5 Health Check Script

```bash
#!/bin/bash
# healthcheck-bazarr.sh

BAZARR_URL="http://bazarr:6767"
TIMEOUT=5

# Check if Bazarr web interface responds
if curl -s -m ${TIMEOUT} "${BAZARR_URL}" > /dev/null; then
  echo "Bazarr is healthy"
  exit 0
else
  echo "Bazarr is unhealthy"
  exit 1
fi
```

---

## 11. Summary & Quick Reference

### 11.1 Essential URLs
- **Official Wiki**: https://wiki.bazarr.media/
- **Setup Guide**: https://wiki.bazarr.media/Getting-Started/Setup-Guide/
- **TRaSH Guides**: https://trash-guides.info/Bazarr/
- **Docker Docs**: https://docs.linuxserver.io/images/docker-bazarr/
- **GitHub**: https://github.com/morpheus65535/bazarr

### 11.2 Default Ports
- **Bazarr Web UI**: 6767
- **Sonarr**: 8989
- **Radarr**: 7878

### 11.3 Critical Commands

```bash
# Access Bazarr container
docker exec -it bazarr bash

# View logs
docker logs -f bazarr
docker exec bazarr cat /config/log/bazarr.log

# Restart Bazarr
docker restart bazarr

# Check Sonarr connectivity from Bazarr
docker exec bazarr wget -O- http://sonarr:8989/api/v3/system/status?apikey=KEY

# Verify volume mounts
docker exec bazarr ls -la /tv /movies

# Check PUID/PGID
docker exec bazarr id
```

### 11.4 Recommended TRaSH Settings

```yaml
Scoring:
  Sonarr Minimum Score: 90
  Radarr Minimum Score: 80
  Series Sync Threshold: 96
  Movies Sync Threshold: 86

Subtitle Storage: AlongSide Media File

Providers: Multiple providers with accounts

Automatic Sync: Enabled
```

### 11.5 Configuration Checklist

- [ ] Bazarr accessible at http://[IP]:6767
- [ ] PUID/PGID match host user
- [ ] Volume paths match Sonarr/Radarr exactly
- [ ] Sonarr connection tested successfully
- [ ] Radarr connection tested successfully
- [ ] Language profiles created
- [ ] Subtitle providers configured
- [ ] Existing media assigned language profiles (Mass Edit)
- [ ] Scoring thresholds set per TRaSH guides
- [ ] Automatic synchronization enabled
- [ ] Subtitle storage set to "AlongSide Media File"

---

## 12. Limitations & Constraints

### 12.1 API Limitations
- No official API documentation
- No OpenAPI/Swagger specification
- API endpoints must be discovered via source code
- API primarily for internal Web UI use

### 12.2 Automation Limitations
- No official auto-configuration method
- Web UI is primary configuration interface
- config.yaml editing possible but risky
- No init script support in official Docker image
- Timing issues with config.yaml population on first start

### 12.3 Integration Limitations
- No webhook-based triggering from Sonarr/Radarr
- Polling interval: 1-5 minutes
- Only searches for media added after installation
- Requires manual language profile assignment for existing media

### 12.4 Storage Limitations
- Cannot use NFS for config directory (SQLite limitation)
- PostgreSQL recommended for network storage scenarios
- Database migration requires manual steps

---

## 13. Recommended Deployment Strategy

### 13.1 Initial Deployment
1. Deploy Bazarr with LinuxServer.io Docker image
2. Ensure PUID/PGID match media file owner
3. Use identical volume mappings as Sonarr/Radarr
4. Allow Bazarr to fully start and create config.yaml
5. Configure via Web UI (not manual editing)
6. Test Sonarr/Radarr connections
7. Set up language profiles and providers
8. Use Mass Edit to configure existing media

### 13.2 Production Hardening
1. Enable authentication (forms or basic auth)
2. Use PostgreSQL for shared/network storage
3. Set up regular database backups
4. Configure reverse proxy with SSL (optional)
5. Enable debug logging initially, then reduce to info
6. Monitor logs for connection issues
7. Implement health checks in Docker Compose

### 13.3 Automation Strategy
1. Configure one instance manually via Web UI
2. Export config.yaml as template
3. Parameterize sensitive values (API keys, passwords)
4. Use environment variables for PostgreSQL
5. Inject config.yaml on container creation
6. Add health check delays to allow initialization
7. Automate database backups

---

## 14. Resources for Further Research

### 14.1 Community Resources
- **Discord**: Official Bazarr Discord (link from wiki)
- **Reddit**: r/bazarr, r/sonarr, r/radarr
- **GitHub Issues**: https://github.com/morpheus65535/bazarr/issues

### 14.2 Related Documentation
- **Sonarr Wiki**: https://wiki.servarr.com/sonarr
- **Radarr Wiki**: https://wiki.servarr.com/radarr
- **Docker Guide (Servarr)**: https://wiki.servarr.com/docker-guide
- **TRaSH Hardlinks Guide**: https://trash-guides.info/Hardlinks/

### 14.3 Source Code
- **Main Repository**: https://github.com/morpheus65535/bazarr
- **API Routes**: `/bazarr/api/` directory
- **Docker Image**: https://github.com/linuxserver/docker-bazarr

---

**END OF REPORT**
