name: "Automated Media Organization via Radarr/Sonarr - Implementation-Focused with Precision Standards"
description: |

---

## Goal

**Feature Goal**: Replace DIY file organization system with proper Radarr/Sonarr-based automated media organization that moves downloaded files from `/downloads` to Plex-scanned directories (`/data/media/tv`, `/data/media/movies`) with zero manual intervention.

**Deliverable**: Fully automated media pipeline where qBittorrent downloads → Radarr/Sonarr organizes → Plex libraries refresh automatically, with all configuration locked into automated scripts for fresh deployments.

**Success Definition**: 99% of completed downloads automatically appear in correct Plex libraries within 5 minutes, with proper naming and organization, requiring no manual file handling.

## User Persona

**Target User**: Alex, the "Home Server Enthusiast" (from PRD)

**Use Case**: Alex adds a movie/TV show to watchlist → system automatically downloads, organizes to correct Plex directories, and refreshes libraries

**User Journey**:
1. Add media to Radarr/Sonarr watchlist
2. System finds torrent and downloads via qBittorrent (VPN-protected)
3. Radarr/Sonarr detects completion, organizes files with proper naming
4. Web UI detects completion and triggers Plex library refresh
5. Media appears in Plex ready for viewing

**Pain Points Addressed**: Eliminates manual file organization, ensures consistent naming, maintains VPN security, provides zero-touch automation

## Why

- **Eliminates DIY File Processing**: Current system has conflicting manual organization that interferes with proper *arr services
- **Industry Standard Practice**: Radarr/Sonarr are purpose-built for media organization with superior naming and metadata handling
- **Reliability**: Proven tools with active development vs custom scripts that break with updates
- **VPN Security Compliance**: Maintains required qBittorrent VPN isolation while allowing proper media organization
- **Zero-Touch Automation**: Achieves PRD goal of "fire-and-forget" system with no manual intervention

## What

Replace existing DIY file organization system with proper Radarr/Sonarr automation while maintaining VPN security and achieving zero-touch media processing.

### Success Criteria

- [ ] All DIY file organization code removed from web UI
- [ ] Radarr organizes movies to `/data/media/movies` with proper naming
- [ ] Sonarr organizes TV shows to `/data/media/tv` with season folders
- [ ] qBittorrent categories properly configured for Radarr/Sonarr
- [ ] Web UI only handles Plex library refresh, not file processing
- [ ] Fresh docker deployments work automatically with pre-configured databases
- [ ] VPN isolation maintained for qBittorrent while media services stay on media network
- [ ] 99% automation rate with <5 minute time-to-Plex

## All Needed Context

### Context Completeness Check

_If someone knew nothing about this codebase, would they have everything needed to implement this successfully?_ ✅ YES - This PRP provides complete removal instructions, configuration patterns, and implementation details.

### Documentation & References

```yaml
- url: https://wiki.servarr.com/docker-guide
  why: Official Docker deployment patterns for *arr services
  critical: Volume mapping requirements for hardlinks and proper file organization

- url: https://trash-guides.info/File-and-Folder-Structure/How-to-set-up/Docker/
  why: Community best practices for unified volume structure
  critical: Prevents permission issues and enables instant moves via hardlinks

- url: https://trash-guides.info/Hardlinks/Hardlinks-and-Instant-Moves/
  why: Understanding hardlinks for efficient file organization
  critical: Prevents storage duplication and enables instant organization

- url: https://wiki.servarr.com/radarr/installation/docker
  why: Radarr-specific Docker configuration
  critical: Category setup and download client integration patterns

- url: https://wiki.servarr.com/sonarr/installation/docker
  why: Sonarr-specific Docker configuration
  critical: Season folder structure and TV show organization

- file: /home/dustin/projects/torrents-plex-organization/scripts/radarr-entrypoint.sh
  why: Existing database restoration pattern for automated configuration
  pattern: Template-based configuration with environment variable substitution
  gotcha: Must preserve existing database restoration logic

- file: /home/dustin/projects/torrents-plex-organization/scripts/sonarr-entrypoint.sh
  why: Existing database restoration pattern for automated configuration
  pattern: Template-based configuration with environment variable substitution
  gotcha: Must preserve existing database restoration logic

- file: /home/dustin/projects/torrents-plex-organization/web-ui/src/lib/managers/PlexIntegrationManager.ts
  why: Current Plex integration that only handles library refresh (correctly designed)
  pattern: Library type detection from qBittorrent categories
  gotcha: Comments already indicate "Sonarr/Radarr handle organization" - keep this approach

- file: /home/dustin/projects/torrents-plex-organization/web-ui/src/lib/utils/file-monitoring.ts
  why: Primary DIY organization system that conflicts with *arr services
  pattern: File system watching and auto-processing
  gotcha: REMOVE auto-organization but keep monitoring for UI display

- file: /home/dustin/projects/torrents-plex-organization/CLAUDE.md
  why: Critical VPN security requirements
  pattern: qBittorrent MUST remain VPN-isolated via network_mode: "container:vpn"
  gotcha: Network configuration changes risk exposing real IP address

- docfile: PRPs/ai_docs/radarr_sonarr_api_reference.md
  why: API patterns for automation and configuration validation
  section: Database setup and category configuration
```

