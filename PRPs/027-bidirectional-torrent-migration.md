name: "Bidirectional Torrent Migration Script (Transmission ↔ qBittorrent)"
description: |
  Two-way migration utility enabling seamless torrent transfer between Transmission and qBittorrent
  with metadata preservation and validation workflow.

---

## Goal

**Feature Goal**: Create a production-ready bidirectional torrent migration script that enables users to migrate torrents between Transmission and qBittorrent in either direction while preserving critical metadata, download paths, and torrent state.

**Deliverable**:
- Python-based CLI migration tool (`scripts/torrent-migration/migrate.py`)
- Configuration template for easy setup
- Validation script demonstrating successful round-trip migration
- Documentation for usage and troubleshooting

**Success Definition**:
- Successfully migrate existing Transmission test torrents to qBittorrent
- Successfully reverse-migrate those same torrents back to Transmission
- Preserve metadata: added dates, labels/tags, download paths, tracker info
- Handle both complete and incomplete torrents correctly
- Provide clear error messages and validation feedback
- Simple one-command operation for non-technical users

## User Persona

**Target User**: System administrator or power user managing torrent clients in Docker environment

**Use Case**:
- Migrating from one torrent client to another without losing seeding history
- Testing different torrent clients with existing downloads
- Switching between clients based on features or performance needs
- Disaster recovery or client-specific troubleshooting

**User Journey**:
1. User has active torrents in Transmission (or qBittorrent)
2. User runs migration script with simple command
3. Script validates configuration and client connectivity
4. Script exports torrents from source client
5. Script imports torrents to destination client with metadata
6. User validates migration success via provided validation script
7. User can reverse migration if needed

**Pain Points Addressed**:
- Manual torrent re-addition is time-consuming and error-prone
- Loss of seeding ratios and tracker state during client switches
- Incomplete torrents require manual path mapping
- No existing foolproof two-way migration solution

## Why

- **Business value**: Enables flexibility in torrent client choice without migration penalty
- **Integration**: Leverages existing Docker setup with both Transmission and qBittorrent configured
- **Problems solved**:
  - Eliminates manual torrent re-addition for users switching clients
  - Preserves seeding ratios and upload statistics
  - Maintains download paths for media automation workflows (Sonarr/Radarr)
  - Provides safety through bidirectional capability (can always roll back)

## What

A Python-based CLI tool that:

### Core Features
1. **Bidirectional Migration**
   - Transmission → qBittorrent migration
   - qBittorrent → Transmission migration
   - Single script handles both directions

2. **Metadata Preservation**
   - Download paths (critical for Sonarr/Radarr integration)
   - Added dates and timestamps
   - Labels → Tags (Transmission labels become qBittorrent tags)
   - Categories (if applicable)
   - Tracker information
   - Torrent state (paused/active)

3. **Data Handling**
   - Complete torrents: Skip hash checking (fast migration)
   - Incomplete torrents: Preserve download progress where possible
   - Torrent file export/import
   - Path validation and mapping

4. **User Experience**
   - Config file for connection settings
   - CLI with clear progress indicators
   - Dry-run mode for safety
   - Comprehensive error handling with helpful messages
   - Validation script to verify migration success

### Success Criteria

- [ ] Script successfully connects to both Transmission and qBittorrent APIs
- [ ] Migrates 100+ test Transmission torrents to qBittorrent preserving paths
- [ ] Successfully reverse-migrates torrents back to Transmission
- [ ] Preserves labels/tags bidirectionally
- [ ] Complete torrents skip hash checking (verified by quick re-seed)
- [ ] Incomplete torrents maintain download progress indicators
- [ ] Validation script confirms all torrents migrated correctly
- [ ] Clear error messages for common failure scenarios
- [ ] Documentation enables non-technical user to run migration

## All Needed Context

### Context Completeness Check

_"If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"_

✅ Yes - this PRP provides:
- Three reference implementations with different approaches
- Complete API documentation for both clients
- Existing codebase patterns for scripts and validation
- Specific test data location
- Docker configuration context
- Validation patterns from existing codebase

### Documentation & References

