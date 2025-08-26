This is the PRD for the entire project, end-to-end. It will be split into
multiple tasks starting with architecture.

# 📄 Product Requirements Document (PRD)
**Project Name:** Local Torrent + Plex Media Hub
**Version:** Draft 1

---

## 1. Overview
A self-hosted application that allows a user to:
- Search public torrent indexers from a mobile-friendly web UI.
- Add selected torrents to a VPN-protected torrent client container.
- Monitor download progress and manage (pause/resume/delete/re-download).
- Store downloaded media in a directory structured for Plex compatibility.
- Expose Plex to the local network for playback on smart TVs and devices.

**Key Principles:**
- **LAN-only** access (no remote login/authentication initially).
- **Public torrent indexers only** (private tracker support not in scope for v1).
- **Docker-based isolation** for VPN-protected torrent client.
- **Separation of concerns:** Search/UI container, Torrent Client container, Plex container.
- **Mobile-first UI design** for easy control from phones/tablets.

---

## 2. System Architecture
**Core components:**

1. **Indexer/Search Layer**
   - Use **Jackett or Prowlarr** instead of torrtux.
   - Aggregates multiple public indexers into a single API.
   - Provides unified search API → UI consumes this.

2. **UI/Web App**
   - Mobile-friendly responsive UI.
   - Search via Jackett/Prowlarr API.
   - List torrent results → click to add.
   - Show **current downloads** (via qBittorrent API).
   - Show **completed history** (downloads directory).
   - Allow **delete, pause/resume, re-download**.
   - **Settings page:** max concurrent downloads, speed limits, etc.
   - Store torrent `.torrent` files in a persistent directory (`/torrents`).

3. **Torrent Client (VPN Isolated)**
   - qBittorrent (via `binhex/arch-qbittorrentvpn` Docker image).
   - Runs behind PIA VPN (credentials in `.env`).
   - API exposed to UI container.
   - Stores active downloads in `/downloads/incomplete`, finished in `/downloads/complete`.
   - `.torrent` files saved in `/torrents`.
   - `unless-stopped` restart policy for resilience.

4. **Media Server**
   - Plex container reads `/downloads/complete`.
   - Auto-updates library when new files appear.
   - Requires files named/organized for Plex compatibility.
   - Optional: add **Sonarr/Radarr** later for auto-sorting into Plex folder structures.

---

## 3. User Stories
1. **Search & Add**
   - As a user, I can search for torrents from multiple public indexers.
   - As a user, I can click a result to add it to the torrent client.

2. **Monitor & Control**
   - As a user, I can see progress of current downloads.
   - As a user, I can pause/resume/delete downloads.
   - As a user, I can see previously completed downloads in history.

3. **Redownload**
   - As a user, I can re-add a torrent from my stored `.torrent` files.

4. **Settings**
   - As a user, I can configure max concurrent downloads.
   - As a user, I can set bandwidth limits.

5. **Media Integration**
   - As a user, I can open Plex and immediately see/play completed downloads.
   - Files should be automatically arranged in a Plex-friendly structure.

6. **Mobile Accessibility**
   - As a user, I can manage searches, downloads, and Plex integration from my phone or tablet with an intuitive, responsive interface.

---

## 4. Functional Requirements
- Torrent search via Jackett/Prowlarr API.
- Torrent management via qBittorrent API.
- Mobile-first, responsive UI.
- Persistent volumes for:
  - `/downloads` (shared with Plex).
  - `/torrents` (store .torrent files).
  - `/config` (qBittorrent settings).
- Web UI (React/Next.js or Flask/Django) for search, history, progress, settings.
- VPN credentials in `.env` file.
- Docker Compose orchestrates entire stack.

---

## 5. Non-Functional Requirements
- Local network only, no external exposure.
- Docker containers restart unless stopped.
- Resumable downloads on restart.
- Plex integration tested with Movies/TV shows.
- Support for multiple concurrent downloads.
- Responsive design, optimized for mobile browsers (Safari, Chrome, Firefox).

---

## 6. Out of Scope (v1)
- Private tracker support.
- Remote (outside LAN) access.
- Automated renaming/moving (could add Sonarr/Radarr later).
- User authentication.

---

## 7. Open Questions
1. For Plex naming/organization — do we want to **add Sonarr/Radarr right away**, or is dumping into `/downloads/complete` enough for v1?
2. Should the UI support **category/tagging of torrents** (e.g., Movies vs TV vs Music), or keep it flat for MVP?
3. Do you want the **UI to be custom-built from scratch**, or leverage something like **Flood (web UI for qBittorrent)** and extend it with search integration?
