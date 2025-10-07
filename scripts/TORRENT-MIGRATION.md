# Torrent Sync Tool

Bidirectional synchronization between Transmission and qBittorrent with metadata preservation.

**Use cases:**
- **One-time migration**: Move your entire torrent library from one client to another
- **Bidirectional sync**: Keep both clients synchronized with new torrents added to either side
- **Backup/recovery**: Restore torrents from one client to another if data is lost

## Requirements

- Docker (only requirement - no Python installation needed)
- Running qBittorrent and Transmission instances

## Quick Start

1. **Create config file** `scripts/config.json`:
```json
{
  "qbittorrent": {
    "host": "localhost",
    "port": 8080,
    "username": "admin",
    "password": "your_password"
  },
  "transmission": {
    "protocol": "http",
    "host": "localhost",
    "port": 9091,
    "path": "/transmission/rpc",
    "username": "your_username",
    "password": "your_password",
    "torrent_dir": "/config/transmission/torrents"
  },
  "migration": {
    "skip_checking_complete": true,
    "pause_source": true,
    "resume_destination": false,
    "rate_limit_sleep": 0.5
  }
}
```

2. **Run sync/migration**:
```bash
# Dry run (recommended first)
./scripts/migrate.sh -d tr2qb -n

# One-time migration: Transmission → qBittorrent
./scripts/migrate.sh -d tr2qb

# Sync in reverse: qBittorrent → Transmission
./scripts/migrate.sh -d qb2tr

# Keep both in sync (run both directions)
./scripts/migrate.sh -d tr2qb && ./scripts/migrate.sh -d qb2tr
```

## How It Works

The `migrate.sh` wrapper runs the migration in a Docker container with Python pre-installed. No host dependencies required.

**What gets preserved:**
- Download paths
- Labels/tags (bidirectional conversion)
- Download progress and completion status
- Tracker URLs and torrent metadata
- Paused/active state

**Sync/migration process:**
1. Connects to both clients via API
2. Retrieves torrent list from source
3. Checks for duplicates in destination (by hash)
4. Skips torrents that already exist (enables safe repeated runs)
5. Exports .torrent files from source for new torrents
6. Adds new torrents to destination with metadata
7. Optionally pauses source torrents
8. Skips hash checking for complete torrents (fast sync)

**Duplicate detection:**
- Compares torrent hashes between clients
- Only syncs torrents that don't exist in destination
- Safe to run repeatedly - won't create duplicates
- Enables bidirectional sync workflow

## Options

```
-d, --direction {tr2qb,qb2tr}  Migration direction (required)
-n, --dry-run                  Show what would be migrated without making changes
-c, --config FILE              Custom config file path (default: scripts/config.json)
-v, --verbose                  Enable verbose output
-t, --temp-dir DIR             Temporary directory for .torrent files (default: .migration-state)
```

## Examples

```bash
# Preview what will be synced
./scripts/migrate.sh -d tr2qb -n
./scripts/migrate.sh --direction tr2qb --dry-run

# One-time migration: move everything from Transmission to qBittorrent
./scripts/migrate.sh -d tr2qb
./scripts/migrate.sh --direction tr2qb

# Ongoing sync: sync new torrents from qBittorrent back to Transmission
./scripts/migrate.sh -d qb2tr

# Full bidirectional sync (keeps both clients identical)
./scripts/migrate.sh -d tr2qb && ./scripts/migrate.sh -d qb2tr

# Use custom config
./scripts/migrate.sh -d qb2tr -c /path/to/config.json
./scripts/migrate.sh --direction qb2tr --config /path/to/config.json
```

## Troubleshooting

**Connection errors:**
- Verify qBittorrent/Transmission are running
- Check host/port settings in config.json
- For Docker containers, use `localhost` (script uses `--network host`)

**Authentication errors:**
- Verify username/password in config.json
- qBittorrent: Check Web UI credentials
- Transmission: Check settings.json credentials

**Torrent file errors:**
- Verify `torrent_dir` path in config.json for Transmission
- Ensure path is accessible from Docker container (mounted volume)

## Sync Workflow

For ongoing synchronization between clients:

1. **Initial setup**: Run both directions to establish baseline
   ```bash
   ./scripts/migrate.sh -d tr2qb  # Sync TR → QB
   ./scripts/migrate.sh -d qb2tr  # Sync QB → TR
   ```

2. **Regular sync**: After adding new torrents to either client
   ```bash
   # Added torrents to Transmission? Sync to qBittorrent
   ./scripts/migrate.sh -d tr2qb

   # Added torrents to qBittorrent? Sync to Transmission
   ./scripts/migrate.sh -d qb2tr

   # Or sync both ways to ensure full sync
   ./scripts/migrate.sh -d tr2qb && ./scripts/migrate.sh -d qb2tr
   ```

3. **Automated sync**: Add to cron for automatic synchronization
   ```bash
   # Example: Sync both ways every hour
   0 * * * * cd /home/dustin/projects/torrents && ./scripts/migrate.sh -d tr2qb && ./scripts/migrate.sh -d qb2tr
   ```

## Technical Notes

- **Complete torrents:** Hash checking skipped by default (controlled by `skip_checking_complete`)
- **Incomplete torrents:** Added with current progress, hash checking runs automatically
- **Duplicates:** Automatically detected by hash and skipped (safe for repeated runs)
- **Labels → Tags:** Transmission labels convert to qBittorrent tags (and vice versa)
- **Rate limiting:** Small delay between operations to prevent API overload (`rate_limit_sleep`)
- **Missing .torrent files:** Torrents added via magnet links may not have .torrent files yet and will be skipped

## Files

- `migrate.sh` - Docker wrapper script (only file you need to run)
- `migrate-torrents.py` - Python migration logic (runs inside Docker)
- `config.json` - Your configuration (create from example above)
- `README.md` - This file