```yaml
# MUST READ - Include these in your context window

- url: https://qbittorrent-api.readthedocs.io/en/latest/
  why: Official Python API client for qBittorrent operations
  critical: |
    - torrents_add() method with is_skip_checking=True for complete torrents
    - torrents_export() method to export .torrent files
    - torrents_info() to get torrent metadata
    - Connection and authentication patterns

- url: https://transmission-rpc.readthedocs.io/en/stable/
  why: Official Python RPC client for Transmission operations
  critical: |
    - Client connection with protocol, host, port, path parameters
    - get_torrents() method returns torrent objects with full metadata
    - add_torrent() method for importing torrents
    - Torrent properties: download_dir, hashString, name, trackers

- url: https://github.com/undertheironbridge/transmission2qbt
  why: Reference implementation for Transmission→qBittorrent with metadata preservation
  critical: |
    - Shows how to preserve "added date" and transfer progress
    - Demonstrates label→tag conversion
    - Highlights requirement to shutdown clients during migration
    - Shows .part file handling for incomplete torrents
    - GOTCHA: Requires fastresume files, not SQLite database mode

- url: https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)
  why: Official qBittorrent Web API specification
  critical: |
    - Authentication flow
    - Torrent management endpoints
    - Category and tag management
    - Download path handling

- url: https://github.com/transmission/transmission/blob/main/docs/rpc-spec.md
  why: Official Transmission RPC specification
  critical: |
    - Torrent-get method fields
    - Torrent-add method parameters
    - Session and torrent statistics
    - Error codes and handling

- file: /home/dustin/src/transmission-to-qbittorrent/main.py
  why: Working example using API-based approach (cleaner than fastresume parsing)
  pattern: |
    - Config-driven with JSON config file
    - API connection establishment and validation
    - Torrent iteration and metadata extraction
    - Path preservation: uses tr_torrent.download_dir
    - Skip checking flag: is_skip_checking parameter
  gotcha: |
    - Requires access to Transmission's .torrent file directory
    - Uses sleep(1) between additions to avoid overwhelming client
    - Must pause torrents in source before migration

- file: /home/dustin/src/qBittorrent_to_Transmission/qbit.py
  why: Simple qBittorrent export approach using watch folders
  pattern: |
    - Uses qbittorrentapi.Client for connection
    - Exports .torrent files via torrents_export()
    - Simple watch folder pattern for Transmission import
    - State checking: torrent.state_enum.is_uploading/is_complete
  gotcha: |
    - Watch folder approach doesn't preserve metadata
    - Deletes from qBittorrent after export (destructive)
    - No path mapping or validation

- file: /home/dustin/projects/torrents/scripts/validate-qbittorrent-categories.sh
  why: Example of validation script pattern in this codebase
  pattern: |
    - Health check validation approach
    - Clear success/failure reporting
    - Runs within Docker context
  gotcha: Validation scripts run from host, not inside containers

- file: /home/dustin/projects/torrents/docker-compose.yml
  why: Understanding service configuration and network isolation
  pattern: |
    - Both qBittorrent and Transmission use network_mode: "container:vpn"
    - VPN isolation for torrent traffic
    - Service dependencies and health checks
  gotcha: |
    - Network isolation means API access requires port mapping
    - Services depend on VPN container health
    - Environment variables control ports and paths

- data: /home/dustin/projects/torrents/config/transmission/torrents/
  why: Location of test data - 100+ existing .torrent files for validation
  pattern: Transmission stores .torrent files as <hash>.torrent
  gotcha: Need to correlate .torrent files with actual downloaded data

- data: /home/dustin/projects/torrents/data/downloads/
  why: Location of downloaded torrent data for validation
  pattern: |
    - complete/ subdirectory for finished downloads
    - incomplete/ subdirectory for partial downloads
  gotcha: Path mapping critical - Transmission paths must work in qBittorrent
```

### Current Codebase tree