### Current Codebase tree (run `tree` in the root of the project) to get an overview of the codebase

```bash
torrents-plex-organization/
├── config/templates/          # Template-based configuration system
│   ├── radarr/               # Radarr database and config templates
│   └── sonarr/               # Sonarr database and config templates
├── scripts/                  # Initialization and automation scripts
│   ├── radarr-entrypoint.sh  # Database restoration for Radarr
│   ├── sonarr-entrypoint.sh  # Database restoration for Sonarr
│   └── process-recent-downloads.sh  # DIY processing to REMOVE
├── web-ui/src/
│   ├── lib/utils/file-monitoring.ts    # DIY organization to REMOVE
│   ├── lib/managers/PlexIntegrationManager.ts  # Correct approach - keep
│   ├── app/api/test/plex-organization/  # DIY test endpoint to REMOVE
│   └── components/settings/sections/PlexSection.tsx  # Remove org settings
├── docker-compose.yml        # Proper volume mappings already configured
└── .env                     # Environment variables for configuration
```

### Desired Codebase tree with files to be added and responsibility of file

```bash
torrents-plex-organization/
├── config/templates/
│   ├── radarr/
│   │   ├── radarr.db.template    # Enhanced with proper categories
│   │   └── config.xml.template   # Existing - no changes needed
│   └── sonarr/
│       ├── sonarr.db.template    # Enhanced with proper categories
│       └── config.xml.template   # Existing - no changes needed
├── scripts/
│   ├── configure-media-organization.sh  # NEW: Configure *arr for automation
│   ├── radarr-entrypoint.sh            # MODIFY: Add organization validation
│   ├── sonarr-entrypoint.sh            # MODIFY: Add organization validation
│   └── validate-media-pipeline.sh      # NEW: End-to-end validation
├── web-ui/src/
│   ├── lib/utils/file-monitoring.ts    # MODIFY: Remove auto-organization
│   ├── lib/managers/PlexIntegrationManager.ts  # KEEP: Already correct
│   └── components/settings/sections/PlexSection.tsx  # MODIFY: Remove org UI
├── PRPs/ai_docs/
│   └── media-organization-config.md    # NEW: Configuration reference
└── docker-compose.yml                  # EXISTING: Already correct
```

### Known Gotchas of our codebase & Library Quirks

```python
# CRITICAL: VPN network isolation must be preserved
# qBittorrent MUST use network_mode: "container:vpn"
# Radarr/Sonarr stay on media_network for proper communication

# CRITICAL: Prowlarr database settings
# Must set proxyenabled=False to prevent timeouts
# Required for proper indexer synchronization

# CRITICAL: Volume mappings are already correct in docker-compose.yml
# Downloads: /downloads mapped consistently across all containers
# Media: /movies for Radarr, /tv for Sonarr, /media for Plex
# DO NOT change volume mappings - they enable hardlinks

# Template restoration system already exists
# Database templates in config/templates/{radarr,sonarr}/
# Custom entrypoints handle restoration automatically
# Must preserve this pattern for fresh deployments

# Jest testing requires specific environment setup
# Tests use temporary databases with real SQLite instances
# Security test suite validates container isolation
# Coverage threshold: 70% for all metrics
```

## Implementation Blueprint

### Data models and structure

