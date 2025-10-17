#!/usr/bin/env python3
"""
Bidirectional Torrent Migration Tool
Migrate torrents between Transmission and qBittorrent while preserving metadata.

Usage:
    ./migrate-torrents.py --direction tr2qb --dry-run     # Preview migration
    ./migrate-torrents.py --direction tr2qb               # Migrate Transmission → qBittorrent
    ./migrate-torrents.py --direction qb2tr               # Migrate qBittorrent → Transmission

Requirements:
    pip install qbittorrent-api>=2024.1.59 transmission-rpc>=7.0.3 python3-libtorrent

Configuration:
    Create config.json with connection details (see config.json.template)
"""

import argparse
import base64
import json
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import qbittorrentapi
import transmission_rpc


# ============================================================================
# Utility Functions
# ============================================================================

def load_config(config_path: str = 'config.json') -> Dict[str, Any]:
    """Load and validate configuration from JSON file."""
    try:
        with open(config_path, 'r') as f:
            config = json.load(f)

        # Validate required qBittorrent fields
        required_qb = ['host', 'port', 'username', 'password']
        for field in required_qb:
            if field not in config.get('qbittorrent', {}):
                raise ValueError(f"Missing qbittorrent.{field} in config")

        # Validate required Transmission fields
        required_tr = ['protocol', 'host', 'port', 'path', 'torrent_dir']
        for field in required_tr:
            if field not in config.get('transmission', {}):
                raise ValueError(f"Missing transmission.{field} in config")

        # Set defaults for migration settings
        if 'migration' not in config:
            config['migration'] = {}

        config['migration'].setdefault('skip_checking_complete', True)
        config['migration'].setdefault('pause_source', True)
        config['migration'].setdefault('resume_destination', False)
        config['migration'].setdefault('rate_limit_sleep', 0.5)

        return config

    except FileNotFoundError:
        print(f"ERROR: {config_path} not found.")
        print(f"Copy config.json.template to {config_path} and fill in your values.")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid JSON in {config_path}: {e}")
        sys.exit(1)
    except ValueError as e:
        print(f"ERROR: Configuration validation failed: {e}")
        sys.exit(1)


def create_temp_dir(base_dir: str = '.migration-state') -> str:
    """Create temporary directory for .torrent files during migration."""
    temp_path = Path(base_dir)
    temp_path.mkdir(exist_ok=True)
    return str(temp_path.absolute())


def print_progress(current: int, total: int, torrent_name: str, max_name_length: int = 50):
    """Print migration progress."""
    if len(torrent_name) > max_name_length:
        display_name = torrent_name[:max_name_length-3] + "..."
    else:
        display_name = torrent_name

    percentage = (current / total * 100) if total > 0 else 0
    print(f"[{current}/{total}] ({percentage:.1f}%) {display_name}")


# ============================================================================
# qBittorrent Handler
# ============================================================================