```bash
/home/dustin/projects/torrents/
├── scripts/
│   ├── qbittorrent-entrypoint.sh
│   ├── transmission-entrypoint.sh
│   ├── validate-qbittorrent-categories.sh
│   ├── validate-media-pipeline.sh
│   └── ... (other service scripts)
├── config/
│   ├── transmission/
│   │   ├── torrents/           # 100+ .torrent files for testing
│   │   └── transmission-daemon/
│   │       └── settings.json
│   └── qbittorrent/            # (may not exist yet)
├── data/
│   └── downloads/
│       ├── complete/           # Completed torrent data
│       └── incomplete/         # Partial downloads
├── docker-compose.yml
└── .env

# Reference implementations (outside project):
~/src/transmission-to-qbittorrent/
├── main.py                     # API-based migration
├── config.json.template
└── requirements.txt

~/src/qBittorrent_to_Transmission/
├── qbit.py                     # Watch folder export
└── README.md
```

### Desired Codebase tree with files to be added and responsibility of file

```bash
/home/dustin/projects/torrents/
├── scripts/
│   └── torrent-migration/      # NEW: Migration tool directory
│       ├── migrate.py          # NEW: Main CLI script - entry point for migration
│       ├── config.json.template # NEW: Configuration template with connection details
│       ├── requirements.txt    # NEW: Python dependencies (qbittorrent-api, transmission-rpc)
│       ├── README.md           # NEW: User documentation and usage guide
│       ├── lib/                # NEW: Core migration logic
│       │   ├── __init__.py
│       │   ├── qbittorrent_handler.py  # qBittorrent API operations
│       │   ├── transmission_handler.py # Transmission RPC operations
│       │   ├── migrator.py     # Bidirectional migration orchestration
│       │   └── utils.py        # Common utilities (path mapping, validation)
│       ├── test-migration.sh   # NEW: Validation script for round-trip testing
│       └── .migration-state/   # NEW: Runtime directory for temporary .torrent files
└── (existing structure unchanged)
```

### Known Gotchas of our codebase & Library Quirks

```python
# CRITICAL: Docker Network Isolation
# Both qBittorrent and Transmission use network_mode: "container:vpn"
# API connections must use mapped ports from VPN container, not direct service ports
# Solution: Connection via localhost with mapped ports (e.g., localhost:8080 for qBittorrent)

# CRITICAL: qbittorrent-api Authentication
# Library handles session cookies automatically but requires login first
# Example: client.auth_log_in() after instantiation
# GOTCHA: Connection will appear successful but operations fail without auth

# CRITICAL: transmission-rpc Path Handling
# Transmission uses absolute paths inside container
# Paths like /downloads/complete must match between Transmission and qBittorrent containers
# GOTCHA: Path mismatch causes qBittorrent to fail hash checking

# CRITICAL: Torrent File Access
# Transmission stores .torrent files in config directory as <hash>.torrent
# qBittorrent can export .torrent files via API (torrents_export method)
# GOTCHA: Both clients must be accessible from script (volume mounts or API export)

# LIBRARY: qbittorrent-api torrents_add() parameters
# is_skip_checking=True: REQUIRED for complete torrents to avoid re-hash
# is_paused=True: Recommended to add torrents paused for safety
# save_path: Must match original download path exactly
# tags: Use for preserving Transmission labels

# LIBRARY: transmission-rpc Client instantiation
# Requires: protocol, host, port, path (usually '/transmission/rpc')
# GOTCHA: path parameter is NOT optional for Transmission web interface
# Example: Client(protocol='http', host='localhost', port=9091, path='/transmission/rpc')

# LIBRARY: Torrent State Handling
# Both clients pause/resume torrents - coordinate state during migration
# CRITICAL: Pause source torrents before migration to prevent download/upload during transfer
# Resume destination torrents after migration validation

# CRITICAL: Complete vs Incomplete Torrents
# Complete torrents: Use is_skip_checking=True (fast)
# Incomplete torrents: May need hash checking to resume properly
# GOTCHA: .part files in Transmission don't exist in qBittorrent format

# CRITICAL: Concurrent Operations
# Both clients rate-limit API calls
# Use time.sleep(0.1-1) between bulk operations
# GOTCHA: Too many rapid calls cause connection errors or client slowdowns
```

