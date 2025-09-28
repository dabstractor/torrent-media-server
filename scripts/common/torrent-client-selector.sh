#!/bin/bash
# Torrent Client Selector - Shared utility for dynamic client selection
# Used by service entrypoint scripts to determine active torrent client configuration

torrent_client_selector() {
    # Default to qbittorrent if not specified
    export TORRENT_CLIENT="${TORRENT_CLIENT:-qbittorrent}"

    echo "[SELECTOR] Selected torrent client: $TORRENT_CLIENT"

    case "$TORRENT_CLIENT" in
        "transmission")
            export TORRENT_CLIENT_NAME="Transmission"
            export TORRENT_CLIENT_IMPLEMENTATION="Transmission"
            export TORRENT_CLIENT_PORT="${TRANSMISSION_RPC_PORT:-9091}"
            export TORRENT_CLIENT_INTERNAL_PORT="9091"
            export TORRENT_CLIENT_SQL_SUFFIX="transmission"
            export TORRENT_CLIENT_CONTRACT="TransmissionSettings"
            echo "[SELECTOR] Configured for Transmission (port: $TORRENT_CLIENT_PORT)"
            ;;
        "qbittorrent"|*)
            export TORRENT_CLIENT_NAME="qBittorrent"
            export TORRENT_CLIENT_IMPLEMENTATION="QBittorrent"
            export TORRENT_CLIENT_PORT="${QBITTORRENT_PORT:-8080}"
            export TORRENT_CLIENT_INTERNAL_PORT="8080"
            export TORRENT_CLIENT_SQL_SUFFIX="qbittorrent"
            export TORRENT_CLIENT_CONTRACT="QBittorrentSettings"
            echo "[SELECTOR] Configured for qBittorrent (port: $TORRENT_CLIENT_PORT)"
            ;;
    esac

    # Export common variables for nginx proxy configuration
    export TORRENT_CLIENT_HOST="nginx-proxy"

    # Export service detection variables for conditional Docker Compose loading
    if [ "$TORRENT_CLIENT" = "transmission" ]; then
        export TRANSMISSION_ENABLED="true"
        export QBITTORRENT_ENABLED="false"
    else
        export TRANSMISSION_ENABLED="false"
        export QBITTORRENT_ENABLED="true"
    fi

    echo "[SELECTOR] Variables exported:"
    echo "  - TORRENT_CLIENT_NAME: $TORRENT_CLIENT_NAME"
    echo "  - TORRENT_CLIENT_IMPLEMENTATION: $TORRENT_CLIENT_IMPLEMENTATION"
    echo "  - TORRENT_CLIENT_PORT: $TORRENT_CLIENT_PORT"
    echo "  - TORRENT_CLIENT_SQL_SUFFIX: $TORRENT_CLIENT_SQL_SUFFIX"
    echo "  - TRANSMISSION_ENABLED: $TRANSMISSION_ENABLED"
    echo "  - QBITTORRENT_ENABLED: $QBITTORRENT_ENABLED"
}

# Allow sourcing this script to use the function
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    # Script is being executed directly
    torrent_client_selector
fi