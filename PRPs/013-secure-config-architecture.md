# PRP-013: Secure Configuration Architecture & Git History Remediation

---

## Goal

**Feature Goal**: Transform the insecure configuration management system from committing sensitive data to version control into a secure template-based architecture with runtime configuration generation.

**Deliverable**: 
- Completely cleaned Git repository with no sensitive data in history
- Template-based configuration system separating static configs from runtime secrets
- Container initialization system generating secure configurations on first run
- Validated Docker builds working across all VPN provider configurations

**Success Definition**: 
- No API keys, credentials, or personal data in Git history or working tree
- All Docker configurations (`docker-compose up -d` and `docker-compose -f docker-compose.yml -f docker-compose.pia.yml up -d`) build successfully
- All containers achieve "Healthy" status with proper initialization
- Configuration templates allow clean deploys without manual intervention

## User Persona

**Target User**: DevOps engineer / system administrator managing media server infrastructure

**Use Case**: Deploying secure media server stack across different environments without exposing sensitive credentials in version control

**User Journey**: 
1. Clone repository to new environment
2. Run initialization script to generate secure configurations  
3. Deploy with `docker-compose up -d`
4. All services start successfully with unique generated credentials

**Pain Points Addressed**: 
- Exposed API keys, VPN credentials, and personal information in Git
- Cannot safely share repository due to embedded secrets
- Manual configuration required for each deployment
- Risk of credential leakage through version control

## Why

- **Critical Security Vulnerability**: API keys, VPN private keys, ASP.NET encryption keys, and personal credentials are exposed in Git history
- **Architectural Improvement**: Enable clean deployments and environment isolation through template-based configuration
- **Compliance**: Follow security best practices for containerized application configuration management
- **Maintainability**: Separate concerns between static configuration templates and runtime secrets

## What

Implement secure configuration architecture with:

### Immediate Security Remediation
- Remove all sensitive data from Git history using `git filter-repo`
- Revoke and rotate all exposed credentials (API keys, VPN keys, Plex tokens)
- Clean 94% of config directory (71MB) containing runtime state and logs

### Template-Based Configuration System  
- Convert service configurations to templates with environment variable placeholders
- Preserve valuable curated content (Prowlarr indexer definitions, nginx configuration)
- Implement secure secret injection during container initialization

### Container Initialization Architecture
- Add init containers and entrypoint scripts for configuration generation
- Implement health checks validating successful initialization
- Support both standard and VPN provider override configurations

### Success Criteria

- [ ] Git repository contains no sensitive data (validated by comprehensive scanning)
- [ ] All exposed credentials revoked and regenerated
- [ ] Template system generates valid configurations for all services
- [ ] Docker builds succeed: `docker-compose up -d` and `docker-compose -f docker-compose.yml -f docker-compose.pia.yml up -d`
- [ ] All containers achieve "Healthy" status within 5 minutes
- [ ] Services maintain functionality with generated configurations
- [ ] Configuration changes persist across container restarts
- [ ] Fresh deployment requires no manual configuration

## All Needed Context

### Context Completeness Check

_"If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"_ ✅ 

### Documentation & References

```yaml
# CRITICAL SECURITY DOCUMENTATION
- url: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository
  why: Official GitHub guidance for git filter-repo usage and sensitive data removal
  critical: Must contact GitHub Support for server-side cleanup after history rewrite

- url: https://github.com/newren/git-filter-repo
  why: Primary tool for Git history cleaning - faster and safer than deprecated git filter-branch  
  critical: Requires Python 3.5+, removes commit signatures, creates new commit hashes

- url: https://docs.docker.com/compose/extends/
  why: Docker Compose override patterns for VPN provider configurations
  critical: Must maintain docker-compose.pia.yml override compatibility

# CONTAINER INITIALIZATION PATTERNS
- url: https://github.com/just-containers/s6-overlay
  why: Process supervision and initialization framework used in LinuxServer.io containers
  critical: All media server containers use s6-overlay - follow existing patterns

- url: https://docs.linuxserver.io/general/container-customization
  why: Custom initialization script patterns (/custom-cont-init.d/, /custom-services.d/)
  critical: LinuxServer.io containers support three customization levels

# EXISTING CODEBASE PATTERNS TO FOLLOW
- file: docker-compose.yml
  why: Current volume mapping and service orchestration patterns
  pattern: ./config/[service]:/config volume mapping, network isolation strategy
  gotcha: VPN services use isolated vpn_network (172.28.0.0/16), media services bridge both networks

- file: docker-compose.pia.yml  
  why: Override pattern for VPN provider alternatives
  pattern: Service-level overrides maintaining same port/volume structure
  gotcha: Must maintain compatibility across all VPN provider overrides

- file: .env
  why: Environment variable patterns and defaults
  pattern: ${VAR:-default_value} fallback syntax, network configuration standards
  gotcha: Contains exposed credentials that must be cleaned from Git history

- file: scripts/setup-pia.sh
  why: Existing initialization script patterns for VPN configuration  
  pattern: Configuration file generation using shell scripts and templates
  gotcha: Generates WireGuard private keys - shows existing config generation approach
```

