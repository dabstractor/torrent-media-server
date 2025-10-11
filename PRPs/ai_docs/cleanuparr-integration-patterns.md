# Cleanuparr Integration Patterns

**Integration Date:** 2025-10-09
**PRP Reference:** PRPs/028-cleanuparr-integration.md
**Service Version:** ghcr.io/cleanuparr/cleanuparr:latest

---

## Overview

Cleanuparr is an automated "janitor" service that monitors and cleans download queues, removes malicious/stalled downloads, manages seeding lifecycles, and maintains optimal download health across the entire media automation pipeline.

**Key Features:**
- **Malware Blocker**: Blocks downloads using community-maintained blocklists
- **Queue Cleaner**: Strike-based cleanup for failed/stalled downloads with automatic replacement
- **Download Cleaner**: Seeding lifecycle management and orphaned file detection
- **Zero-Touch Operation**: Fully automated after initial configuration

---

## Architecture

### Network Configuration

```yaml
networks:
  - media_network   # Access to Sonarr, Radarr, and other *arr apps
  - vpn_network     # Access to VPN-isolated torrent clients
```

**CRITICAL**: Cleanuparr MUST NOT use `network_mode: "container:vpn"`. It's a management service, not a torrent client.

### Service Access Patterns

**Torrent Client Access:**
- qBittorrent: `http://vpn:8080` (NOT `http://qbittorrent:8080`)
- Transmission: `http://vpn:9091` (NOT `http://transmission:9091`)
- **Why**: Torrent clients share the VPN container's network namespace

***arr App Access:**
- Sonarr: `http://sonarr:8989` (Docker DNS)
- Radarr: `http://radarr:7878` (Docker DNS)

---

## Configuration Template Structure

### Template Location
`config/templates/cleanuparr/config.json.template`

### Key Sections

#### 1. Download Clients
```json
{
  "downloadClients": [
    {
      "type": "${TORRENT_CLIENT}",
      "host": "http://vpn:${TORRENT_CLIENT_PORT}",
      "username": "${QBITTORRENT_USERNAME:-}",
      "password": "${QBITTORRENT_PASSWORD:-}"
    }
  ]
}
```

**Environment Variables:**
- `TORRENT_CLIENT`: Set by torrent-client-selector.sh (qbittorrent or transmission)
- `TORRENT_CLIENT_PORT`: Set by torrent-client-selector.sh (8080 or 9091)
- `QBITTORRENT_USERNAME`: From .env
- `QBITTORRENT_PASSWORD`: From .env

#### 2. Applications (*arr Apps)
```json
{
  "applications": [
    {
      "type": "sonarr",
      "baseUrl": "http://sonarr:8989",
      "apiKey": "${SONARR_API_KEY}"
    },
    {
      "type": "radarr",
      "baseUrl": "http://radarr:7878",
      "apiKey": "${RADARR_API_KEY}"
    }
  ]
}
```

#### 3. Malware Blocker
```json
{
  "malwareBlocker": {
    "enabled": true,
    "blocklists": [
      {
        "pathOrUrl": "https://cleanuparr.pages.dev/static/blacklist",
        "type": "blacklist"
      }
    ],
    "ignorePrivateTorrents": true,
    "deleteKnownMalware": true
  }
}
```

**Key Settings:**
- `ignorePrivateTorrents: true` - CRITICAL for private tracker usage
- `deleteKnownMalware: true` - Enables automatic malware removal
- Blocklist updates every 5 minutes from official source

#### 4. Queue Cleaner
```json
{
  "queueCleaner": {
    "enabled": true,
    "failedImport": {
      "maxStrikes": 3,  // MUST be 0 or 3+ (not 1-2)
      "ignorePrivateTorrents": true
    },
    "stalledDownload": {
      "maxStrikes": 3,
      "resetStrikesOnProgress": true
    }
  }
}
```

