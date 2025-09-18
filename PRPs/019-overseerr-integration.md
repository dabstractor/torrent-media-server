name: "Overseerr Integration PRP"
description: "A comprehensive PRP to integrate Overseerr for media requests and user management."

---

## Goal

**Feature Goal**: Integrate Overseerr into the existing Docker-based media server stack to provide a user-friendly interface for requesting movies and TV shows.

**Deliverable**: A new `overseerr` service in the `docker-compose.yml` file, fully configured to work with the existing Plex, Radarr, and Sonarr services, including pre-configuration templates and entrypoint scripts.

**Success Definition**: The Overseerr service is running, accessible via a reverse proxy, and can successfully communicate with Plex, Radarr, and Sonarr to manage media requests. It is fully integrated into the web UI's services page with health checks.

## Why

- **User Experience**: Provide a simple and intuitive way for users to request new media.
- **Automation**: Automate the process of adding requested media to Radarr and Sonarr.
- **Integration**: Tightly integrate with the existing Plex server for library management and user authentication.

## All Needed Context

### Context Completeness Check

_Before writing this PRP, validate: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"_

Yes. This PRP contains all necessary file contents, configurations, and implementation details directly within the document. No additional research is required.

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://docs.overseerr.dev/getting-started/installation
  why: Official Docker installation guide for Overseerr.
  critical: Provides the official Docker image name, required environment variables, and volume mounts.
- url: https://docs.overseerr.dev/using-overseerr/settings
  why: Detailed information on Overseerr's settings.
  critical: Explains how to configure connections to Plex, Radarr, and Sonarr.
- url: https://docs.overseerr.dev/using-overseerr/users
  why: User management documentation.
  critical: Explains how users are created and managed, which is important for automation.

- file: docker-compose.yml
  why: The main Docker Compose file where the new service will be added.
  pattern: Study the existing service definitions (e.g., radarr, sonarr) to understand the network configuration, volume mounts, and health checks.
  gotcha: Note the use of `x-logging` and custom networks (`media_network`, `vpn_network`).

- file: scripts/radarr-entrypoint.sh
  why: Example of a custom entrypoint script that handles configuration templating.
  pattern: This script shows how to restore a configuration from a template and apply environment variables.
  gotcha: The script uses `sed` to replace variables in template files.

- file: config/templates/radarr/config.xml.template
  why: Example of a configuration template file.
  pattern: This file shows how to use environment variables as placeholders (e.g., `${RADARR_API_KEY}`).
  gotcha: Environment variables must be properly escaped in XML files.

- file: scripts/qbittorrent-wrapper.sh
  why: Example of a wrapper script that processes configuration templates.
  pattern: This script shows how to use `envsubst` to process template files with environment variables.
  gotcha: Ensure configuration files are writable after processing.
```

### Known Gotchas of our codebase & Library Quirks

```python
# CRITICAL: qBittorrent MUST remain fully VPN-isolated via `network_mode: "container:vpn"`.
# CRITICAL: Ensure `proxyenabled=False` in Prowlarr database to prevent timeouts.
# CRITICAL: Overseerr does not support pre-configuring users through configuration files or environment variables before the first run.
```

## Implementation Blueprint

### Data models and structure

Overseerr uses a SQLite database stored in `/app/config/db`. The configuration is stored in `/app/config/settings.json`. We will create a template for `settings.json` to pre-configure the connections to Plex, Radarr, and Sonarr.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE config/templates/overseerr/settings.json.template
  - IMPLEMENT: A template for Overseerr's settings.json file.
  - FOLLOW pattern: config/templates/radarr/config.xml.template
  - NAMING: Use placeholders like ${PLEX_TOKEN}, ${RADARR_API_KEY}, etc.
  - PLACEMENT: config/templates/overseerr/settings.json.template

Task 2: CREATE scripts/overseerr-entrypoint.sh
  - IMPLEMENT: A custom entrypoint script for Overseerr.
  - FOLLOW pattern: scripts/radarr-entrypoint.sh
  - NAMING: overseerr-entrypoint.sh
  - DEPENDENCIES: This script will use the settings.json.template from Task 1.
  - PLACEMENT: scripts/overseerr-entrypoint.sh

Task 3: MODIFY docker-compose.yml
  - INTEGRATE: Add the new `overseerr` service.
  - FIND pattern: Existing service definitions (e.g., radarr, sonarr).
  - ADD: A new `overseerr` service using the `sctx/overseerr:latest` image.
  - PRESERVE: Existing service configurations and network settings.

Task 4: MODIFY .env.example
  - ADD: A new environment variable for the Overseerr port (`OVERSEERR_PORT`).

Task 5: MODIFY scripts/create-worktree-env.sh
  - ADD: The `OVERSEERR_PORT` to the worktree environment script.

Task 6: MODIFY web-ui/src/app/services/page.tsx
  - ADD: A new service card for Overseerr.
  - FOLLOW pattern: Existing service cards for Radarr, Sonarr, etc.
```

### Implementation Patterns & Key Details