### Current Codebase Tree

```bash
torrents/
├── config/                    # 1,001 files, 77MB - SECURITY RISK
│   ├── nginx/                 # 1 file, 4KB - KEEP (static config)
│   ├── plex/                  # 374 files, 19MB - CLEAN (contains tokens, personal data)
│   ├── prowlarr/             # 544 files, 11MB - PARTIAL (keep Definitions/, clean config.xml)
│   ├── qbittorrent/          # 24 files, 15MB - CLEAN (runtime state)
│   ├── radarr/               # 21 files, 14MB - CLEAN (API keys, databases)  
│   ├── sonarr/               # 25 files, 20MB - CLEAN (API keys, databases)
│   ├── transmission/         # 5 files, 20KB - CLEAN (password hashes)
│   └── vpn/                  # 7 files, 40KB - KEEP (scripts, templates)
├── docker-compose.yml         # Main service definitions
├── docker-compose.pia.yml     # PIA VPN override
├── .env                       # CRITICAL: Contains exposed PIA credentials
├── scripts/                   # Existing automation patterns
└── PRPs/                      # Documentation and templates
```

### Desired Codebase Tree After Implementation

```bash  
torrents/
├── config/
│   ├── nginx/
│   │   └── nginx.conf                    # Static reverse proxy config (KEEP)
│   ├── templates/                        # NEW - Configuration templates
│   │   ├── plex/
│   │   │   └── Preferences.xml.template
│   │   ├── prowlarr/
│   │   │   └── config.xml.template
│   │   ├── radarr/
│   │   │   └── config.xml.template
│   │   └── sonarr/
│   │       └── config.xml.template
│   ├── static/                           # NEW - Static preserved content
│   │   └── prowlarr/
│   │       └── Definitions/              # 524 indexer definition files (PRESERVE)
│   └── vpn/                              # Existing VPN scripts (KEEP)
├── scripts/
│   ├── init-container.sh                 # NEW - Container initialization script
│   ├── generate-secrets.sh               # NEW - Secret generation utilities  
│   └── validate-config.sh                # NEW - Configuration validation
├── docker-compose.yml                    # Updated with init container patterns
├── docker-compose.pia.yml                # Maintained compatibility
├── .env.example                          # NEW - Template with safe defaults
└── .gitignore                            # UPDATED - Comprehensive exclusions
```

### Known Gotchas & Library Quirks

```python
# CRITICAL: LinuxServer.io containers require specific initialization timing
# s6-overlay runs initialization scripts in /custom-cont-init.d/ before services start
# Scripts must be executable and use #!/usr/bin/with-contenv bash

# CRITICAL: Environment variable substitution in templates
# Use envsubst for simple variable replacement: envsubst < template > output
# Complex logic requires Jinja2 templating with Python initialization scripts

# CRITICAL: ASP.NET Core Data Protection Keys  
# Sonarr/Radarr/Prowlarr use Data Protection API - keys are cryptographic secrets
# Located in: config/[service]/asp/key-*.xml - MUST BE EXCLUDED from Git

# CRITICAL: SQLite database file handling
# Service databases (*.db, *.db-shm, *.db-wal) contain operational state
# Initialization should allow database migration/creation but not overwrite existing

# CRITICAL: Network isolation patterns
# VPN services: vpn_network (172.28.0.0/16, internal: true)
# Media services: media_network + vpn_network bridge for selective routing
# Plex: host network mode for UPnP/DLNA discovery

# CRITICAL: Volume mapping consistency  
# All services use ./config/[service]:/config pattern
# Changing this breaks existing Docker configurations
# Init containers must work within existing volume structure
```

## Implementation Blueprint

### Data Models and Structure