**Strike System Gotcha:**
- Values 1-2 cause re-download loops (Issue #282)
- Use 3+ for active cleanup or 0 to disable

#### 5. Download Cleaner
```json
{
  "downloadCleaner": {
    "enabled": true,
    "seedingRules": {
      "categories": [
        {
          "name": "radarr",
          "maxRatio": 2.0,
          "minSeedTime": 48,    // hours
          "maxSeedTime": 720    // 30 days
        }
      ]
    },
    "unlinkedDownloads": {
      "enabled": true,
      "categoriesToCheck": ["radarr", "sonarr"]
    }
  }
}
```

**Path Mapping Requirement:**
- `/downloads` mount MUST be identical to torrent client's mount
- Enables hardlink detection for orphaned file cleanup

---

## Entrypoint Script Pattern

### File: `scripts/cleanuparr-entrypoint.sh`

**Responsibilities:**
1. Source `torrent-client-selector.sh` for dynamic client detection
2. First-run detection (`if [ ! -f "$CONFIG_DIR/config.json" ]`)
3. Template processing with `envsubst`
4. JSON validation with `jq`
5. Permission setting (chown 1000:1000)
6. Exec to original Cleanuparr entrypoint

**Key Pattern:**
```bash
source /scripts/common/torrent-client-selector.sh
torrent_client_selector

# Export variables for template
export TORRENT_CLIENT_NAME
export TORRENT_CLIENT_PORT

# Process template
envsubst < "$TEMPLATE_DIR/config.json.template" > "$CONFIG_DIR/config.json"

# Validate JSON
jq empty "$CONFIG_DIR/config.json"

# Exec to Cleanuparr
exec /usr/local/bin/cleanuparr "$@"
```

---

## Common Issues and Solutions

### Issue 1: Torrent Client Connection Fails

**Symptom:** Cleanuparr cannot connect to qBittorrent/Transmission

**Causes:**
1. Wrong URL (using container name instead of `vpn` hostname)
2. VPN container not healthy
3. Wrong port configuration

**Solution:**
```bash
# Check VPN is healthy
docker compose ps vpn

# Test connectivity from Cleanuparr container
docker compose exec cleanuparr curl -f http://vpn:8080/api/v2/app/version

# Verify config.json has correct URL
docker compose exec cleanuparr cat /config/config.json | jq '.downloadClients[0].host'
```

### Issue 2: Path Mapping Mismatch

**Symptom:** Orphaned downloads not detected correctly

**Cause:** Download paths don't match between torrent client and Cleanuparr

**Solution:**
```yaml
# Both must use identical paths
qbittorrent:
  volumes:
    - ./data/downloads:/downloads

cleanuparr:
  volumes:
    - ./data/downloads:/downloads  # MUST match
```

### Issue 3: Strike System Not Working

**Symptom:** Downloads deleted immediately or never deleted

**Cause:** Strike minimum set to 1 or 2

**Solution:** Set `maxStrikes` to 3+ or 0 to disable

### Issue 4: Private Tracker Penalties

**Symptom:** Hit & Run warnings from private trackers

**Cause:** Downloads deleted before seeding requirements met

**Solution:**
```json
{
  "queueCleaner": {
    "failedImport": {
      "ignorePrivateTorrents": true  // Enable this
    }
  },
  "downloadCleaner": {
    "deletePrivateTorrents": false  // Keep this false
  }
}
```

---

## API Endpoints

### Health Checks

**Liveness:**
```bash
curl http://localhost:11011/health
# Returns HTTP 200 if running
```

**Readiness:**
```bash
curl http://localhost:11011/health/ready
# Returns HTTP 200 if ready to serve traffic
```

**Detailed:**
```bash
curl http://localhost:11011/health/detailed
# Returns comprehensive health status JSON
```

### Configuration API

*Note: Full REST API documentation not publicly available. Primary configuration through web UI.*

---

## Validation Checklist

### Pre-Deployment
- [ ] VPN container healthy (`docker compose ps vpn`)
- [ ] Sonarr and Radarr healthy
- [ ] API keys available in .env
- [ ] Torrent client selector configured

### Post-Deployment
- [ ] Cleanuparr container status: healthy
- [ ] Health endpoint: `http://localhost:11011/health` returns 200
- [ ] Web UI accessible: `http://localhost:11011`
- [ ] Config generated: `docker compose exec cleanuparr cat /config/config.json`
- [ ] VPN isolation preserved: `./scripts/validate-vpn.sh` passes
- [ ] Comprehensive validation: `./scripts/validate-cleanuparr.sh` passes

---

## Dry Run Mode

**Default State:** ENABLED (safety first)

**Purpose:** Log actions without making actual changes

**How to Disable:**
1. Access web UI: `http://localhost:11011`
2. Navigate to General Settings
3. Toggle "Dry Run Mode" OFF
4. Save configuration

**Recommendation:** Run in dry run mode for 24-48 hours to verify behavior before disabling

---

## Monitoring and Maintenance

### Daily Tasks
- Check web UI dashboard for cleanup statistics
- Review notifications (if configured)

### Weekly Tasks
- Review logs: `docker compose logs cleanuparr --tail 100`
- Verify orphaned detection accuracy
- Check blocklist update timestamps

### Monthly Tasks
- Review and adjust strike thresholds
- Evaluate seeding rules effectiveness
- Update to latest Cleanuparr version if available

---

## Security Considerations

### VPN Isolation
**Rule:** Cleanuparr MUST NOT share VPN network namespace
**Verification:** Run `./scripts/validate-vpn.sh` after deployment

### API Keys
- Store in .env file (never commit to version control)
- Rotate periodically for security
- Use read-write API keys (Cleanuparr needs full access)

### Network Segmentation
- Cleanuparr on media_network + vpn_network
- Torrent clients ONLY on VPN (network_mode: "container:vpn")
- *arr apps on both networks for bridge access

---

## Future Enhancements

### Potential Additions
- Lidarr, Readarr, Whisparr integration (config template ready)
- Notifiarr/Apprise notifications
- Custom blocklists
- Category-specific seeding rules

### Extension Points
- `config.json.template`: Add more applications
- `cleanuparr-entrypoint.sh`: Add pre-flight connectivity checks
- `validate-cleanuparr.sh`: Add module status API tests when available

---

## References

**Official Documentation:** https://cleanuparr.github.io/Cleanuparr/
**GitHub Repository:** https://github.com/Cleanuparr/Cleanuparr
**Docker Image:** ghcr.io/cleanuparr/cleanuparr:latest
**Community Blocklists:** https://cleanuparr.pages.dev/static/blacklist

**Related Project Files:**
- PRP: `PRPs/028-cleanuparr-integration.md`
- Template: `config/templates/cleanuparr/config.json.template`
- Entrypoint: `scripts/cleanuparr-entrypoint.sh`
- Validation: `scripts/validate-cleanuparr.sh`
- Docker Compose: `docker-compose.yml` (lines 639-680)