class QBittorrentHandler:
    """Handler for qBittorrent API operations."""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.client = None
        self.connected = False

    def connect(self) -> bool:
        """Connect to qBittorrent and authenticate."""
        try:
            self.client = qbittorrentapi.Client(
                host=self.config['host'],
                port=self.config['port'],
                username=self.config['username'],
                password=self.config['password']
            )

            # CRITICAL: Must call auth_log_in() for operations to work
            self.client.auth_log_in()

            # Verify connection by getting version
            version = self.client.app.version
            print(f"✓ Connected to qBittorrent {version}")
            self.connected = True
            return True

        except qbittorrentapi.LoginFailed:
            print("✗ qBittorrent login failed - check username/password")
            return False
        except qbittorrentapi.APIConnectionError as e:
            print(f"✗ qBittorrent connection failed: {e}")
            print(f"  Make sure qBittorrent is running at {self.config['host']}:{self.config['port']}")
            return False
        except Exception as e:
            print(f"✗ Unexpected error connecting to qBittorrent: {e}")
            return False

    def get_torrents(self) -> List[Any]:
        """Get all torrents from qBittorrent."""
        if not self.connected:
            raise RuntimeError("Not connected to qBittorrent. Call connect() first.")

        try:
            return self.client.torrents_info()
        except Exception as e:
            print(f"✗ Error getting torrents from qBittorrent: {e}")
            raise

    def export_torrent(self, torrent_hash: str, output_dir: str) -> str:
        """Export .torrent file from qBittorrent."""
        if not self.connected:
            raise RuntimeError("Not connected to qBittorrent. Call connect() first.")

        try:
            torrent_data = self.client.torrents_export(torrent_hash=torrent_hash)
            output_path = Path(output_dir) / f"{torrent_hash}.torrent"
            with open(output_path, 'wb') as f:
                f.write(torrent_data)
            return str(output_path)
        except Exception as e:
            print(f"✗ Error exporting torrent {torrent_hash}: {e}")
            raise

    def add_torrent(
        self,
        torrent_file: str,
        save_path: str,
        is_complete: bool = True,
        tags: Optional[List[str]] = None,
        category: Optional[str] = None,
        is_paused: bool = True
    ) -> bool:
        """Add torrent to qBittorrent with metadata preservation."""
        if not self.connected:
            raise RuntimeError("Not connected to qBittorrent. Call connect() first.")

        try:
            if torrent_file == "MAGNET_FILE":
                # Add as magnet link
                if hasattr(self, '_current_magnet_file'):
                    with open(self._current_magnet_file, 'r') as f:
                        magnet_link = f.read().strip()

                    self.client.torrents_add(
                        urls=magnet_link,
                        save_path=save_path,
                        is_paused=is_paused,
                        tags=tags or [],
                        category=category or ""
                    )
                    print(f"  ✓ Added magnet link to qBittorrent")
                else:
                    raise ValueError("MAGNET_FILE specified but no magnet file available")
            else:
                # Add as torrent file
                with open(torrent_file, 'rb') as f:
                    # CRITICAL: is_skip_checking=True for complete torrents to avoid re-hash
                    self.client.torrents_add(
                        torrent_files=f,
                        save_path=save_path,
                        is_skip_checking=is_complete,  # Skip hash check for complete torrents
                        is_paused=is_paused,  # Add paused for safety
                        tags=tags or [],  # Preserve labels as tags
                        category=category or ""
                    )
                    print(f"  ✓ Added torrent file to qBittorrent")
            return True
        except Exception as e:
            print(f"✗ Error adding torrent from {torrent_file}: {e}")
            return False

    def pause_torrent(self, torrent_hash: str) -> bool:
        """Pause a torrent."""
        if not self.connected:
            raise RuntimeError("Not connected to qBittorrent. Call connect() first.")

        try:
            self.client.torrents_pause(torrent_hashes=torrent_hash)
            return True
        except Exception as e:
            print(f"✗ Error pausing torrent {torrent_hash}: {e}")
            return False


# ============================================================================
# Transmission Handler
# ============================================================================

