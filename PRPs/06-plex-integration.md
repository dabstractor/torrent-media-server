## Goal

**Feature Goal**: To seamlessly integrate the torrent management UI with Plex Media Server, enabling users to monitor Plex status, automatically update libraries upon download completion, and easily navigate between the two systems.

**Deliverable**: A robust `PlexService` class that handles all interactions with the Plex API, a `PlexIntegrationManager` to orchestrate workflows like automatic library refreshes, and corresponding UI components to display Plex status and provide user controls.

**Success Definition**: The system can successfully connect to a Plex server, display its status, automatically trigger a library scan when a download completes, and provide a direct link to the new media in the Plex web interface.

## Why

- **Streamlined Workflow**: This integration eliminates the manual steps users currently take to move downloaded content into Plex and trigger library scans, saving time and effort.
- **Enhanced User Experience**: By providing direct feedback on Plex status and media availability within the torrent UI, it creates a more cohesive and user-friendly media management ecosystem.
- **Increased Automation**: Automating the download-to-Plex pipeline reduces the potential for human error in file organization and ensures media becomes available for viewing as quickly as possible.

## What

The integration will introduce a new `PlexService` responsible for all communication with the Plex Media Server API. This service will handle authentication using the `X-Plex-Token` and provide methods for querying server status, listing libraries, and initiating library scans.

A `PlexIntegrationManager` will orchestrate the workflow, listening for download completion events. Upon a successful download, it will trigger a selective library refresh via the `PlexService`.

The user interface will be enhanced with:
- A **Plex Status Dashboard** component displaying real-time server information (e.g., online status, version) and recently added media.
- A **"View in Plex"** link on completed download items, which will navigate the user directly to the corresponding media item in the Plex web application.

### Success Criteria

- [ ] The `PlexService` can successfully authenticate with a Plex server using a user-provided token.
- [ ] The UI's Plex Status dashboard accurately reflects the server's online/offline status.
- [ ] A download completing in the torrent client automatically triggers a Plex library scan for the correct media type (movies/shows).
- [ ] The "View in Plex" link on a completed download opens the correct media item in the Plex web app.
- [ ] The system gracefully handles connection errors when the Plex server is unavailable and displays an appropriate "offline" status in the UI.


## All Needed Context

### Context Completeness Check

_Before writing this PRP, validate: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"_

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://python-plexapi.readthedocs.io/en/latest/modules/myplex.html
  why: Explains how to authenticate with the Plex API using tokens or username/password.
  critical: The `X-Plex-Token` is required for almost all API calls.

- url: https://python-plexapi.readthedocs.io/en/latest/modules/library.html
  why: Details how to interact with Plex libraries, including listing sections and triggering scans.
  critical: Use `library.section('Movies').update()` to refresh a specific library.

- url: https://python-plexapi.readthedocs.io/en/latest/modules/media.html
  why: Provides information on how to retrieve and handle media metadata.
  critical: The `media.key` attribute can be used to generate direct links to media items.

- file: docker-compose.yml
  why: To understand how the Plex service is configured and networked.
  pattern: The Plex container uses `network_mode: host`.
  gotcha: The web-ui service communicates with plex via `http://plex:32400`
```

### Current Codebase tree (run `tree` in the root of the project) to get an overview of the codebase

```bash
# See `ls -R` output from earlier in the conversation.
```

### Desired Codebase tree with files to be added and responsibility of file

```bash
src/
├── app/
│   └── api/
│       └── plex/
│           ├── route.ts
│           └── status/
│               └── route.ts
├── components/
│   └── plex/
│       ├── PlexStatusDashboard.tsx
│       └── ViewInPlexButton.tsx
├── lib/
│   ├── api/
│   │   └── plex.ts
│   ├── services/
│   │   └── PlexService.ts
│   └── managers/
│       └── PlexIntegrationManager.ts
└── hooks/
    └── usePlex.ts
```

### Known Gotchas of our codebase & Library Quirks

```typescript
// CRITICAL: All interactions with the Plex API must be done through the `PlexService` to ensure consistent error handling and authentication.
// GOTCHA: The `X-Plex-Token` must be stored securely and not exposed on the client-side.
// PATTERN: Follow the existing service pattern in `src/lib/api` for creating new API clients.
```

## Implementation Blueprint

### Data models and structure

```typescript
// src/lib/types/plex.ts

