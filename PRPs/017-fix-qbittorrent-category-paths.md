name: "Fix qBittorrent Category Path Mismatch - PRP 017"
description: |
  Comprehensive fix for qBittorrent category save paths to enable proper Radarr/Sonarr media organization
  Current paths "/downloads/movies" and "/downloads/tv" must be corrected to "/data/downloads/complete/movies" and "/data/downloads/complete/tv"

---

## Goal

**Feature Goal**: Fix qBittorrent category save paths from incorrect Docker-relative paths to proper container-mapped paths, enabling automated media organization workflow

**Deliverable**: Automated script that corrects qBittorrent category configuration via both API calls and direct file manipulation, with comprehensive validation and rollback capabilities

**Success Definition**:
- qBittorrent categories "radarr" and "sonarr" have correct save paths
- Radarr and Sonarr can successfully import completed downloads
- All validation tests pass confirming proper media organization workflow

## User Persona

**Target User**: System Administrator managing containerized media stack

**Use Case**: Automated media organization where torrents downloaded by qBittorrent are automatically imported and organized by Radarr/Sonarr into Plex-compatible directory structure

**User Journey**:
1. User searches for media via web interface
2. Torrent is sent to qBittorrent with proper category (radarr/sonarr)
3. qBittorrent downloads to category-specific path
4. Radarr/Sonarr detects completed download and imports to media library
5. Files are organized in `/data/media/movies` or `/data/media/tv` for Plex

**Pain Points Addressed**:
- Downloads not being imported by Radarr/Sonarr
- Manual file organization required
- Media not appearing in Plex automatically

## Why

- **Critical Pipeline Failure**: Current incorrect category paths break the entire automated media organization workflow
- **Data Organization**: Proper path structure enables hardlinks and atomic moves, preventing storage duplication
- **User Experience**: Automated workflow eliminates manual file management and ensures consistent media library organization
- **Container Integration**: Fixes Docker volume mapping misalignment between qBittorrent internal paths and host filesystem

## What

Fix qBittorrent category configuration to use proper Docker volume-mapped paths:

**Current (Broken) State:**
```json
{
    "radarr": {
        "save_path": "/downloads/movies"
    },
    "sonarr": {
        "save_path": "/downloads/tv"
    }
}
```

**Target (Fixed) State:**
```json
{
    "radarr": {
        "save_path": "/data/downloads/complete/movies"
    },
    "sonarr": {
        "save_path": "/data/downloads/complete/tv"
    }
}
```

### Success Criteria

- [ ] qBittorrent categories.json file contains correct paths
- [ ] Categories accessible via qBittorrent Web API with correct save paths
- [ ] Test torrent downloads to correct category-specific directories
- [ ] Radarr and Sonarr can detect and import completed downloads
- [ ] All validation tests pass without errors
- [ ] Configuration persists across container restarts

## All Needed Context

### Context Completeness Check

_This PRP provides complete implementation guidance including API methods, file manipulation patterns, validation approaches, and rollback procedures based on existing codebase patterns._

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#get-all-categories
  why: Official qBittorrent Web API documentation for category management endpoints
  critical: API endpoints for /api/v2/torrents/categories (GET) and /api/v2/torrents/editCategory (POST)

- url: https://trash-guides.info/File-and-Folder-Structure/Hardlinks-and-Instant-Moves/
  why: Docker volume mapping best practices for media stacks to enable hardlinks
  critical: Single volume mount principle for atomic moves between download and media directories

- file: scripts/configure-media-organization.sh
  why: Existing pattern for qBittorrent API authentication and category management
  pattern: Session management with both auth and no-auth scenarios, category creation via API
  gotcha: Must handle both authenticated and bypass authentication modes

- file: scripts/fix-qbt-paths-while-running.sh
  why: Pattern for direct configuration file manipulation while qBittorrent is running
  pattern: Stop-fix-restart pattern with sed-based configuration correction
  gotcha: Requires stopping qBittorrent process before file modification

- file: config/qbittorrent/qBittorrent/config/categories.json
  why: Direct access to category configuration file for backup and direct manipulation
  pattern: JSON structure with category names as keys and save_path properties
  gotcha: File permissions must match container user (1000:1000)

- file: scripts/configure-download-handling.sh
  why: Comprehensive error handling and API communication patterns
  pattern: Wait-for-API availability, JSON manipulation with jq, validation loops
  gotcha: API calls require proper timeout handling and response validation

- file: scripts/qbittorrent-wrapper.sh
  why: Multiple configuration file management pattern - handles both main and runtime config
  pattern: Template processing with envsubst, backup before modification
  gotcha: qBittorrent uses multiple config files that must all be updated consistently