```bash
# Configuration Template Structure
templates/
├── [service]/
│   ├── config.xml.template          # Service-specific configuration with placeholders
│   ├── .env.template               # Environment-specific overrides  
│   └── init-hooks/                 # Service-specific initialization scripts
│       ├── pre-start.sh            # Run before service starts
│       ├── post-start.sh           # Run after service starts  
│       └── healthcheck.sh          # Custom health validation

# Generated Configuration Structure (runtime)
config/
├── [service]/                      # Generated at container startup
│   ├── config.xml                  # Populated from template + secrets
│   ├── generated/                  # Runtime created files
│   │   ├── api-keys.txt            # Generated API keys
│   │   ├── .secrets                # Injected sensitive values
│   │   └── .initialized           # Initialization marker
│   └── logs/                       # Service logs (excluded from Git)
```

### Implementation Tasks (Dependency-Ordered)

```yaml
Task 1: IMMEDIATE - Secure Git Repository 
  - REVOKE: All exposed API keys (Sonarr, Radarr, Prowlarr), VPN credentials, Plex tokens
  - BACKUP: Create bundle backup: git bundle create backup-$(date +%Y%m%d).bundle --all
  - INSTALL: git filter-repo tool (pip install git-filter-repo)
  - CLEAN: Remove sensitive data from history: git filter-repo --path config/ --invert-paths --force
  - VALIDATE: Scan cleaned repository for remaining sensitive data patterns
  - DEPENDENCIES: None (highest priority)
  - PLACEMENT: Execute before any other tasks

Task 2: CREATE templates/ directory structure
  - EXTRACT: Convert existing config.xml files to templates with ${API_KEY} placeholders  
  - PRESERVE: Move valuable static content (prowlarr/Definitions/, nginx.conf, vpn/)
  - FOLLOW pattern: envsubst-compatible template syntax with ${VAR:-default} fallbacks
  - NAMING: [service-name].xml.template, maintain service directory structure
  - PLACEMENT: config/templates/[service]/ directory structure
  - DEPENDENCIES: Task 1 complete

Task 3: CREATE initialization script framework
  - IMPLEMENT: scripts/init-container.sh with s6-overlay integration
  - FOLLOW pattern: /custom-cont-init.d/ script structure from existing LinuxServer.io containers
  - GENERATE: API keys, configuration files from templates, directory structures
  - NAMING: Numbered scripts (01-init-directories.sh, 02-generate-configs.sh, 03-set-permissions.sh)
  - DEPENDENCIES: Task 2 templates available
  - PLACEMENT: scripts/ directory with Docker volume mapping

Task 4: UPDATE Docker configurations  
  - MODIFY: docker-compose.yml to include initialization volume mappings
  - PRESERVE: Existing network topology, service dependencies, health checks
  - ADD: Template and script volume mounts: ./config/templates:/templates:ro, ./scripts:/custom-cont-init.d:ro
  - MAINTAIN: docker-compose.pia.yml override compatibility
  - DEPENDENCIES: Tasks 2 and 3 complete

Task 5: CREATE comprehensive .gitignore
  - IMPLEMENT: Exclude all runtime-generated config, databases, logs, secrets
  - PATTERN: Media server specific exclusions (*.db, *.log, config/*/config.xml)
  - INCLUDE: Static templates, scripts, documentation
  - FOLLOW pattern: Layer-based exclusions (service-specific, file-type-specific, security-specific)
  - DEPENDENCIES: Task 1 complete
  - PLACEMENT: Repository root

Task 6: IMPLEMENT secret generation utilities
  - CREATE: scripts/generate-secrets.sh for API key generation
  - IMPLEMENT: Secure random generation using openssl rand -hex 16
  - VALIDATE: Generated secrets meet service requirements (length, format)
  - INTEGRATE: With container initialization workflow  
  - DEPENDENCIES: Task 3 framework complete
  - PLACEMENT: scripts/ directory

Task 7: CREATE configuration validation system
  - IMPLEMENT: scripts/validate-config.sh for generated configuration verification
  - VALIDATE: XML syntax, required fields, service-specific requirements
  - TEST: Database connectivity, API endpoint accessibility
  - INTEGRATE: With container health checks
  - DEPENDENCIES: Tasks 3 and 6 complete
  - PLACEMENT: scripts/ directory

Task 8: UPDATE environment variable management
  - CREATE: .env.example with safe defaults and documentation  
  - REMOVE: All sensitive values from .env (move to secret generation)
  - DOCUMENT: Required environment variables for each service
  - MAINTAIN: Existing ${VAR:-default} pattern compatibility  
  - DEPENDENCIES: Task 1 complete (after .env is cleaned from Git)
  - PLACEMENT: Repository root
```

### Implementation Patterns & Key Details