class TransmissionHandler:
    """Handler for Transmission RPC operations."""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.client = None
        self.connected = False

    def connect(self) -> bool:
        """Connect to Transmission RPC."""
        try:
            # CRITICAL: Must include 'path' parameter for Transmission web interface
            self.client = transmission_rpc.Client(
                protocol=self.config['protocol'],
                host=self.config['host'],
                port=self.config['port'],
                path=self.config['path'],
                username=self.config.get('username') or None,
                password=self.config.get('password') or None
            )

            # Verify connection by getting session
            session = self.client.get_session()
            version = session.version if hasattr(session, 'version') else 'unknown'
            print(f"✓ Connected to Transmission (version: {version})")
            self.connected = True
            return True

        except transmission_rpc.error.TransmissionAuthError:
            print("✗ Transmission authentication failed - check username/password")
            return False
        except transmission_rpc.error.TransmissionConnectError as e:
            print(f"✗ Transmission connection failed: {e}")
            print(f"  Make sure Transmission is running at {self.config['protocol']}://{self.config['host']}:{self.config['port']}{self.config['path']}")
            return False
        except Exception as e:
            print(f"✗ Unexpected error connecting to Transmission: {e}")
            return False

    def get_torrents(self) -> List[Any]:
        """Get all torrents from Transmission."""
        if not self.connected:
            raise RuntimeError("Not connected to Transmission. Call connect() first.")

        try:
            return self.client.get_torrents()
        except Exception as e:
            print(f"✗ Error getting torrents from Transmission: {e}")
            raise

    def get_torrent_file_path(self, torrent_hash: str, torrent_name: str = "") -> str:
        """Get path to .torrent file for a given hash, handling both .torrent and .magnet files."""
        torrent_dir = Path(self.config['torrent_dir']).expanduser().resolve()

        # First try .torrent file
        torrent_file = torrent_dir / f"{torrent_hash}.torrent"
        if torrent_file.exists():
            return str(torrent_file)

        # Check for .magnet file
        magnet_file = torrent_dir / f"{torrent_hash}.magnet"
        if magnet_file.exists():
            # Store magnet file path for later use in add_torrent
            self._current_magnet_file = str(magnet_file)
            self._current_magnet_hash = torrent_hash
            return "MAGNET_FILE"

        raise FileNotFoundError(
            f"Neither torrent nor magnet file found for hash {torrent_hash}\n"
            f"  Make sure torrent_dir is correctly configured: {torrent_dir}"
        )

    def add_torrent(
        self,
        torrent_file: str,
        download_dir: str,
        paused: bool = True,
        labels: Optional[List[str]] = None
    ) -> bool:
        """Add torrent to Transmission with metadata preservation."""
        if not self.connected:
            raise RuntimeError("Not connected to Transmission. Call connect() first.")

        try:
            with open(torrent_file, 'rb') as f:
                torrent_data = f.read()

            # Add torrent using base64-encoded data
            torrent_b64 = base64.b64encode(torrent_data).decode('utf-8')

            added_torrent = self.client.add_torrent(
                torrent=torrent_b64,
                download_dir=download_dir,
                paused=paused
            )

            # Add labels if supported (Transmission 3.0+)
            if labels and hasattr(added_torrent, 'labels'):
                try:
                    added_torrent.labels = labels
                except Exception as e:
                    print(f"  ⚠ Warning: Could not set labels: {e}")

            return True
        except Exception as e:
            print(f"✗ Error adding torrent from {torrent_file}: {e}")
            return False

    def pause_torrent(self, torrent_id: int) -> bool:
        """Pause a torrent."""
        if not self.connected:
            raise RuntimeError("Not connected to Transmission. Call connect() first.")

        try:
            self.client.stop_torrent(torrent_id)
            return True
        except Exception as e:
            print(f"✗ Error pausing torrent {torrent_id}: {e}")
            return False


# ============================================================================
# Bidirectional Migrator
# ============================================================================