```

### Current Codebase tree

```bash
├── config
│   ├── qbittorrent
│   │   └── qBittorrent
│   │       ├── config
│   │       │   └── categories.json          # Target file to fix
│   │       └── qBittorrent.conf             # Main config file
│   ├── templates
│   │   └── qbittorrent
│   │       └── qBittorrent.conf.template    # Template for main config
├── data
│   ├── downloads
│   │   ├── complete                         # Correct base path for downloads
│   │   └── incomplete
│   └── media
│       ├── movies                           # Radarr media destination
│       └── tv                               # Sonarr media destination
├── scripts
│   ├── configure-media-organization.sh      # API category management pattern
│   ├── fix-qbt-paths-while-running.sh       # Direct file manipulation pattern
│   ├── configure-download-handling.sh       # API communication pattern
│   └── qbittorrent-wrapper.sh               # Multi-config management pattern
```

### Desired Codebase tree with files to be added

```bash
├── scripts
│   ├── fix-qbittorrent-category-paths.sh   # Main implementation script
│   ├── validate-qbittorrent-categories.sh  # Validation script
│   └── backup-qbittorrent-config.sh        # Backup utility
```

### Known Gotchas of our codebase & Library Quirks

```python
# CRITICAL: qBittorrent Web API requires session management
# Authentication can be bypassed or required - script must handle both modes
# API endpoints return different HTTP codes (200, 401, 403) that indicate different states

# CRITICAL: qBittorrent uses multiple configuration files
# Main config: /config/qBittorrent/qBittorrent.conf
# Runtime config: /config/qBittorrent/config/qBittorrent.conf
# Categories config: /config/qBittorrent/config/categories.json
# ALL must be updated for consistent configuration

# CRITICAL: Container permissions require specific ownership
# Files must be owned by 1000:1000 to match container user
# Configuration changes while container is running may be overwritten

# CRITICAL: API timing dependencies
# qBittorrent API may not be immediately available after container start
# Must implement wait loops with timeout for reliable automation

# CRITICAL: Docker volume mapping paths
# Container sees /data/downloads but incorrect config references /downloads
# Categories.json save_path must use full container-mapped path structure
```

## Implementation Blueprint

### Data models and structure

```bash
# Configuration file structures and backup approach
CATEGORIES_FILE="/config/qBittorrent/config/categories.json"
MAIN_CONFIG="/config/qBittorrent/qBittorrent.conf"
BACKUP_DIR="/tmp/qbt_config_backup_$(date +%Y%m%d_%H%M%S)"