```bash
# Service Configuration Template Pattern
# Example: config/templates/sonarr/config.xml.template
<Config>
  <LogLevel>${LOG_LEVEL:-info}</LogLevel>
  <ApiKey>${SONARR_API_KEY}</ApiKey>
  <AuthenticationMethod>${AUTH_METHOD:-None}</AuthenticationMethod>
  <InstanceName>${SONARR_INSTANCE_NAME:-Sonarr}</InstanceName>
</Config>

# Container Initialization Script Pattern  
#!/usr/bin/with-contenv bash
# scripts/01-generate-configs.sh

# CRITICAL: Check if already initialized to avoid overwriting
if [ -f /config/.initialized ]; then
    echo "Configuration already initialized, skipping..."
    exit 0
fi

# Generate API keys if not provided
export SONARR_API_KEY=${SONARR_API_KEY:-$(openssl rand -hex 16)}
export RADARR_API_KEY=${RADARR_API_KEY:-$(openssl rand -hex 16)}
export PROWLARR_API_KEY=${PROWLARR_API_KEY:-$(openssl rand -hex 16)}

# Generate configurations from templates
envsubst < /templates/sonarr/config.xml.template > /config/config.xml

# Set proper permissions  
chown -R abc:abc /config
chmod 644 /config/config.xml

# Mark initialization complete
touch /config/.initialized

# Docker Compose Volume Integration Pattern
services:
  sonarr:
    image: lscr.io/linuxserver/sonarr:latest
    volumes:
      - ./config/sonarr:/config                    # Runtime configuration
      - ./config/templates/sonarr:/templates:ro    # Static templates  
      - ./scripts:/custom-cont-init.d:ro           # Initialization scripts
      - ./config/static/sonarr:/static:ro          # Static preserved content
```

### Integration Points

```yaml
DOCKER_VOLUMES:
  - modify: docker-compose.yml services
  - add: "./config/templates:/templates:ro" for template access
  - add: "./scripts:/custom-cont-init.d:ro" for initialization scripts
  - preserve: existing "./config/[service]:/config" patterns

ENVIRONMENT_VARIABLES:
  - create: .env.example with secure defaults
  - remove: PIA_USER, PIA_PASS, and all API keys from .env
  - pattern: "SONARR_API_KEY=${SONARR_API_KEY:-}" (empty default, generated at runtime)

GIT_HISTORY:
  - clean: Remove config/ directory from all commits
  - preserve: Commit messages and timestamps where possible  
  - validate: No sensitive patterns remain in repository

HEALTH_CHECKS:
  - extend: existing healthcheck patterns in docker-compose.yml
  - validate: Configuration file existence and validity
  - test: Service API responsiveness with generated credentials
```

## Validation Loop

### Level 1: Git Repository Security Validation

```bash
# CRITICAL: Run immediately after git filter-repo cleanup
git log --all --full-history --source -S'api.*key' --all | head -10
git log --all --full-history --source -S'password' --all | head -10  
git log --all --full-history --source -S'private.*key' --all | head -10
git log --all --full-history --source -S'dmanke@gmail.com' --all | head -10
git log --all --full-history --source -S'dustinschultz497' --all | head -10

# Check for remaining sensitive files
git log --all --name-only --pretty="" -- "*.key" "*.pem" "*.p12" | head -10
git log --all --name-only --pretty="" -- "*.db" "*.sqlite" | head -10

# Validate repository integrity
git fsck --full --strict
git count-objects -v

# Expected: Zero matches for sensitive patterns, repository integrity confirmed
```

### Level 2: Configuration Generation Testing

```bash
# Test template processing and secret generation
docker-compose down && docker-compose rm -f
rm -rf ./config/*/config.xml ./config/*/.initialized

# Start services and validate initialization
docker-compose up -d
sleep 60

# Verify generated configurations exist and are valid
[ -f ./config/sonarr/config.xml ] || echo "ERROR: Sonarr config not generated"
[ -f ./config/radarr/config.xml ] || echo "ERROR: Radarr config not generated"
[ -f ./config/prowlarr/config.xml ] || echo "ERROR: Prowlarr config not generated"

# Validate XML syntax
xmllint --noout ./config/sonarr/config.xml || echo "ERROR: Invalid Sonarr XML"
xmllint --noout ./config/radarr/config.xml || echo "ERROR: Invalid Radarr XML"  
xmllint --noout ./config/prowlarr/config.xml || echo "ERROR: Invalid Prowlarr XML"

# Expected: All configuration files generated with valid XML syntax
```