class Migrator:
    """Orchestrates bidirectional torrent migration between Transmission and qBittorrent."""

    def __init__(
        self,
        qb_handler: QBittorrentHandler,
        tr_handler: TransmissionHandler,
        temp_dir: str,
        migration_config: Dict[str, Any]
    ):
        self.qb_handler = qb_handler
        self.tr_handler = tr_handler
        self.temp_dir = Path(temp_dir)
        self.migration_config = migration_config
        self.temp_dir.mkdir(exist_ok=True)

    def migrate_transmission_to_qbittorrent(self, dry_run: bool = False) -> Dict[str, Any]:
        """Migrate torrents from Transmission to qBittorrent."""
        print("\n=== Migrating Transmission → qBittorrent ===\n")

        print("Fetching torrents from Transmission...")
        tr_torrents = self.tr_handler.get_torrents()
        print(f"Found {len(tr_torrents)} torrents in Transmission\n")

        if dry_run:
            print("DRY RUN MODE - No changes will be made\n")

        results = {'success': [], 'failed': [], 'skipped': [], 'total': len(tr_torrents)}

        # Get existing qBittorrent torrents to avoid duplicates
        qb_torrents = self.qb_handler.get_torrents()
        qb_hashes = {t.hash for t in qb_torrents}

        for idx, torrent in enumerate(tr_torrents, 1):
            print_progress(idx, len(tr_torrents), torrent.name)

            try:
                # Skip if already exists in qBittorrent
                if torrent.hashString in qb_hashes:
                    print(f"  ⊘ Already exists in qBittorrent, skipping")
                    results['skipped'].append({
                        'name': torrent.name,
                        'hash': torrent.hashString,
                        'reason': 'Already exists'
                    })
                    continue

                # Pause in Transmission
                if not dry_run and self.migration_config.get('pause_source', True):
                    self.tr_handler.pause_torrent(torrent.id)
                    print(f"  ⏸ Paused in Transmission")

                # Get .torrent file path
                try:
                    torrent_file = self.tr_handler.get_torrent_file_path(torrent.hashString, torrent.name)
                except FileNotFoundError as e:
                    print(f"  ✗ Torrent file not found: {e}")
                    results['failed'].append({
                        'name': torrent.name,
                        'hash': torrent.hashString,
                        'error': str(e)
                    })
                    continue

                # Determine if torrent is complete
                is_complete = torrent.percent_done >= 1.0

                # Map metadata
                metadata = self._map_transmission_metadata(torrent)

                print(f"  📁 Path: {metadata['save_path']}")
                print(f"  📊 Complete: {is_complete} ({torrent.percent_done * 100:.1f}%)")
                if metadata['tags']:
                    print(f"  🏷  Tags: {', '.join(metadata['tags'])}")

                # Add to qBittorrent
                if not dry_run:
                    success = self.qb_handler.add_torrent(
                        torrent_file=torrent_file,
                        save_path=metadata['save_path'],
                        is_complete=is_complete and self.migration_config.get('skip_checking_complete', True),
                        tags=metadata['tags'],
                        category=metadata.get('category'),
                        is_paused=True
                    )

                    if success:
                        print(f"  ✓ Added to qBittorrent")
                        results['success'].append({
                            'name': torrent.name,
                            'hash': torrent.hashString,
                            'path': metadata['save_path'],
                            'complete': is_complete
                        })
                        time.sleep(self.migration_config.get('rate_limit_sleep', 0.5))
                    else:
                        results['failed'].append({
                            'name': torrent.name,
                            'hash': torrent.hashString,
                            'error': 'Failed to add to qBittorrent'
                        })
                else:
                    print(f"  ✓ Would be added to qBittorrent")
                    results['success'].append({
                        'name': torrent.name,
                        'hash': torrent.hashString,
                        'path': metadata['save_path'],
                        'complete': is_complete
                    })

            except Exception as e:
                print(f"  ✗ Error: {e}")
                results['failed'].append({
                    'name': torrent.name,
                    'hash': torrent.hashString,
                    'error': str(e)
                })

            print()

        return results

    def migrate_qbittorrent_to_transmission(self, dry_run: bool = False) -> Dict[str, Any]:
        """Migrate torrents from qBittorrent to Transmission."""
        print("\n=== Migrating qBittorrent → Transmission ===\n")

        print("Fetching torrents from qBittorrent...")
        qb_torrents = self.qb_handler.get_torrents()
        print(f"Found {len(qb_torrents)} torrents in qBittorrent\n")

        if dry_run:
            print("DRY RUN MODE - No changes will be made\n")

        results = {'success': [], 'failed': [], 'skipped': [], 'total': len(qb_torrents)}

        # Get existing Transmission torrents to avoid duplicates
        tr_torrents = self.tr_handler.get_torrents()
        tr_hashes = {t.hashString for t in tr_torrents}

        for idx, torrent in enumerate(qb_torrents, 1):
            print_progress(idx, len(qb_torrents), torrent.name)

            try:
                # Skip if already exists in Transmission
                if torrent.hash in tr_hashes:
                    print(f"  ⊘ Already exists in Transmission, skipping")
                    results['skipped'].append({
                        'name': torrent.name,
                        'hash': torrent.hash,
                        'reason': 'Already exists'
                    })
                    continue

                # Pause in qBittorrent
                if not dry_run and self.migration_config.get('pause_source', True):
                    self.qb_handler.pause_torrent(torrent.hash)
                    print(f"  ⏸ Paused in qBittorrent")

                # Export .torrent file from qBittorrent
                if not dry_run:
                    torrent_file = self.qb_handler.export_torrent(torrent.hash, str(self.temp_dir))
                else:
                    torrent_file = f"{self.temp_dir}/{torrent.hash}.torrent"

                # Map metadata
                metadata = self._map_qbittorrent_metadata(torrent)
                is_complete = torrent.progress >= 1.0

                print(f"  📁 Path: {metadata['download_dir']}")
                print(f"  📊 Complete: {is_complete} ({torrent.progress * 100:.1f}%)")
                if metadata['labels']:
                    print(f"  🏷  Labels: {', '.join(metadata['labels'])}")

                # Add to Transmission
                if not dry_run:
                    success = self.tr_handler.add_torrent(
                        torrent_file=torrent_file,
                        download_dir=metadata['download_dir'],
                        paused=True,
                        labels=metadata['labels']
                    )

                    if success:
                        print(f"  ✓ Added to Transmission")
                        results['success'].append({
                            'name': torrent.name,
                            'hash': torrent.hash,
                            'path': metadata['download_dir'],
                            'complete': is_complete
                        })
                        time.sleep(self.migration_config.get('rate_limit_sleep', 0.5))
                    else:
                        results['failed'].append({
                            'name': torrent.name,
                            'hash': torrent.hash,
                            'error': 'Failed to add to Transmission'
                        })
                else:
                    print(f"  ✓ Would be added to Transmission")
                    results['success'].append({
                        'name': torrent.name,
                        'hash': torrent.hash,
                        'path': metadata['download_dir'],
                        'complete': is_complete
                    })

            except Exception as e:
                print(f"  ✗ Error: {e}")
                results['failed'].append({
                    'name': torrent.name,
                    'hash': torrent.hash,
                    'error': str(e)
                })

            print()

        return results

    def _map_transmission_metadata(self, torrent: Any) -> Dict[str, Any]:
        """Map Transmission torrent metadata to qBittorrent format."""
        metadata = {
            'save_path': torrent.download_dir,
            'tags': [],
            'category': None
        }

        # Convert labels to tags
        if hasattr(torrent, 'labels') and torrent.labels:
            metadata['tags'] = list(torrent.labels)

        return metadata

    def _map_qbittorrent_metadata(self, torrent: Any) -> Dict[str, Any]:
        """Map qBittorrent torrent metadata to Transmission format."""
        metadata = {
            'download_dir': torrent.save_path,
            'labels': []
        }

        # Convert tags to labels
        if hasattr(torrent, 'tags') and torrent.tags:
            metadata['labels'] = list(torrent.tags.split(',')) if isinstance(torrent.tags, str) else list(torrent.tags)

        return metadata

    def generate_report(self, results: Dict[str, Any], direction: str) -> str:
        """Generate migration summary report."""
        direction_name = "Transmission → qBittorrent" if direction == "tr2qb" else "qBittorrent → Transmission"

        report = f"\n{'='*60}\n"
        report += f"Migration Report: {direction_name}\n"
        report += f"{'='*60}\n\n"

        report += f"Total torrents: {results['total']}\n"
        report += f"✓ Successfully migrated: {len(results['success'])}\n"
        report += f"⊘ Skipped (already exist): {len(results['skipped'])}\n"
        report += f"✗ Failed: {len(results['failed'])}\n\n"

        if results['failed']:
            report += "Failed torrents:\n"
            for item in results['failed']:
                report += f"  - {item['name']} ({item['hash']})\n"
                report += f"    Error: {item['error']}\n"
            report += "\n"

        if results['success']:
            report += f"Migration completed successfully for {len(results['success'])} torrents.\n"
        else:
            report += "No torrents were migrated.\n"

        report += f"{'='*60}\n"

        return report