export interface PlexServerInfo {
  name: string;
  version: string;
  platform: string;
  platformVersion: string;
  updatedAt: Date;
  machineIdentifier: string;
}

export interface PlexLibrary {
  id: string;
  title: string;
  type: 'movie' | 'show' | 'music' | 'photo';
  locations: string[];
  updatedAt: Date;
  scannedAt: Date;
}

export interface PlexMediaItem {
  id: string;
  title: string;
  type: 'movie' | 'episode' | 'season' | 'show' | 'track' | 'album';
  year?: number;
  rating?: number;
  summary?: string;
  poster?: string;
  addedAt: Date;
  duration?: number;
  viewCount: number;
  lastViewedAt?: Date;
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/lib/types/plex.ts
  - IMPLEMENT: PlexServerInfo, PlexLibrary, PlexMediaItem interfaces
  - FOLLOW pattern: Existing type definitions in `src/lib/types`
  - NAMING: PascalCase for interfaces, camelCase for properties

Task 2: CREATE src/lib/services/PlexService.ts
  - IMPLEMENT: `PlexService` class with methods for authentication, getting server info, listing libraries, and refreshing libraries.
  - FOLLOW pattern: `src/lib/api/files.ts` for structuring API calls.
  - NAMING: `PlexService` class, async methods like `getServerInfo()`, `getLibraries()`, `refreshLibrary()`.
  - DEPENDENCIES: Import types from `src/lib/types/plex.ts`.

Task 3: CREATE src/lib/managers/PlexIntegrationManager.ts
  - IMPLEMENT: `PlexIntegrationManager` class with a method `onDownloadComplete()` that takes a completed download, determines the correct Plex library, and triggers a refresh using the `PlexService`.
  - FOLLOW pattern: `src/hooks/use-file-history.ts` for examples of how to interact with the file history.
  - NAMING: `PlexIntegrationManager` class, `onDownloadComplete` method.
  - DEPENDENCIES: `PlexService`

Task 4: CREATE src/app/api/plex/status/route.ts
  - IMPLEMENT: An API route that uses the `PlexService` to get the server status and returns it to the client.
  - FOLLOW pattern: `src/app/api/files/stats/route.ts` for creating API routes.

Task 5: CREATE src/components/plex/PlexStatusDashboard.tsx
  - IMPLEMENT: A React component that fetches and displays the Plex server status from the `/api/plex/status` route.
  - FOLLOW pattern: `src/components/files/FileHistoryDashboard.tsx` for creating dashboard components.

Task 6: CREATE src/components/plex/ViewInPlexButton.tsx
  - IMPLEMENT: A React component that takes a media item and generates a direct link to it in the Plex web app.
  - FOLLOW pattern: Use the `media.key` from the `PlexMediaItem` to construct the URL.
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file creation - fix before proceeding
ruff check src/lib/services/PlexService.ts src/lib/managers/PlexIntegrationManager.ts --fix
mypy src/lib/services/PlexService.ts src/lib/managers/PlexIntegrationManager.ts
ruff format src/lib/services/PlexService.ts src/lib/managers/PlexIntegrationManager.ts
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test each component as it's created
uv run pytest src/lib/services/tests/test_PlexService.py -v
uv run pytest src/lib/managers/tests/test_PlexIntegrationManager.py -v
```

### Level 3: Integration Testing (System Validation)

```bash
# Health check validation
curl -f http://localhost:3000/api/plex/status || echo "Plex status endpoint failed"

# Manual test of the integration
# 1. Add a torrent and wait for it to complete
# 2. Verify that a Plex library scan is triggered
# 3. Verify that the "View in Plex" link appears and works correctly
```

## Final Validation Checklist

### Technical Validation

- [ ] All 3 validation levels completed successfully
- [ ] All tests pass: `uv run pytest src/ -v`
- [ ] No linting errors: `uv run ruff check src/`
- [ ] No type errors: `uv run mypy src/`
- [ ] No formatting issues: `uv run ruff format src/ --check`

### Feature Validation

- [ ] All success criteria from "What" section met
- [ ] Manual testing successful: Plex status is displayed, library scans are triggered, and deep links work.
- [ ] Error cases handled gracefully with proper error messages when the Plex server is unavailable.
- [ ] Integration points work as specified.

### Code Quality Validation

- [ ] Follows existing codebase patterns and naming conventions.
- [ ] File placement matches desired codebase tree structure.
- [ ] Dependencies properly managed and imported.
- [ ] Configuration changes properly integrated.