### Level 3: Service Integration Validation

```bash
# Test both standard and PIA VPN configurations
echo "=== Testing Standard Configuration ==="
docker-compose down && docker-compose up -d
scripts/validate-config.sh

echo "=== Testing PIA VPN Configuration ==="  
docker-compose down
docker-compose -f docker-compose.yml -f docker-compose.pia.yml up -d
scripts/validate-config.sh

# Health check validation
docker-compose ps --format "table {{.Name}}\t{{.Status}}"
timeout 300 bash -c 'until [[ $(docker-compose ps -q | xargs docker inspect --format="{{.State.Health.Status}}" | grep -c healthy) -eq $(docker-compose ps -q | wc -l) ]]; do sleep 10; done'

# API endpoint validation with generated credentials
SONARR_KEY=$(grep -oP '(?<=<ApiKey>)[^<]+' ./config/sonarr/config.xml)
RADARR_KEY=$(grep -oP '(?<=<ApiKey>)[^<]+' ./config/radarr/config.xml)
PROWLARR_KEY=$(grep -oP '(?<=<ApiKey>)[^<]+' ./config/prowlarr/config.xml)

curl -f "http://localhost:8989/api/v3/system/status?apikey=$SONARR_KEY" || echo "ERROR: Sonarr API failed"
curl -f "http://localhost:7878/api/v3/system/status?apikey=$RADARR_KEY" || echo "ERROR: Radarr API failed"  
curl -f "http://localhost:9696/api/v1/system/status?apikey=$PROWLARR_KEY" || echo "ERROR: Prowlarr API failed"

# Expected: All containers healthy, all APIs responding with generated credentials
```

### Level 4: Security and Persistence Validation

```bash
# Validate no sensitive data in new configurations
grep -r "password\|secret\|key" ./config/ --exclude="*.log" --exclude="*.db" || echo "No hardcoded secrets found (good)"

# Test configuration persistence across restarts
docker-compose restart
sleep 30
docker-compose ps --format "table {{.Name}}\t{{.Status}}"

# Validate backup and recovery
scripts/init-container.sh backup
rm -rf ./config/*/.initialized ./config/*/config.xml
docker-compose restart
sleep 60
[ -f ./config/sonarr/config.xml ] || echo "ERROR: Configuration not restored"

# Test fresh deployment scenario
mv config config.backup
docker-compose up -d
sleep 60
docker-compose ps --format "table {{.Name}}\t{{.Status}}"

# Expected: Services recover gracefully, configurations persist, fresh deployment works
```

## Final Validation Checklist

### Security Validation
- [ ] Git repository contains zero sensitive data patterns
- [ ] All exposed API keys and credentials revoked
- [ ] GitHub contacted for server-side cleanup if repository was public
- [ ] No hardcoded secrets in generated configurations
- [ ] All runtime secrets generated securely with proper entropy

### Functional Validation  
- [ ] Standard build succeeds: `docker-compose up -d`
- [ ] PIA VPN build succeeds: `docker-compose -f docker-compose.yml -f docker-compose.pia.yml up -d`
- [ ] All containers achieve "Healthy" status within 5 minutes
- [ ] Configuration templates generate valid service configurations
- [ ] API endpoints respond with generated credentials
- [ ] Services maintain functionality equivalent to original setup

### Architecture Validation
- [ ] Template system separates static configuration from runtime secrets
- [ ] Container initialization follows existing s6-overlay patterns
- [ ] Volume mapping preserves existing Docker configuration structure  
- [ ] VPN provider overrides maintain compatibility
- [ ] Static content preserved (Prowlarr definitions, nginx config, VPN scripts)

### Deployment Validation
- [ ] Fresh clone can be deployed without manual configuration
- [ ] Configuration changes persist across container restarts  
- [ ] Backup and recovery procedures work correctly
- [ ] .gitignore prevents future sensitive data commits
- [ ] Documentation enables team members to deploy independently

---

## Anti-Patterns to Avoid

- ❌ Don't skip Git history validation - sensitive data in history is still exposed
- ❌ Don't break existing volume mapping patterns - will cause deployment failures
- ❌ Don't generate weak secrets - use cryptographically secure random generation
- ❌ Don't overwrite existing runtime configurations during restart
- ❌ Don't commit any files containing actual secrets to Git
- ❌ Don't change network topology without testing VPN provider overrides
- ❌ Don't skip service-specific validation - each has unique configuration requirements

**Priority Confidence Score: 9/10** - Critical security issue with well-researched implementation path and comprehensive validation framework.