# Expected JSON structure for categories.json
{
    "radarr": {
        "save_path": "/data/downloads/complete/movies"
    },
    "sonarr": {
        "save_path": "/data/downloads/complete/tv"
    }
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE scripts/backup-qbittorrent-config.sh
  - IMPLEMENT: Comprehensive backup of all qBittorrent config files
  - FOLLOW pattern: scripts/backup-prowlarr-config.sh (backup strategy, file validation)
  - NAMING: backup-qbittorrent-config.sh in scripts/
  - DEPENDENCIES: None
  - PLACEMENT: scripts/ directory alongside other backup utilities

Task 2: CREATE scripts/fix-qbittorrent-category-paths.sh
  - IMPLEMENT: Dual-approach fix using both API and direct file manipulation
  - FOLLOW pattern: scripts/configure-media-organization.sh (API communication, session management)
  - FOLLOW pattern: scripts/fix-qbt-paths-while-running.sh (direct file manipulation approach)
  - NAMING: fix-qbittorrent-category-paths.sh in scripts/
  - DEPENDENCIES: backup-qbittorrent-config.sh, jq, curl
  - PLACEMENT: scripts/ directory with execute permissions

Task 3: CREATE scripts/validate-qbittorrent-categories.sh
  - IMPLEMENT: Multi-level validation of category configuration
  - FOLLOW pattern: scripts/validate-media-pipeline.sh (validation structure, error reporting)
  - FOLLOW pattern: scripts/configure-download-handling.sh (API verification methods)
  - NAMING: validate-qbittorrent-categories.sh in scripts/
  - DEPENDENCIES: fix-qbittorrent-category-paths.sh completion
  - PLACEMENT: scripts/ directory for standalone validation use

Task 4: MODIFY scripts/qbittorrent-wrapper.sh
  - INTEGRATE: Call fix-qbittorrent-category-paths.sh during container initialization
  - FIND pattern: existing configuration fix calls in wrapper script
  - ADD: Category path fix call after initial configuration but before service start
  - PRESERVE: Existing configuration management and error handling

Task 5: CREATE test-qbittorrent-category-fix.sh (for validation)
  - IMPLEMENT: End-to-end test of category path fixing functionality
  - TEST SCENARIOS: API-based fix, file-based fix, backup/restore functionality
  - FOLLOW pattern: scripts/test-completion-hook.sh (test structure)
  - COVERAGE: All success and failure scenarios with proper cleanup
  - PLACEMENT: scripts/ directory for testing purposes
```

### Implementation Patterns & Key Details

```bash
# Session management pattern (from configure-media-organization.sh)
get_qbittorrent_session() {
    local host="$1"
    local port="$2"

    # Check if no authentication required (bypass configured)
    version_check=$(curl -s -m 5 "http://${host}:${port}/api/v2/app/version" 2>/dev/null)
    if echo "$version_check" | grep -q "^v"; then
        echo "no-auth"
        return 0
    fi

    # Fallback to authentication if needed
    local login_result=$(curl -s -m 10 -c /tmp/qbt_session \
        -d "username=admin&password=${QBITTORRENT_PASSWORD:-adminadmin}" \
        "http://${host}:${port}/api/v2/auth/login" 2>/dev/null)

    if [ "$login_result" = "Ok." ]; then
        echo "/tmp/qbt_session"
        return 0
    fi
    return 1
}

# Category update via API pattern
fix_category_via_api() {
    local session="$1"
    local host="$2"
    local port="$3"
    local category="$4"
    local new_path="$5"

    local api_data="category=${category}&savePath=${new_path}"

    if [ "$session" = "no-auth" ]; then
        local result=$(curl -s -m 10 -X POST \
            -d "$api_data" \
            "http://${host}:${port}/api/v2/torrents/editCategory" 2>/dev/null)
    else
        local result=$(curl -s -m 10 -b "$session" -X POST \
            -d "$api_data" \
            "http://${host}:${port}/api/v2/torrents/editCategory" 2>/dev/null)
    fi

    # GOTCHA: editCategory returns empty response on success
    # Verify by fetching categories and checking save_path
}

# Direct file manipulation pattern (from fix-qbt-paths-while-running.sh)
fix_categories_direct() {
    local categories_file="/config/qBittorrent/config/categories.json"

    # CRITICAL: Backup before modification
    cp "$categories_file" "${categories_file}.backup.$(date +%Y%m%d_%H%M%S)"

    # Use jq for safe JSON manipulation
    jq '.radarr.save_path = "/data/downloads/complete/movies" |
        .sonarr.save_path = "/data/downloads/complete/tv"' \
        "$categories_file" > "${categories_file}.tmp"

    # Atomic move and permission fix
    mv "${categories_file}.tmp" "$categories_file"
    chown 1000:1000 "$categories_file"
    chmod 644 "$categories_file"
}

# Wait for API availability pattern (from configure-download-handling.sh)
wait_for_qbittorrent_api() {
    local host="$1"
    local port="$2"
    local timeout="${3:-30}"
    local counter=0

    while [ $counter -lt $timeout ]; do
        response_code=$(curl -s -m 5 -o /dev/null -w "%{http_code}" \
            "http://${host}:${port}/api/v2/app/version" 2>/dev/null)

        if echo "$response_code" | grep -E "^(200|401|403)$" >/dev/null; then
            return 0
        fi
        sleep 2
        counter=$((counter + 2))
    done
    return 1
}
```

### Integration Points

```yaml
CONTAINER_INITIALIZATION:
  - integrate_with: scripts/qbittorrent-wrapper.sh
  - call_after: "Initial configuration processing"
  - call_before: "qBittorrent service start"
  - pattern: "Background execution with logging"

CONFIGURATION_FILES:
  - backup_targets: [
      "/config/qBittorrent/config/categories.json",
      "/config/qBittorrent/qBittorrent.conf"
    ]
  - restore_capability: "Point-in-time rollback support"

API_INTEGRATION:
  - endpoint: "http://nginx-proxy:8080/api/v2/torrents/editCategory"
  - authentication: "Handle both bypass and credentials modes"
  - validation: "http://nginx-proxy:8080/api/v2/torrents/categories"

LOG_INTEGRATION:
  - log_file: "/tmp/qbt_category_fix.log"
  - pattern: "$(date): [QBT-CATEGORY-FIX] message"
  - verbosity: "Info level for user feedback, debug level for troubleshooting"
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each script creation - fix before proceeding
shellcheck scripts/fix-qbittorrent-category-paths.sh    # Shell script linting
shellcheck scripts/validate-qbittorrent-categories.sh   # Validation script linting
shellcheck scripts/backup-qbittorrent-config.sh        # Backup script linting

# JSON syntax validation
jq empty config/qbittorrent/qBittorrent/config/categories.json

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test backup functionality
./scripts/backup-qbittorrent-config.sh
ls -la /tmp/qbt_config_backup_*/
echo "✓ Backup creation successful"

# Test category fix with dry-run mode
DRYRUN=true ./scripts/fix-qbittorrent-category-paths.sh
echo "✓ Dry-run execution successful"

# Test validation script
./scripts/validate-qbittorrent-categories.sh
echo "✓ Validation script execution successful"

# Test JSON manipulation patterns
echo '{"radarr":{"save_path":"/downloads/movies"}}' | \
  jq '.radarr.save_path = "/data/downloads/complete/movies"'
echo "✓ JSON manipulation pattern works"

# Expected: All component tests pass. If failing, debug root cause and fix implementation.
```

### Level 3: Integration Testing (System Validation)

```bash
# Ensure qBittorrent container is running
docker ps | grep qbittorrent || echo "qBittorrent container not running"

# Test API connectivity
curl -f http://localhost:18080/api/v2/app/version || echo "API connectivity failed"

# Execute complete category fix
./scripts/fix-qbittorrent-category-paths.sh

# Verify category configuration via API
curl -s http://localhost:18080/api/v2/torrents/categories | jq .

# Verify categories.json file directly
cat config/qbittorrent/qBittorrent/config/categories.json | jq .

# Test category assignment with test torrent (if available)
# curl -X POST http://localhost:18080/api/v2/torrents/setCategory \
#   -d "hashes=TEST_HASH&category=radarr"

# Validate complete media pipeline
./scripts/validate-media-pipeline.sh

# Expected: All integrations working, correct category paths, no API errors
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Media Organization Workflow Validation

# Create test directories to simulate downloads
mkdir -p /data/downloads/complete/movies/test-movie
mkdir -p /data/downloads/complete/tv/test-tv-show
echo "test file" > /data/downloads/complete/movies/test-movie/movie.mkv
echo "test file" > /data/downloads/complete/tv/test-tv-show/episode.mkv

# Test that directories are accessible from containers
docker exec torrents-plex-organization-radarr-1 ls -la /data/downloads/complete/movies/
docker exec torrents-plex-organization-sonarr-1 ls -la /data/downloads/complete/tv/

# Test file permissions and ownership
docker exec torrents-plex-organization-qbittorrent-1 touch /data/downloads/complete/test-permission
ls -la data/downloads/complete/test-permission

# Validate hardlink capability (crucial for media organization)
docker exec torrents-plex-organization-radarr-1 ln /data/downloads/complete/movies/test-movie/movie.mkv /data/media/movies/movie-hardlink.mkv
stat data/downloads/complete/movies/test-movie/movie.mkv | grep Links
stat data/media/movies/movie-hardlink.mkv | grep Links

# Test qBittorrent category persistence across restart
docker restart torrents-plex-organization-qbittorrent-1
sleep 30
curl -s http://localhost:18080/api/v2/torrents/categories | jq .

# Cleanup test files
rm -rf /data/downloads/complete/movies/test-movie
rm -rf /data/downloads/complete/tv/test-tv-show
rm -f data/downloads/complete/test-permission
rm -f data/media/movies/movie-hardlink.mkv

# Expected: All creative validations pass, hardlinks work, configuration persists
```

## Final Validation Checklist

### Technical Validation

- [ ] All scripts pass shellcheck linting without errors
- [ ] JSON manipulation produces valid output verified by jq
- [ ] Backup and restore functionality tested successfully
- [ ] API communication works in both auth and no-auth modes
- [ ] File permission management works correctly (1000:1000)

### Feature Validation

- [ ] qBittorrent categories show correct save paths via API: `/api/v2/torrents/categories`
- [ ] categories.json file contains correct paths: `/data/downloads/complete/movies`, `/data/downloads/complete/tv`
- [ ] Manual torrent category assignment works correctly
- [ ] Configuration persists across qBittorrent container restarts
- [ ] Both radarr and sonarr categories are properly configured

### Code Quality Validation

- [ ] Follows existing script patterns from configure-media-organization.sh
- [ ] File placement matches scripts/ directory structure
- [ ] Error handling includes proper timeout and retry mechanisms
- [ ] Logging follows established pattern with timestamps and tags
- [ ] Backup strategy implemented before making changes

### Documentation & Deployment

- [ ] Scripts include usage examples and parameter documentation
- [ ] Error messages are informative and actionable
- [ ] Integration with qbittorrent-wrapper.sh is seamless
- [ ] Rollback procedure documented for failed configuration changes

---

## Anti-Patterns to Avoid

- ❌ Don't modify configuration files without backing up first
- ❌ Don't assume API authentication mode - handle both scenarios
- ❌ Don't ignore file permissions - container requires 1000:1000 ownership
- ❌ Don't skip timeout handling in API calls - network delays are common
- ❌ Don't modify only one configuration file - qBittorrent uses multiple config files
- ❌ Don't restart qBittorrent container unnecessarily - API changes are dynamic
- ❌ Don't hardcode paths - use variables and environment configuration