## Implementation Blueprint

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE scripts/torrent-migration/requirements.txt
  - IMPLEMENT: Python dependencies list
  - INCLUDE: qbittorrent-api, transmission-rpc
  - NAMING: Standard requirements.txt format
  - PLACEMENT: scripts/torrent-migration/requirements.txt
  - DEPENDENCIES: None (first task)

Task 2: CREATE scripts/torrent-migration/config.json.template
  - IMPLEMENT: Configuration template with placeholders
  - FOLLOW pattern: /home/dustin/src/transmission-to-qbittorrent/config.json.template
  - STRUCTURE: JSON with qbittorrent and transmission sections
  - FIELDS: host, port, username, password for both clients
  - PLACEMENT: scripts/torrent-migration/config.json.template
  - DEPENDENCIES: None

Task 3: CREATE scripts/torrent-migration/lib/__init__.py
  - IMPLEMENT: Empty init file for Python package
  - NAMING: Standard Python package convention
  - PLACEMENT: scripts/torrent-migration/lib/__init__.py
  - DEPENDENCIES: None

Task 4: CREATE scripts/torrent-migration/lib/utils.py
  - IMPLEMENT: Common utility functions
  - FUNCTIONS:
    - load_config(path) -> dict: Load and validate JSON config
    - validate_path(path) -> bool: Check if path exists
    - normalize_path(path) -> str: Normalize path format
    - create_temp_dir() -> str: Create temporary directory for .torrent files
  - FOLLOW pattern: Error handling with clear messages
  - NAMING: snake_case function names
  - PLACEMENT: scripts/torrent-migration/lib/utils.py
  - DEPENDENCIES: Task 3 (package init)

Task 5: CREATE scripts/torrent-migration/lib/qbittorrent_handler.py
  - IMPLEMENT: QBittorrentHandler class
  - FOLLOW pattern: /home/dustin/src/qBittorrent_to_Transmission/qbit.py (API connection)
  - FOLLOW pattern: /home/dustin/src/transmission-to-qbittorrent/main.py (connection validation)
  - METHODS:
    - __init__(config): Initialize client with auth
    - connect() -> bool: Connect and authenticate
    - get_torrents() -> list: Get all torrents with metadata
    - export_torrent(hash, path) -> str: Export .torrent file
    - add_torrent(torrent_file, metadata) -> bool: Add with metadata preservation
    - pause_torrent(hash): Pause torrent
    - resume_torrent(hash): Resume torrent
  - CRITICAL: Use auth_log_in() after client instantiation
  - CRITICAL: Include is_skip_checking parameter in add_torrent
  - NAMING: QBittorrentHandler class, snake_case methods
  - PLACEMENT: scripts/torrent-migration/lib/qbittorrent_handler.py
  - DEPENDENCIES: Task 4 (utils)

Task 6: CREATE scripts/torrent-migration/lib/transmission_handler.py
  - IMPLEMENT: TransmissionHandler class
  - FOLLOW pattern: /home/dustin/src/transmission-to-qbittorrent/main.py (RPC connection)
  - METHODS:
    - __init__(config): Initialize RPC client
    - connect() -> bool: Connect and validate
    - get_torrents() -> list: Get all torrents with metadata
    - get_torrent_file(hash) -> str: Get path to .torrent file
    - add_torrent(torrent_file, metadata) -> bool: Add with metadata
    - pause_torrent(id): Pause torrent
    - resume_torrent(id): Resume torrent
  - CRITICAL: Include protocol, host, port, path in Client instantiation
  - CRITICAL: Transmission .torrent files in config/transmission/torrents/<hash>.torrent
  - NAMING: TransmissionHandler class, snake_case methods
  - PLACEMENT: scripts/torrent-migration/lib/transmission_handler.py
  - DEPENDENCIES: Task 4 (utils)