Leverage existing database template system for consistent configuration across deployments.

```python
# Radarr Database Schema (existing template enhanced)
# - RootFolders: /movies configured as primary library
# - DownloadClients: qBittorrent via nginx-proxy:8080 with category "radarr"
# - QualityProfiles: Preconfigured with proper resolution priorities
# - NamingConfig: Movie Title (Year) format for Plex compatibility

# Sonarr Database Schema (existing template enhanced)
# - RootFolders: /tv configured as primary library
# - DownloadClients: qBittorrent via nginx-proxy:8080 with category "sonarr"
# - QualityProfiles: Preconfigured for TV content
# - NamingConfig: Show Name - S##E## format with season folders

# qBittorrent Categories (configured via API)
# - "radarr": Downloads to /downloads/movies, managed by Radarr
# - "sonarr": Downloads to /downloads/tv, managed by Sonarr
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE scripts/configure-media-organization.sh
  - IMPLEMENT: qBittorrent category setup via API
  - FOLLOW pattern: scripts/qbittorrent-auth-bypass.sh (API authentication approach)
  - NAMING: configure-media-organization.sh
  - FUNCTION: Ensure categories "radarr" and "sonarr" exist with proper paths
  - PLACEMENT: Root scripts/ directory alongside other configuration scripts

Task 2: MODIFY config/templates/radarr/radarr.db.template
  - IMPLEMENT: Update database to ensure proper download client configuration
  - FOLLOW pattern: Existing template database structure and SQL schema
  - NAMING: Preserve existing radarr.db.template filename
  - UPDATE: DownloadClients table with category "radarr" and proper mapping
  - PLACEMENT: config/templates/radarr/ (existing location)

Task 3: MODIFY config/templates/sonarr/sonarr.db.template
  - IMPLEMENT: Update database to ensure proper download client configuration
  - FOLLOW pattern: Existing template database structure and SQL schema
  - NAMING: Preserve existing sonarr.db.template filename
  - UPDATE: DownloadClients table with category "sonarr" and proper mapping
  - PLACEMENT: config/templates/sonarr/ (existing location)

Task 4: MODIFY web-ui/src/lib/utils/file-monitoring.ts
  - REMOVE: handleNewDownloadFile(), triggerPlexOrganization() methods
  - FOLLOW pattern: Keep existing monitoring structure for UI display
  - PRESERVE: File system watching for download status in UI
  - REMOVE: Automatic file processing and synthetic download creation
  - MAINTAIN: Event emission for UI updates without file processing

Task 5: MODIFY web-ui/src/app/api/test/plex-organization/route.ts
  - REMOVE: File organization and processing logic (lines 22-84)
  - FOLLOW pattern: Keep only Plex connectivity testing
  - SIMPLIFY: Return test success without processing files
  - PRESERVE: API endpoint structure for future connectivity tests
  - DOCUMENT: Note that organization is handled by Radarr/Sonarr

Task 6: MODIFY web-ui/src/components/settings/sections/PlexSection.tsx
  - REMOVE: Media organization settings and toggles
  - FOLLOW pattern: Keep existing connection and library settings
  - PRESERVE: Plex server URL, authentication, and library configuration
  - ADD: Information text explaining Radarr/Sonarr handle organization
  - MAINTAIN: Library refresh settings and preferences

Task 7: MODIFY scripts/radarr-entrypoint.sh
  - ADD: Call to configure-media-organization.sh after database restoration
  - FOLLOW pattern: Existing initialization sequence and error handling
  - PRESERVE: All existing restoration logic and environment substitution
  - ADD: Validation that download client is properly configured
  - PLACEMENT: After database restoration, before service startup

Task 8: MODIFY scripts/sonarr-entrypoint.sh
  - ADD: Call to configure-media-organization.sh after database restoration
  - FOLLOW pattern: Existing initialization sequence and error handling
  - PRESERVE: All existing restoration logic and environment substitution
  - ADD: Validation that download client is properly configured
  - PLACEMENT: After database restoration, before service startup

Task 9: CREATE scripts/validate-media-pipeline.sh
  - IMPLEMENT: End-to-end validation of media organization pipeline
  - FOLLOW pattern: test-security.sh (comprehensive validation approach)
  - TEST: qBittorrent categories, Radarr/Sonarr connectivity, Plex refresh
  - VALIDATE: Download client configuration, root folders, API connectivity
  - PLACEMENT: Root scripts/ directory alongside other test scripts

Task 10: REMOVE scripts/process-recent-downloads.sh
  - DELETE: Entire file that processes downloads manually
  - REASON: Conflicts with proper Radarr/Sonarr automation
  - FOLLOW pattern: Clean removal without breaking other scripts
  - VERIFY: No other scripts depend on this file

Task 11: REMOVE scripts/trigger-plex-organization.sh
  - DELETE: Entire file that triggers manual organization
  - REASON: Organization now handled by Radarr/Sonarr automatically
  - FOLLOW pattern: Clean removal without breaking other scripts
  - VERIFY: No other scripts or services call this file

Task 12: CREATE PRPs/ai_docs/media-organization-config.md
  - IMPLEMENT: Comprehensive configuration reference for media organization
  - DOCUMENT: Category setup, download client configuration, troubleshooting
  - INCLUDE: Database schema details, API endpoints, common issues
  - FOLLOW pattern: PRPs/ai_docs/qbittorrent-api.md (detailed technical reference)
  - PLACEMENT: PRPs/ai_docs/ directory for future reference
```

