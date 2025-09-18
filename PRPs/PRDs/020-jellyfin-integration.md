# PRD: Jellyfin Media Server with Cloudflare Tunnel

## 1. Overview
This feature adds a **Jellyfin media server** to the existing media stack, accessible both locally and remotely.
Remote access is handled by a **Cloudflare Tunnel**, which provides a persistent, secure, and free `*.cfargotunnel.com` hostname. This approach removes the need for static IPs, port forwarding, DDNS, or a user-owned domain.

***

## 2. Goals
- Provide a free and secure remote streaming option alongside Plex.
- Reuse the existing `./data/media/` directories managed by Radarr and Sonarr.
- Make setup work seamlessly with the current docker-compose workflow after a one-time authorization step.
- Expose Jellyfin at a **permanent, auto-generated HTTPS endpoint** provided by Cloudflare.
- **Display the generated URL** in the stack's main web UI for easy user access.

***

## 3. Non-Goals
- Syncing metadata/play history between Jellyfin and Plex.
- Advanced reverse proxy configurations beyond the tunnel.
- Management of custom domains; the tunnel will use its auto-generated hostname.

***

## 4. Functional Requirements
- **Jellyfin Service**
  - Runs in Docker alongside existing services.
  - Uses a configurable internal port (default: `8096`).
  - Mounts existing media volumes for movies and TV shows.

- **Cloudflare Tunnel Service**
  - Runs in Docker using the official `cloudflare/cloudflared` image.
  - Establishes a persistent tunnel from a unique, generated Cloudflare hostname to the internal Jellyfin service.
  - Provides end-to-end HTTPS encryption without manual certificate management.

- **Configuration & Onboarding**
  - The user performs a **one-time setup** via Docker commands to log in and create a persistent tunnel identity.
  - Cloudflare credentials (`cert.pem` and a `UUID.json` file) are stored in `./config/cloudflared` and mounted as a volume for persistence.
  - A `config.yml` file defines the tunnel's routing rules, pointing to the Jellyfin container.
  - The generated tunnel URL **must be written to a persistent file** (e.g., `./data/shared/tunnel-url.txt`) so it can be read by a web UI or other services.

***

## 5. Security Requirements
- Remote access must use HTTPS (provided automatically by Cloudflare).
- Jellyfin admin credentials must be created by the user on first launch.
- No container ports are exposed directly to the host or the public internet; all traffic is proxied through the tunnel.

***

## 6. User Stories
- **As a user**, I want to easily find my Jellyfin URL by looking at my server's dashboard, without needing to check container logs.
- **As a developer**, I want Jellyfin and its tunnel to spin up automatically with `docker-compose up` after the initial setup.
- **As a sysadmin**, I want a robust remote access solution that doesn't require ongoing maintenance or manual reconfiguration.

***

## 7. Technical Approach
The implementation requires a one-time manual setup followed by an automated `docker-compose` workflow that uses a wrapper script to persist the generated URL.

### 7.1. One-Time Setup
The user must generate persistent tunnel credentials once.
1.  **Login:** Authorize `cloudflared` with a Cloudflare account.
    ```bash
    docker run --rm -it -v ./config/cloudflared:/home/nonroot/.cloudflared cloudflare/cloudflared tunnel login
    ```
2.  **Create Tunnel:** Create a named, persistent tunnel. This generates the credential file.
    ```bash
    docker run --rm -it -v ./config/cloudflared:/home/nonroot/.cloudflared cloudflare/cloudflared tunnel create jellyfin-tunnel
    ```
3.  **Configure:** A `config.yml` is created in `./config/cloudflared/` pointing to the credential file and the Jellyfin service. The hostname is set to `*` to receive the auto-generated URL.

### 7.2. URL Persistence Script
A wrapper script, `start-tunnel.sh`, will be used to launch the tunnel, extract its public URL, and save it to a shared file.

`./scripts/start-tunnel.sh`:
```bash
#!/bin/sh
set -e

URL_FILE="/shared-data/tunnel-url.txt"
LOG_FILE="/tmp/cloudflared.log"

# Ensure the shared directory exists
mkdir -p "$(dirname "$URL_FILE")"

# Start the tunnel in the background, piping its output to a log file
cloudflared tunnel --config /home/nonroot/.cloudflared/config.yml run > "$LOG_FILE" 2>&1 &

echo "Waiting for Cloudflare Tunnel to generate URL..."
URL=""
# Poll the log file until the URL is found
while [ -z "$URL" ]; do
    sleep 1
    URL=$(grep -o 'https://[a-zA-Z0-9-]\+\.cfargotunnel\.com' "$LOG_FILE" || true)
done

# Write the found URL to the shared file
echo "Tunnel URL found: $URL"
echo "$URL" > "$URL_FILE"

# Tail the log file to keep the container running and provide logs
tail -f "$LOG_FILE"