Task 7: CREATE scripts/torrent-migration/lib/migrator.py
  - IMPLEMENT: Migrator class for bidirectional migration
  - METHODS:
    - __init__(qb_handler, tr_handler, temp_dir): Initialize with both handlers
    - migrate_transmission_to_qbittorrent(dry_run=False) -> dict: Migrate TR→QB
    - migrate_qbittorrent_to_transmission(dry_run=False) -> dict: Migrate QB→TR
    - _migrate_torrent(source_torrent, dest_handler) -> bool: Single torrent migration
    - _map_metadata(source_torrent, dest_client) -> dict: Map metadata between clients
    - generate_report() -> str: Generate migration report
  - FOLLOW pattern: Label→Tag conversion from transmission2qbt
  - CRITICAL: Pause source torrents before migration
  - CRITICAL: Preserve download paths exactly
  - CRITICAL: Skip checking for complete torrents
  - NAMING: Migrator class, snake_case methods
  - PLACEMENT: scripts/torrent-migration/lib/migrator.py
  - DEPENDENCIES: Task 5, Task 6 (both handlers)

Task 8: CREATE scripts/torrent-migration/migrate.py
  - IMPLEMENT: Main CLI script with argparse
  - FOLLOW pattern: Config-driven approach from reference implementations
  - CLI OPTIONS:
    - --config: Path to config.json (default: ./config.json)
    - --direction: "tr2qb" or "qb2tr"
    - --dry-run: Preview migration without executing
    - --pause-source: Pause torrents in source (default: True)
    - --resume-dest: Resume torrents in destination (default: False)
    - --verbose: Detailed logging
  - WORKFLOW:
    1. Load and validate configuration
    2. Initialize handlers for both clients
    3. Test connections
    4. Initialize migrator
    5. Execute migration with progress tracking
    6. Display summary report
  - ERROR HANDLING: Clear error messages for common failures
  - NAMING: Main function: main(), CLI entry point
  - PLACEMENT: scripts/torrent-migration/migrate.py
  - DEPENDENCIES: Task 7 (migrator and all libs)

Task 9: CREATE scripts/torrent-migration/test-migration.sh
  - IMPLEMENT: Bash validation script for round-trip testing
  - FOLLOW pattern: /home/dustin/projects/torrents/scripts/validate-qbittorrent-categories.sh
  - WORKFLOW:
    1. Check config.json exists
    2. Check both clients are accessible
    3. Get initial torrent counts
    4. Run TR→QB migration
    5. Validate torrents in qBittorrent
    6. Run QB→TR reverse migration
    7. Validate torrents back in Transmission
    8. Compare metadata preservation
  - OUTPUT: Clear success/failure reporting
  - NAMING: test-migration.sh
  - PLACEMENT: scripts/torrent-migration/test-migration.sh
  - DEPENDENCIES: Task 8 (migrate.py)

Task 10: CREATE scripts/torrent-migration/README.md
  - IMPLEMENT: User documentation
  - SECTIONS:
    - Overview and features
    - Prerequisites and setup
    - Configuration guide
    - Usage examples (both directions)
    - Troubleshooting common issues
    - Validation and testing
  - FOLLOW pattern: Clear, step-by-step instructions
  - INCLUDE: Example config.json with explanations
  - NAMING: README.md
  - PLACEMENT: scripts/torrent-migration/README.md
  - DEPENDENCIES: Task 8 (all implementation complete)
```

### Implementation Patterns & Key Details

```python
# QBittorrent Connection and Export Pattern
import qbittorrentapi

class QBittorrentHandler:
    def __init__(self, config):
        self.client = qbittorrentapi.Client(
            host=config['host'],
            port=config['port'],
            username=config['username'],
            password=config['password']
        )

    def connect(self):
        # CRITICAL: Must call auth_log_in() for operations to work
        try:
            self.client.auth_log_in()
            return True
        except qbittorrentapi.LoginFailed:
            return False

    def export_torrent(self, torrent_hash, output_dir):
        # Export .torrent file using API
        torrent_data = self.client.torrents_export(torrent_hash=torrent_hash)
        output_path = f"{output_dir}/{torrent_hash}.torrent"
        with open(output_path, 'wb') as f:
            f.write(torrent_data)
        return output_path

    def add_torrent(self, torrent_file, save_path, is_complete=True, tags=None):
        # CRITICAL: is_skip_checking=True for complete torrents
        self.client.torrents_add(
            torrent_files=open(torrent_file, 'rb'),
            save_path=save_path,
            is_skip_checking=is_complete,  # Skip hash check for complete
            is_paused=True,  # Add paused for safety
            tags=tags or []  # Preserve labels as tags
        )