### Implementation Patterns & Key Details

```python
# Media Organization Configuration Pattern
def configure_qbittorrent_categories():
    # PATTERN: Use existing auth bypass pattern from qbittorrent-auth-bypass.sh
    # Get session cookie for API authentication
    # Create categories if they don't exist:
    # - "radarr" with save path "/downloads/movies"
    # - "sonarr" with save path "/downloads/tv"
    # CRITICAL: Use nginx-proxy:8080 endpoint, not direct container access

# Database Template Enhancement Pattern
def update_arr_database_templates():
    # PATTERN: Follow existing template restoration in entrypoint scripts
    # Update DownloadClients table in both radarr.db and sonarr.db templates
    # Ensure proper category mapping and API connection
    # GOTCHA: Must preserve all existing configuration like quality profiles
    # CRITICAL: Use consistent nginx-proxy:8080 endpoint for download client

# File Monitoring Simplification Pattern
def simplify_file_monitoring():
    # PATTERN: Keep existing chokidar watching for UI updates
    # REMOVE: All file processing logic (handleNewDownloadFile, triggerPlexOrganization)
    # PRESERVE: Event emission for UI updates and download tracking
    # MAINTAIN: File system watching without automatic processing

# Plex Integration Preservation Pattern
def maintain_plex_integration():
    # PATTERN: PlexIntegrationManager.ts is already correctly designed
    # Only triggers library refresh based on qBittorrent categories
    # Comments correctly state "Sonarr/Radarr handle organization"
    # KEEP: Library type detection from download categories
    # PRESERVE: All library refresh and connectivity functionality
```

### Integration Points

```yaml
DOCKER_COMPOSE:
  - preserve: All existing volume mappings enable hardlinks
  - validate: VPN isolation maintained for qBittorrent
  - verify: media_network allows Radarr/Sonarr communication

DATABASE_TEMPLATES:
  - enhance: config/templates/radarr/radarr.db.template
  - enhance: config/templates/sonarr/sonarr.db.template
  - preserve: All existing quality profiles and root folders

QBITTORRENT_API:
  - add: Category creation via API during initialization
  - pattern: Use nginx-proxy:8080 endpoint for consistent access
  - auth: Follow existing auth bypass pattern for API calls

WEB_UI_INTEGRATION:
  - simplify: Remove file organization from FileMonitor
  - preserve: Plex library refresh in PlexIntegrationManager
  - update: Settings UI to remove organization options
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Frontend validation after web UI changes
cd web-ui && npm run test:ci                    # Full test suite with coverage
cd web-ui && npm run lint                       # TypeScript and ESLint validation

# Script validation
shellcheck scripts/configure-media-organization.sh
shellcheck scripts/validate-media-pipeline.sh

# Docker validation
docker compose config                           # Validate compose syntax
docker compose -f docker-compose.yml -f docker-compose.pia.yml config  # VPN variant

# Expected: Zero errors. All tests pass, shellcheck clean, compose valid.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test removed functionality no longer processes files
cd web-ui && npm test -- file-monitoring.test.ts
cd web-ui && npm test -- PlexIntegrationManager.test.ts

# Test settings UI changes
cd web-ui && npm test -- PlexSection.test.tsx

# Test API endpoint simplification
cd web-ui && npm test -- plex-organization.test.ts

# Security validation - ensure VPN isolation maintained
./test-security.sh

# Expected: All tests pass. DIY organization tests removed/updated.
```