```python
# Show critical patterns and gotchas - keep concise, focus on non-obvious details

# Example: Service definition pattern in docker-compose.yml
overseerr:
  image: sctx/overseerr:latest
  container_name: ${CONTAINER_PREFIX}overseerr
  entrypoint: ["/scripts/overseerr-entrypoint.sh"]
  networks:
    - media_network
    - vpn_network
  depends_on:
    init-directories:
      condition: service_completed_successfully
    plex:
      condition: service_healthy
    radarr:
      condition: service_healthy
    sonarr:
      condition: service_healthy
  env_file:
    - .env
  environment:
    - PUID=1000
    - PGID=1000
    - TZ=${TZ:-America/New_York}
    - PORT=${OVERSEERR_PORT:-5055}
  volumes:
    - ./config/overseerr:/app/config
    - ./config/templates/overseerr:/templates:ro
    - ./scripts:/scripts:ro
  healthcheck:
    test: ["CMD-SHELL", "curl -f http://localhost:${OVERSEERR_PORT:-5055}/api/v1/status || exit 1"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 60s
  restart: unless-stopped
  stop_grace_period: 60s

# Example: Entrypoint script pattern
#!/bin/bash
CONFIG_DIR="/app/config"
TEMPLATE_DIR="/templates"

echo "[INIT] Overseerr custom entrypoint starting..."

# Check if settings.json needs restoration
if [ ! -f "$CONFIG_DIR/settings.json" ] || [ ! -s "$CONFIG_DIR/settings.json" ]; then
    echo "[INIT] Settings.json missing or empty - restoration needed"

    if [ -f "$TEMPLATE_DIR/settings.json.template" ]; then
        # Substitute environment variables in settings template using envsubst
        envsubst < "$TEMPLATE_DIR/settings.json.template" > "$CONFIG_DIR/settings.json"
        chown 1000:1000 "$CONFIG_DIR/settings.json"
        chmod 644 "$CONFIG_DIR/settings.json"
        echo "[INIT] Settings.json restored from template"
    fi
else
    echo "[INIT] Complete configuration found, no restoration needed"
fi

echo "[INIT] Starting Overseerr..."
exec /usr/local/bin/node dist/index.js

# Example: Settings.json template pattern
{
  "version": "1.28.0",
  "movie": {
    "defaultServiceId": ${RADARR_SERVICE_ID:-1},
    "default4kServiceId": null
  },
  "tv": {
    "defaultServiceId": ${SONARR_SERVICE_ID:-1},
    "default4kServiceId": null
  },
  "radarr": [
    {
      "id": 1,
      "name": "Radarr",
      "hostname": "radarr",
      "port": 7878,
      "apiKey": "${RADARR_API_KEY}",
      "useSsl": false,
      "urlBase": "",
      "isDefault": true,
      "activeProfileId": 1,
      "activeProfileName": "Any",
      "activeDirectory": "/movies",
      "tags": []
    }
  ],
  "sonarr": [
    {
      "id": 1,
      "name": "Sonarr",
      "hostname": "sonarr",
      "port": 8989,
      "apiKey": "${SONARR_API_KEY}",
      "useSsl": false,
      "urlBase": "",
      "isDefault": true,
      "activeProfileId": 1,
      "activeProfileName": "Any",
      "activeDirectory": "/tv",
      "activeLanguageProfileId": 1,
      "tags": []
    }
  ],
  "plex": {
    "name": "Plex",
    "hostname": "plex",
    "port": 32400,
    "useSsl": false,
    "libraries": []
  }
}
```

### Integration Points

```yaml
DATABASE:
  - migration: "None required - Overseerr uses its own SQLite database"

CONFIG:
  - add to: .env.example
  - pattern: "OVERSEERR_PORT=5055"

ROUTES:
  - add to: web-ui/src/app/services/page.tsx
  - pattern: "Add a new service card for Overseerr with health check and link"
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file creation - fix before proceeding
docker compose config  # Validate docker-compose.yml syntax
```

### Level 2: Unit Tests (Component Validation)

```bash
# N/A for this PRP
```

### Level 3: Integration Testing (System Validation)

```bash
# Service startup validation
docker compose up -d

# Health check validation
curl -f http://localhost:${OVERSEERR_PORT}/api/v1/status

# Feature-specific endpoint testing
# Manual testing:
# 1. Open Overseerr in the browser.
# 2. Verify that it's connected to Plex, Radarr, and Sonarr.
# 3. Request a movie and a TV show.
# 4. Verify that the requests appear in Radarr and Sonarr.
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Web UI Service Page Validation
# 1. Navigate to the Services page in the web UI.
# 2. Verify that the Overseerr service card is present.
# 3. Verify that the health check is working.
# 4. Verify that the link to Overseerr is correct.
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] Docker Compose file syntax is valid
- [ ] All environment variables are properly defined
- [ ] Configuration templates are correctly processed

### Feature Validation

- [ ] Overseerr service is running and accessible
- [ ] Overseerr can connect to Plex, Radarr, and Sonarr
- [ ] Media requests can be made through Overseerr
- [ ] Requests appear in Radarr and Sonarr

### Code Quality Validation

- [ ] Follows existing codebase patterns and naming conventions
- [ ] File placement matches desired codebase tree structure
- [ ] Anti-patterns avoided (check against Anti-Patterns section)
- [ ] Dependencies properly managed and imported
- [ ] Configuration changes properly integrated

### Documentation & Deployment

- [ ] Code is self-documenting with clear variable/function names
- [ ] Logs are informative but not verbose
- [ ] Environment variables documented if new ones added

---
## Anti-Patterns to Avoid

- ❌ Don't create new patterns when existing ones work
- ❌ Don't skip validation because "it should work"
- ❌ Don't ignore failing tests - fix them
- ❌ Don't hardcode values that should be config
- ❌ Don't catch all exceptions - be specific