# Transmission Connection and Metadata Pattern
import transmission_rpc

class TransmissionHandler:
    def __init__(self, config):
        # CRITICAL: Must include 'path' parameter
        self.client = transmission_rpc.Client(
            protocol=config['protocol'],
            host=config['host'],
            port=config['port'],
            path=config.get('path', '/transmission/rpc'),
            username=config.get('username'),
            password=config.get('password')
        )

    def get_torrents(self):
        torrents = self.client.get_torrents()
        # Each torrent has: name, hashString, download_dir, trackers, etc.
        return torrents

    def get_torrent_file_path(self, torrent_hash):
        # PATTERN: Transmission stores as <hash>.torrent in config directory
        # In Docker: /config/transmission/torrents/<hash>.torrent
        # From host: config/transmission/torrents/<hash>.torrent
        return f"config/transmission/torrents/{torrent_hash}.torrent"

# Bidirectional Migration Pattern
class Migrator:
    def migrate_transmission_to_qbittorrent(self, dry_run=False):
        # 1. Get all torrents from Transmission
        tr_torrents = self.tr_handler.get_torrents()

        results = {'success': [], 'failed': []}

        for torrent in tr_torrents:
            # 2. Pause in Transmission (prevent state changes during migration)
            if not dry_run:
                torrent.stop()

            # 3. Get .torrent file
            torrent_file = self.tr_handler.get_torrent_file_path(torrent.hashString)

            # 4. Map metadata (labels → tags)
            metadata = {
                'save_path': torrent.download_dir,  # CRITICAL: Preserve path
                'tags': self._convert_labels_to_tags(torrent),
                'is_complete': torrent.percent_done == 1.0
            }

            # 5. Add to qBittorrent
            if not dry_run:
                try:
                    self.qb_handler.add_torrent(torrent_file, **metadata)
                    results['success'].append(torrent.name)
                    time.sleep(0.5)  # CRITICAL: Rate limiting
                except Exception as e:
                    results['failed'].append((torrent.name, str(e)))

        return results

# Config Loading Pattern
import json

def load_config(config_path='config.json'):
    try:
        with open(config_path, 'r') as f:
            config = json.load(f)

        # Validate required fields
        required_qb = ['host', 'port', 'username', 'password']
        required_tr = ['protocol', 'host', 'port']

        for field in required_qb:
            if field not in config.get('qbittorrent', {}):
                raise ValueError(f"Missing qbittorrent.{field} in config")

        for field in required_tr:
            if field not in config.get('transmission', {}):
                raise ValueError(f"Missing transmission.{field} in config")

        return config
    except FileNotFoundError:
        print("ERROR: config.json not found. Copy config.json.template and fill in your values.")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid JSON in config.json: {e}")
        sys.exit(1)
```

### Integration Points

```yaml
PYTHON_DEPENDENCIES:
  - install: "pip install -r scripts/torrent-migration/requirements.txt"
  - libraries: ["qbittorrent-api", "transmission-rpc"]

CONFIG:
  - create: scripts/torrent-migration/config.json
  - based_on: config.json.template
  - contains: Connection details for both qBittorrent and Transmission

DOCKER_SERVICES:
  - ensure_running: qBittorrent and Transmission containers
  - access_method: Via mapped ports (localhost:8080, localhost:9091)
  - validation: Health checks before migration

FILE_SYSTEM:
  - temp_directory: scripts/torrent-migration/.migration-state/
  - torrent_files: Temporary storage during migration
  - cleanup: Remove after successful migration
```

## Validation Loop

### Level 1: Syntax & Dependencies (Immediate Feedback)

```bash
# Run after creating Python files - fix before proceeding
cd scripts/torrent-migration

# Install dependencies
pip install -r requirements.txt