# ============================================================================
# Main CLI
# ============================================================================

def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Sync/migrate torrents between Transmission and qBittorrent",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Dry run to preview sync
  %(prog)s -d tr2qb -n

  # One-time migration: Transmission → qBittorrent
  %(prog)s -d tr2qb

  # Sync new torrents back: qBittorrent → Transmission
  %(prog)s -d qb2tr

  # Bidirectional sync (keeps both clients identical)
  %(prog)s -d tr2qb && %(prog)s -d qb2tr

  # Use custom config file
  %(prog)s -c /path/to/config.json -d tr2qb
        """
    )

    parser.add_argument('-c', '--config', default='config.json', help='Path to configuration file (default: config.json)')
    parser.add_argument('-d', '--direction', choices=['tr2qb', 'qb2tr'], required=True, help='Sync direction')
    parser.add_argument('-n', '--dry-run', action='store_true', help='Preview sync without making changes')
    parser.add_argument('-v', '--verbose', action='store_true', help='Enable verbose output')
    parser.add_argument('-t', '--temp-dir', default='.migration-state', help='Temporary directory for .torrent files')

    args = parser.parse_args()

    # Print header
    print("=" * 60)
    print("Bidirectional Torrent Sync Tool")
    print("=" * 60)
    print()

    # Load configuration
    print(f"Loading configuration from {args.config}...")
    try:
        config = load_config(args.config)
        print("✓ Configuration loaded successfully")
    except SystemExit:
        return 1

    # Create temporary directory
    print(f"\nCreating temporary directory: {args.temp_dir}")
    temp_dir = create_temp_dir(args.temp_dir)
    print(f"✓ Temporary directory ready: {temp_dir}")

    # Initialize handlers
    print("\n" + "=" * 60)
    print("Connecting to Torrent Clients")
    print("=" * 60)
    print()

    qb_handler = QBittorrentHandler(config['qbittorrent'])
    tr_handler = TransmissionHandler(config['transmission'])

    # Test connections
    print("Testing qBittorrent connection...")
    if not qb_handler.connect():
        print("\n✗ Failed to connect to qBittorrent")
        return 1

    print("\nTesting Transmission connection...")
    if not tr_handler.connect():
        print("\n✗ Failed to connect to Transmission")
        return 1

    print("\n✓ Both clients connected successfully")

    # Initialize migrator
    migrator = Migrator(
        qb_handler=qb_handler,
        tr_handler=tr_handler,
        temp_dir=temp_dir,
        migration_config=config['migration']
    )

    # Execute migration
    print("\n" + "=" * 60)
    if args.dry_run:
        print("DRY RUN MODE - Preview Only")
    else:
        print("Migration Starting")
    print("=" * 60)

    try:
        if args.direction == 'tr2qb':
            results = migrator.migrate_transmission_to_qbittorrent(dry_run=args.dry_run)
        else:
            results = migrator.migrate_qbittorrent_to_transmission(dry_run=args.dry_run)

        # Generate and print report
        report = migrator.generate_report(results, args.direction)
        print(report)

        # Exit with appropriate code
        if results['failed']:
            print("⚠ Migration completed with errors")
            return 1
        elif results['success']:
            print("✓ Migration completed successfully")
            return 0
        else:
            print("⊘ No torrents were migrated")
            return 0

    except KeyboardInterrupt:
        print("\n\n✗ Migration interrupted by user")
        return 1
    except Exception as e:
        print(f"\n\n✗ Unexpected error during migration: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())