### Level 3: Integration Testing (System Validation)

```bash
# Full stack validation with proper media organization
docker compose up -d                           # Start all services
sleep 60                                       # Allow full startup

# Validate qBittorrent categories configured
curl -s "http://localhost:25861/api/v2/torrents/categories" | jq .

# Validate Radarr download client configuration
curl -s "http://localhost:25860/api/v3/downloadclient" \
  -H "X-Api-Key: 1896856646174be29ab7cca907e77458" | jq .

# Validate Sonarr download client configuration
curl -s "http://localhost:34245/api/v3/downloadclient" \
  -H "X-Api-Key: afde353290c6439497772562330d4eb0" | jq .

# Test Plex connectivity (should work without organization)
curl -f "http://localhost:3002/api/plex/status" | jq .

# Run comprehensive media pipeline validation
./scripts/validate-media-pipeline.sh

# Expected: Categories exist, download clients configured, Plex responsive.
```

### Level 4: Creative & Domain-Specific Validation

```bash
# VPN Security Validation
# Verify qBittorrent remains isolated while media services communicate
docker network ls | grep -E "(vpn|media)"
docker inspect plex-organization-qbittorrent | jq '.NetworkSettings'

# Media Organization Workflow Test
# Create test torrent download and verify automation
# 1. Add test movie to Radarr
# 2. Verify category "radarr" applied to download
# 3. Confirm Radarr organizes file to /data/media/movies
# 4. Validate Plex library refresh triggers

# Template Restoration Test
# Remove config and verify automatic restoration
docker compose down
rm -rf config/radarr config/sonarr
docker compose up -d radarr sonarr
# Verify databases and configuration restored from templates

# Database Validation
# Verify proper download client configuration in templates
sqlite3 config/templates/radarr/radarr.db.template \
  "SELECT Name, ConfigContract FROM DownloadClients;"

# Performance Test
# Verify organization happens via hardlinks (instant moves)
time ls -la /data/media/movies/  # Should be instant regardless of size

# Expected: VPN isolation maintained, automation works, templates restore properly.
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `cd web-ui && npm run test:ci`
- [ ] No TypeScript errors: `cd web-ui && npx tsc --noEmit`
- [ ] Security validation passes: `./test-security.sh`
- [ ] Docker validation passes: `docker compose config`

### Feature Validation

- [ ] DIY file organization completely removed from web UI
- [ ] qBittorrent categories "radarr" and "sonarr" configured automatically
- [ ] Radarr organizes movies to `/data/media/movies` with proper naming
- [ ] Sonarr organizes TV shows to `/data/media/tv` with season folders
- [ ] Plex library refresh works without file organization
- [ ] Fresh deployments work automatically with template restoration
- [ ] VPN isolation maintained for qBittorrent

### Code Quality Validation

- [ ] Follows existing codebase patterns (template restoration, API usage)
- [ ] File placement matches desired codebase tree structure
- [ ] No breaking changes to existing Docker volume mappings
- [ ] All removed files verified not used by other components
- [ ] Proper error handling in new configuration scripts

### Documentation & Deployment

- [ ] Configuration scripts are self-documenting with clear output
- [ ] Media organization reference documentation created
- [ ] Environment variables preserved and properly documented
- [ ] VPN security requirements maintained per CLAUDE.md

---

## Anti-Patterns to Avoid

- ❌ Don't modify Docker volume mappings - they're correctly configured for hardlinks
- ❌ Don't add file processing back to web UI - Radarr/Sonarr handle this
- ❌ Don't change VPN network isolation - qBittorrent MUST stay VPN-protected
- ❌ Don't bypass template restoration system - it ensures fresh deployments work
- ❌ Don't remove existing Plex integration - it's correctly designed for library refresh only
- ❌ Don't hardcode paths - use existing environment variable patterns
- ❌ Don't skip validation scripts - they prevent broken deployments