# Check Python syntax
python3 -m py_compile migrate.py
python3 -m py_compile lib/*.py

# Expected: No syntax errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Connection Testing (Component Validation)

```bash
# Test each handler independently
cd scripts/torrent-migration

# Create config.json from template
cp config.json.template config.json
# MANUAL: Edit config.json with actual connection details

# Test qBittorrent connection
python3 -c "
from lib.qbittorrent_handler import QBittorrentHandler
import json

config = json.load(open('config.json'))
qb = QBittorrentHandler(config['qbittorrent'])
if qb.connect():
    print('✓ qBittorrent connection successful')
    print(f'  Torrents: {len(qb.get_torrents())}')
else:
    print('✗ qBittorrent connection failed')
"

# Test Transmission connection
python3 -c "
from lib.transmission_handler import TransmissionHandler
import json

config = json.load(open('config.json'))
tr = TransmissionHandler(config['transmission'])
if tr.connect():
    print('✓ Transmission connection successful')
    print(f'  Torrents: {len(tr.get_torrents())}')
else:
    print('✗ Transmission connection failed')
"

# Expected: Both connections successful with torrent counts displayed
```

### Level 3: Migration Testing (System Validation)

```bash
# Phase 1: Dry Run Validation
cd scripts/torrent-migration

# Test dry run (no actual migration)
python3 migrate.py --direction tr2qb --dry-run --verbose

# Expected output:
# - Configuration loaded successfully
# - Connected to both clients
# - Migration preview with torrent list
# - No actual changes made

# Phase 2: Forward Migration (Transmission → qBittorrent)
python3 migrate.py --direction tr2qb --pause-source --verbose

# Expected output:
# - Progress tracking for each torrent
# - Success/failure count
# - Migration summary report
# - No errors for complete torrents

# Validate qBittorrent received torrents
python3 -c "
from lib.qbittorrent_handler import QBittorrentHandler
import json

config = json.load(open('config.json'))
qb = QBittorrentHandler(config['qbittorrent'])
qb.connect()
torrents = qb.get_torrents()
print(f'qBittorrent now has {len(torrents)} torrents')
for t in torrents[:5]:
    print(f'  - {t.name} ({t.save_path})')
"

# Expected: All Transmission torrents now in qBittorrent with correct paths

# Phase 3: Reverse Migration (qBittorrent → Transmission)
python3 migrate.py --direction qb2tr --pause-source --verbose

# Expected output:
# - Same torrents migrated back
# - Metadata preserved
# - Migration summary shows success

# Validate Transmission received torrents back
python3 -c "
from lib.transmission_handler import TransmissionHandler
import json

config = json.load(open('config.json'))
tr = TransmissionHandler(config['transmission'])
tr.connect()
torrents = tr.get_torrents()
print(f'Transmission now has {len(torrents)} torrents')
for t in torrents[:5]:
    print(f'  - {t.name} ({t.download_dir})')
"

# Expected: All torrents back in Transmission with preserved paths
```

### Level 4: Automated Round-Trip Testing

```bash
# Use the validation script for comprehensive testing
cd scripts/torrent-migration
chmod +x test-migration.sh
./test-migration.sh

# Expected output:
# ✓ Configuration file exists
# ✓ qBittorrent accessible
# ✓ Transmission accessible
# Initial counts: TR=100, QB=0
# ✓ Migration TR→QB completed: 100 torrents
# ✓ Torrents verified in qBittorrent: 100
# ✓ Paths preserved: 100/100
# ✓ Migration QB→TR completed: 100 torrents
# ✓ Torrents verified in Transmission: 100
# ✓ Round-trip successful: All metadata preserved
#
# VALIDATION PASSED

# If any failures occur, script provides specific error details
```

### Level 5: Docker Integration Validation

```bash
# Ensure Docker services are running properly
cd /home/dustin/projects/torrents

# Check service health
docker compose ps

# Expected: Both qbittorrent and transmission containers healthy

# Verify VPN isolation maintained
docker compose exec vpn curl -s https://api.ipify.org
# Record VPN IP

docker compose exec qbittorrent curl -s https://api.ipify.org
# Should show VPN IP (not real IP)

# Verify migration doesn't break VPN isolation
cd scripts/torrent-migration
python3 migrate.py --direction tr2qb --verbose

# Re-check VPN isolation after migration
docker compose exec qbittorrent curl -s https://api.ipify.org
# Should still show VPN IP

# Expected: VPN isolation maintained, no IP leaks after migration
```

## Final Validation Checklist

### Technical Validation

- [ ] All Python files pass syntax checking
- [ ] Dependencies installed successfully: `pip install -r requirements.txt`
- [ ] qBittorrent handler connects and authenticates
- [ ] Transmission handler connects and retrieves torrents
- [ ] Dry run mode works without making changes
- [ ] Forward migration (TR→QB) completes successfully
- [ ] Reverse migration (QB→TR) completes successfully
- [ ] Round-trip test script passes all checks

### Feature Validation

- [ ] All success criteria from "What" section met
- [ ] 100+ test Transmission torrents migrate to qBittorrent
- [ ] Torrents successfully migrate back to Transmission
- [ ] Download paths preserved exactly in both directions
- [ ] Labels convert to tags (TR→QB) and back (QB→TR)
- [ ] Complete torrents skip hash checking (fast migration)
- [ ] Incomplete torrents handled correctly
- [ ] Torrent state (paused/active) preserved
- [ ] Tracker information maintained

### Code Quality Validation

- [ ] Follows existing codebase patterns for scripts (scripts/ directory)
- [ ] Configuration file pattern matches reference implementations
- [ ] Error messages are clear and actionable
- [ ] Progress tracking provides user feedback
- [ ] Code is documented with comments explaining critical sections
- [ ] Validation script provides comprehensive testing

### User Experience Validation

- [ ] README.md provides clear setup instructions
- [ ] config.json.template has explanatory comments
- [ ] CLI help text is clear: `python3 migrate.py --help`
- [ ] Dry run mode allows safe preview
- [ ] Error messages guide user to solutions
- [ ] Validation script confirms migration success
- [ ] Non-technical user can follow documentation

### Docker Integration Validation

- [ ] Migration works with Docker-based qBittorrent
- [ ] Migration works with Docker-based Transmission
- [ ] VPN isolation maintained after migration (no IP leaks)
- [ ] Network mode "container:vpn" doesn't block API access
- [ ] Services remain healthy after migration

### Documentation & Safety

- [ ] README includes prerequisites
- [ ] README includes troubleshooting section
- [ ] Documentation warns about pausing torrents
- [ ] Dry run mode documented as safety measure
- [ ] Backup recommendation included in docs

---

## Anti-Patterns to Avoid

- ❌ Don't skip authentication in qBittorrent handler - operations will silently fail
- ❌ Don't forget 'path' parameter in Transmission client - connection will fail
- ❌ Don't migrate without pausing source torrents - state corruption possible
- ❌ Don't skip path validation - mismatched paths cause hash check failures
- ❌ Don't use hardcoded credentials - always use config file
- ❌ Don't skip rate limiting between API calls - clients will throttle/fail
- ❌ Don't assume .torrent files are in expected location - validate first
- ❌ Don't mix complete/incomplete torrent handling - use different strategies
- ❌ Don't skip dry run testing - always test with --dry-run first
- ❌ Don't delete source torrents automatically - user should manually verify first
- ❌ Don't ignore failed migrations in batch - report and handle each failure
- ❌ Don't forget to preserve tags/labels - critical for organization

---

## PRP Confidence Score

**Confidence Score**: 9/10 for one-pass implementation success likelihood

**Rationale**:
- ✅ Three reference implementations provided (two local, one GitHub)
- ✅ Complete API documentation with specific methods
- ✅ Existing test data (100+ Transmission torrents)
- ✅ Docker environment already configured
- ✅ Clear validation patterns from existing codebase
- ✅ Comprehensive implementation tasks with dependencies
- ✅ Detailed code patterns for critical sections
- ✅ Known gotchas explicitly documented
- ⚠️ Minor risk: Docker network isolation might require troubleshooting

**What could cause failure**:
- Network configuration issues with VPN isolation
- Transmission .torrent file access permissions
- Path mapping differences between containers
- Client-specific version incompatibilities

**Mitigations**:
- Comprehensive Level 2 validation tests connections early
- Dry run mode allows testing without changes
- Clear error messages guide troubleshooting
- Validation script confirms round-trip success
