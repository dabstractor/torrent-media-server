# PRD 21: Autoscan Integration

**Title:** Add Autoscan to existing Jellyfin + Plex + Arr stack

---

## 1. Objective
Ensure that new media downloaded by Radarr or Sonarr appears immediately in both Jellyfin and Plex without requiring full-library scans.

---

## 2. Scope

### In-Scope
- Deploy Autoscan as a service.
- Configure Radarr and Sonarr to send webhooks to Autoscan on completed imports.
- Configure Autoscan to trigger targeted library updates in both Jellyfin and Plex.

### Out of Scope
- Media playback clients.
- Media download or Arr configuration beyond webhook setup.

---

## 3. Requirements
- Autoscan must accept webhook events from Radarr and Sonarr.
- Autoscan must update only the paths containing new content.
- Autoscan must trigger library refreshes in both Jellyfin and Plex automatically.

---

## 4. Success Criteria
- New content imported by Radarr/Sonarr is immediately visible in Jellyfin.
- New content imported by Radarr/Sonarr is immediately visible in Plex.
- No manual library scans are required.
